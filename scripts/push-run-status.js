/* 회귀 진행 상황을 사이트(/api/run-status)로 올린다 (v0.9.258)
 *
 *   node scripts/push-run-status.js <러너출력파일> <로그디렉터리> [--watch]
 *
 * 회귀는 작업자 컴퓨터에서 돈다. 관리자 대시보드가 그 진행을 보려면 누군가 올려 줘야 하고, 그게 이 스크립트다.
 * ⚠️ 토큰은 리포에 두지 않는다 — `~/.config/knj/run-token` 에서 읽는다(권한 600).
 * ⚠️ 올리는 건 **검사 이름과 숫자, 실패한 케이스의 한 줄 요약**뿐이다. 소스도 로그 전문도 보내지 않는다.
 * ⚠️ 실패해도 회귀 자체를 방해하지 않는다(조용히 넘어간다).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2];
const RUNS = process.argv[3];
const WATCH = process.argv.includes('--watch');
const ENDPOINT = process.env.RUN_STATUS_URL || 'https://scoutingapp.net/api/run-status';
const TOKEN_FILE = path.join(os.homedir(), '.config/knj/run-token');
const TOTAL_ROUNDS = 3;

function token() {
  try { return fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch { return ''; }
}

/* 러너 출력에서 진행을, 각 로그에서 실패 상세를 뽑는다. */
function collect() {
  let out = '';
  try { out = fs.readFileSync(OUT, 'utf8'); } catch {}
  const lines = out.split('\n').filter((l) => /^R\d\s/.test(l));
  const items = lines.map((l) => {
    const m = l.match(/^R(\d)\s+(ok|FAIL\(\d+\))\s+(\S+)\s*(.*)$/);
    if (!m) return null;
    const nums = (m[4] || '').match(/(\d+)\s*\/\s*(\d+)/);
    return { round: +m[1], name: m[3], ok: m[2] === 'ok', pass: nums ? +nums[1] : 0, total: nums ? +nums[2] : 0 };
  }).filter(Boolean);

  const roundsDone = (out.match(/### ROUND \d ALL GREEN/g) || []).length;
  const finished = /3 ROUNDS GREEN/.test(out) || /### ROUND \d FAILED/.test(out);
  const perRound = items.length ? Math.max.apply(null, items.map((x) => x.round)) : 0;

  // 실패 상세 — 로그에서 FAIL 줄을 뽑아 "어디서 · 무엇이 · 왜" 로 만든다
  const failures = [];
  try {
    for (const f of fs.readdirSync(RUNS).filter((x) => /^r\d-.*\.log$/.test(x))) {
      const round = +f[1];
      const body = fs.readFileSync(path.join(RUNS, f), 'utf8');
      for (const line of body.split('\n')) {
        if (!/^ {2}FAIL /.test(line)) continue;
        const t = line.replace(/^ {2}FAIL /, '');
        const i = t.indexOf(' — ');
        failures.push({
          round,
          file: f.replace(/^r\d-/, '').replace(/\.log$/, ''),
          check: (i > 0 ? t.slice(0, i) : t).trim(),
          detail: i > 0 ? t.slice(i + 3).trim() : '',
        });
      }
    }
  } catch {}

  const running = (() => {
    try {
      const ps = require('child_process').execSync("pgrep -fl 'test/regress|test/audit' 2>/dev/null || true").toString();
      const m = ps.match(/(test\/[\w-]+\.js)/);
      return m ? m[1] : '';
    } catch { return ''; }
  })();

  const perRoundTotal = 14;   // 한 라운드에 도는 검사 파일 수(러너와 같이 유지)
  return {
    label: '전체 회귀',
    rounds: roundsDone,
    roundTotal: TOTAL_ROUNDS,
    done: items.length,
    total: perRoundTotal * TOTAL_ROUNDS,
    fails: failures.length,
    checks: items.reduce((s, x) => s + (x.total || 0), 0),
    items: items.slice(-20),   // 최근 20건(서버가 기록으로 20회까지 남긴다)
    failures: failures.slice(-20),
    running: finished ? '' : running,
    startedAt: (() => { try { return fs.statSync(OUT).birthtime.toISOString(); } catch { return ''; } })(),
    finishedAt: finished ? new Date().toISOString() : '',
    ok: finished && failures.length === 0,
  };
}

async function push() {
  const t = token();
  if (!t) { console.error('run-token 이 없습니다: ' + TOKEN_FILE); return false; }
  const body = collect();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error('업로드 실패 ' + res.status); return false; }
    return body;
  } catch (e) { console.error('업로드 오류: ' + e.message); return false; }
}

(async () => {
  if (!WATCH) { const b = await push(); if (b) console.log('올림 — ' + b.done + '/' + b.total + ' · 실패 ' + b.fails); return; }
  for (;;) {
    const b = await push();
    if (b && b.finishedAt) { console.log('완료 업로드 — 실패 ' + b.fails); break; }
    await new Promise((r) => setTimeout(r, 10000));
  }
})();
