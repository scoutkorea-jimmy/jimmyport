/* 회귀 진행 현황을 프로젝트 폴더의 _regress-status.md 에 계속 다시 쓴다 (v0.9.277)
 *
 *   node scripts/watch-regress.js <러너출력파일> <로그디렉터리> [--once]
 *
 * 왜 파일인가 — 회귀는 몇십 분 돈다. 그동안 "진행 상황을 알 수가 없다"(사용자)는 말이 나왔다.
 * 에디터에서 그냥 열어 두면 갱신되는 곳이 하나 있어야 한다. 갱신 시각이 멈춰 있으면 감시가 죽은 것이다.
 * ⚠️ 이 파일은 .gitignore 대상 — 작업자 로컬 상태이지 배포물이 아니다.
 */
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const RUNS = process.argv[3];
const ONCE = process.argv.includes('--once');
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, '_regress-status.md');
const PER_ROUND = 17;   // 한 라운드에 도는 검사 파일 수(runall.sh 와 같이 유지)
const ROUNDS = 3;

const pad = (n) => String(n).padStart(2, '0');
const hhmmss = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());

function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }

function build() {
  const out = read(OUT);
  const lines = out.split('\n').filter((l) => /^R\d\s/.test(l));
  const done = lines.length;
  const fails = lines.filter((l) => /FAIL/.test(l)).length;
  const roundLines = out.split('\n').filter((l) => /^### /.test(l));
  const finished = /3 ROUNDS GREEN/.test(out) || /ROUND \d FAILED/.test(out);

  // 지금 도는 검사 — 프로세스 목록에서 직접 본다("돌고 있다"는 말을 믿게 하려면 근거가 있어야 한다)
  let running = '';
  try {
    const ps = require('child_process').execSync("pgrep -fl 'node test/' 2>/dev/null || true").toString();
    const m = ps.match(/(test\/[\w-]+\.js)/);
    running = m ? m[1] : '';
  } catch {}

  const body = [
    '# 회귀 진행 현황',
    '',
    '**갱신 ' + hhmmss(new Date()) + '** · 10초마다 자동으로 다시 씁니다. 시각이 멈춰 있으면 감시가 죽은 것입니다.',
    '',
    '| 항목 | 값 |',
    '|---|---|',
    '| 진행 | ' + done + ' / ' + (PER_ROUND * ROUNDS) + ' 검사 |',
    '| 실패 | ' + fails + ' 건 |',
    '| 지금 도는 검사 | ' + (finished ? '— (끝남)' : (running || '— (없음)')) + ' |',
    '',
    '## 라운드',
    '```',
    (roundLines.join('\n') || '(아직 한 라운드도 끝나지 않음)'),
    '```',
    '',
    '## 최근 결과 (최신 12건)',
    '```',
    (lines.slice(-12).join('\n') || '(아직 없음)'),
    '```',
    '',
  ];

  if (fails) {
    const detail = [];
    try {
      for (const f of fs.readdirSync(RUNS).filter((x) => /^r\d-.*\.log$/.test(x)).sort()) {
        for (const line of read(path.join(RUNS, f)).split('\n')) {
          if (/^ {2}FAIL /.test(line)) detail.push(f.replace(/\.log$/, '') + ' · ' + line.replace(/^ {2}FAIL /, ''));
        }
      }
    } catch {}
    body.push('## 실패 상세', '```', detail.slice(0, 40).join('\n') || '(로그에서 못 찾음)', '```', '');
  }
  return body.join('\n');
}

function tick() { try { fs.writeFileSync(TARGET, build()); } catch {} }

tick();
if (!ONCE) {
  const t = setInterval(() => {
    tick();
    const out = read(OUT);
    if (/3 ROUNDS GREEN/.test(out) || /ROUND \d FAILED/.test(out)) { tick(); clearInterval(t); }
  }, 10000);
}
