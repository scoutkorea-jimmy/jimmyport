/* / 랜딩 허브 회귀 (v0.9.239)
   확인 대상: 도구 카드가 전부 살아있는가 · 연출이 레이아웃/클릭을 망치지 않는가 ·
   이동 시 로딩 표시가 뜨는가 · 모션 줄이기에서 장식이 꺼지는가 · 콘솔 에러 0.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-landing.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8886;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LINKS = ['/tour', '/krjam-cardnews', '/krjam-planning', '/krjam-dcount', 'https://bpmedia.net/'];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = []; const base = `http://localhost:${PORT}`;

  console.log('\n[PC 1440]');
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(1100);

  chk('도구 카드 5개', await p.evaluate(() => document.querySelectorAll('.card').length) === 5);
  chk('링크 5종 정확', await p.evaluate((want) => {
    const got = [...document.querySelectorAll('.card')].map((a) => a.getAttribute('href'));
    return JSON.stringify(got) === JSON.stringify(want);
  }, LINKS));
  chk('진입 연출 후 전부 보임(opacity 1)', await p.evaluate(() =>
    [...document.querySelectorAll('.reveal')].every((e) => parseFloat(getComputedStyle(e).opacity) > 0.98)));
  chk('카드가 실제로 클릭 가능(배경이 안 가림)', await p.evaluate(() =>
    [...document.querySelectorAll('.card')].every((a) => {
      const r = a.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + 12);
      return !!e && (a === e || a.contains(e));
    })));
  chk('배경 레이어 3겹 + 매듭선 3줄', await p.evaluate(() =>
    document.querySelectorAll('.bg .blob').length === 3 && document.querySelectorAll('.weave path').length === 3));
  chk('배경은 클릭을 가로채지 않음', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.bg')).pointerEvents === 'none'
    && getComputedStyle(document.querySelector('.weave')).pointerEvents === 'none'));
  chk('가로 스크롤 없음', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  chk('로딩바 초기 숨김', await p.evaluate(() => {
    const n = document.getElementById('np');
    return !!n && !n.classList.contains('on');
  }));

  // 카드 클릭 → 로딩 표시(이동은 막고 표시만 확인)
  await p.evaluate(() => {
    document.querySelectorAll('.card').forEach((a) => a.addEventListener('click', (e) => e.preventDefault(), true));
  });
  await p.click('.card'); await wait(420);
  chk('카드 누르면 상단 로딩바 표시', await p.evaluate(() => {
    const n = document.getElementById('np');
    return n.classList.contains('on') && parseFloat(n.style.width) > 0;
  }));
  chk('누른 카드에 로딩 상태 표시', await p.evaluate(() =>
    document.querySelector('.card').classList.contains('loading')));

  console.log('\n[모바일 390x844]');
  const m = await b.newPage();
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  m.on('pageerror', (e) => errors.push(e.message));
  m.on('console', (e2) => { if (e2.type() === 'error') errors.push(e2.text()); });
  await m.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(1000);
  chk('모바일 1열 + 가로 스크롤 없음', await m.evaluate(() => {
    const cs = [...document.querySelectorAll('.card')];
    const oneCol = Math.abs(cs[0].getBoundingClientRect().left - cs[1].getBoundingClientRect().left) < 1;
    return oneCol && document.documentElement.scrollWidth <= window.innerWidth + 1;
  }));
  chk('모바일 카드 터치 타깃 충분', await m.evaluate(() =>
    [...document.querySelectorAll('.card')].every((a) => a.getBoundingClientRect().height >= 44)));

  console.log('\n[모션 줄이기]');
  const rm = await b.newPage(); await rm.setViewport({ width: 1440, height: 900 });
  rm.on('pageerror', (e) => errors.push(e.message));
  rm.on('console', (e2) => { if (e2.type() === 'error') errors.push(e2.text()); });
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(500);
  chk('장식 애니메이션 정지', await rm.evaluate(() =>
    getComputedStyle(document.querySelector('.blob')).animationName === 'none'
    && getComputedStyle(document.querySelector('.mark')).animationName === 'none'));
  chk('그래도 내용은 다 보임', await rm.evaluate(() =>
    [...document.querySelectorAll('.reveal')].every((e) => parseFloat(getComputedStyle(e).opacity) > 0.98)
    && document.querySelectorAll('.card').length === 5));

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
