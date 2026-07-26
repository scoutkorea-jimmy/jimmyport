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
    { route: '/krjam-fnc', name: '급식편의본부 안내' },
    { route: '/krjam-fnc-book', name: '급식편의본부 자료 원문' },
    { route: '/krjam-jebo', name: '공개 소식 제보' },
    { route: '/krjam-cardnews', name: '카드뉴스 제작기' },
    { route: '/krjam-dcount', name: '디데이' },
  ],
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log('status.json 갱신 — v' + version + ' · ' + commit +
  (data.verification ? ' · 검증 ' + data.verification.rounds.length + '라운드 ' +
    (data.verification.green ? 'green' : '실패 있음') : ' · 검증 기록 없음'));
