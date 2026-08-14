/* /status 페이지가 읽을 status.json 을 만든다 (v0.9.257)
 *
 * ⚠️ 회귀는 **작업자 노트북에서** 돈다. 웹사이트가 그 진행을 실시간으로 볼 방법은 없다
 *    (사이트에 쓰려면 인증된 쓰기 경로가 필요하고, 그건 비밀키를 하나 더 만드는 일이다).
 *    그래서 이 파일은 **배포 시점의 확정 사실**만 담는다 — 버전 · 커밋 · 배포 시각 · 마지막 회귀 결과.
 *    "지금 돌고 있는" 진행은 작업자 폴더의 _regress-status.md 가 맡는다.
 *
 * 실행: node scripts/gen-status.js [회귀로그디렉터리]
 *   회귀 로그가 있으면 라운드별 결과를 읽어 담고, 없으면 직전 status.json 의 검증 기록을 유지한다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'status.json');
const sh = (c) => { try { return execSync(c, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
const commit = sh('git rev-parse --short HEAD');
const subject = sh('git log -1 --pretty=%s');
const commitAt = sh('git log -1 --date=iso-strict --pretty=%cd');

/* 회귀 로그(runs/rN-*.log)에서 라운드별 결과를 읽는다. 로그가 없으면 직전 기록을 그대로 둔다. */
function readRuns(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /^r\d-.*\.log$/.test(f));
  if (!files.length) return null;
  const rounds = {};
  for (const f of files) {
    const round = f[1];
    const name = f.replace(/^r\d-/, '').replace(/\.log$/, '');
    const body = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = body.match(/결과:\s*(\d+)\/(\d+)/) || body.match(/===\s*(\d+)\/(\d+)\s*PASS\s*===/);
    // 실패는 개수만 세지 말고 '어느 케이스가 왜' 인지까지 담는다 — 대시보드에서 사유를 봐야 한다.
    const failLines = (body.match(/^ {2}FAIL .*$/gm) || []).map((l) => {
      const t = l.replace(/^ {2}FAIL /, '');
      const i = t.indexOf(' — ');
      return { file: name, check: (i > 0 ? t.slice(0, i) : t).trim(), detail: i > 0 ? t.slice(i + 3).trim() : '' };
    });
    (rounds[round] = rounds[round] || []).push({
      name, pass: m ? +m[1] : null, total: m ? +m[2] : null, fails: failLines.length, failures: failLines,
    });
  }
  const list = Object.keys(rounds).sort().map((r) => {
    const items = rounds[r].sort((a, b) => a.name.localeCompare(b.name));
    return {
      round: +r,
      checks: items.reduce((s, x) => s + (x.total || 0), 0),
      fails: items.reduce((s, x) => s + x.fails, 0),
      failures: items.flatMap((x) => (x.failures || []).map((f) => Object.assign({ round: +r }, f))),
      items: items.map((x) => ({ name: x.name, pass: x.pass, total: x.total, fails: x.fails })),
    };
  });
  return list;
}

const runs = readRuns(process.argv[2]);
/* 🔴 **조용한 폴백이 사고를 만든다.** 로그 폴더를 안 넘기면 직전 검증 기록이 그대로 남는데,
   그게 화면(/admin 운영 현황)에는 **이번 배포의 검증 결과처럼** 보인다.
   실제로 v0.9.295~300 내내 2026-08-03 기록(959건 · 이미 삭제된 급식본부 스위트 포함)이
   그대로 실려 나갔다. 이제 폴백할 때마다 크게 알린다.
   쓰는 법: 회귀 로그를 `<dir>/r1-<스위트>.log`·`r2-<스위트>.log` 로 모아 인자로 넘긴다. */
if (!runs) {
  console.warn('⚠️  회귀 로그 폴더를 받지 못했습니다 — **직전 검증 기록을 그대로 둡니다.**');
  console.warn('    지금 돌린 회귀 결과를 실으려면: node scripts/gen-status.js <로그폴더>');
  console.warn('    (로그 파일명은 r1-<스위트>.log · r2-<스위트>.log 형식이어야 합니다.)');
}
let prev = {};
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}

const data = {
  version,
  commit,
  commitSubject: subject,
  commitAt,
  deployedAt: new Date().toISOString(),
  verification: runs ? {
    at: new Date().toISOString(),
    rounds: runs,
    green: runs.every((r) => r.fails === 0),
    checksPerRound: runs[0] ? runs[0].checks : 0,
  } : (prev.verification || null),
  services: [
    { route: '/', name: '도구 모음' },
    { route: '/tour', name: 'Scout Tour Assistant' },
    { route: '/krjam-planning', name: '홍보부 운영보드' },
    { route: '/krjam-jebo', name: '공개 소식 제보' },
  ],
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log('status.json 갱신 — v' + version + ' · ' + commit +
  (data.verification ? ' · 검증 ' + data.verification.rounds.length + '라운드 ' +
    (data.verification.green ? 'green' : '실패 있음') : ' · 검증 기록 없음'));
