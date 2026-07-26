/* / 랜딩 허브 회귀 (v0.9.241)
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

// 요소 영역을 캡처해 **실제 픽셀**로 명암비를 잰다(가장 밝은 픽셀=바탕, 가장 어두운=글자).
// 움직이는 배경·그라데이션 글자는 눈으로 못 잡으므로 이 방식이 유일하게 확실하다.
async function contrastOf(page, sel) {
  const box = await page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  }, sel);
  if (!box) return null;
  const shot = await page.screenshot({ clip: box, encoding: 'base64' });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const L = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    let hi = -1, lo = 2;
    for (let i = 0; i < d.length; i += 4) { const l = L(d[i], d[i + 1], d[i + 2]); if (l > hi) hi = l; if (l < lo) lo = l; }
    return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
  }, shot);
}

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
  chk('오로라 2겹 + 그레인', await p.evaluate(() =>
    document.querySelectorAll('.aurora i').length === 2 && !!document.querySelector('.grain')));
  chk('불티 생성(PC 10개)', await p.evaluate(() => document.querySelectorAll('.embers i').length) === 10);
  chk('타이틀 글자가 전부 보임', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('h1 b')].filter((e) => e.textContent.trim());
    return bs.length === 11 && bs.every((e) => parseFloat(getComputedStyle(e).opacity) > 0.98);
  }));
  chk('카드마다 아우라·시트 요소', await p.evaluate(() =>
    document.querySelectorAll('.card .ring').length === 5 && document.querySelectorAll('.card .sheen').length === 5));
  // v0.9.240 실제 버그: .card>*:not(.ring) 이 .sheen 까지 position:relative 로 덮어
  // 크기 0인 인라인 박스가 되면서 빛 줄기가 카드 밖으로 새어나갔다.
  chk('빛 줄기가 카드 안에 갇힘', await p.evaluate(() => {
    const c = document.querySelector('.card'), sh = c.querySelector('.sheen');
    const cs = getComputedStyle(sh);
    const r = sh.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return cs.position === 'absolute' && cs.overflow === 'hidden'
      // inset:0 은 패딩 박스 기준이라 1px 테두리만큼(양쪽 2px) 작다
      && Math.abs(r.width - cr.width) <= 2.5 && Math.abs(r.height - cr.height) <= 2.5;
  }));
  chk('배경은 클릭을 가로채지 않음', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.bg')).pointerEvents === 'none'
    && getComputedStyle(document.querySelector('.weave')).pointerEvents === 'none'));
  chk('가로 스크롤 없음', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  chk('로딩바 초기 숨김', await p.evaluate(() => {
    const n = document.getElementById('np');
    return !!n && !n.classList.contains('on');
  }));

  // 커서를 따라 기울기·광원 변수가 갱신되는가
  await p.mouse.move(300, 240); await wait(120);
  await p.hover('.card'); await wait(60);
  const cbox = await p.evaluate(() => {
    const r = document.querySelector('.card').getBoundingClientRect();
    return { x: r.x + r.width * 0.78, y: r.y + r.height * 0.28 };
  });
  await p.mouse.move(cbox.x, cbox.y); await wait(200);
  chk('커서 위치에 따라 기울기·광원 갱신', await p.evaluate(() => {
    const c = document.querySelector('.card');
    const ry = c.style.getPropertyValue('--ry'), mx = c.style.getPropertyValue('--mx');
    return !!ry && parseFloat(ry) !== 0 && !!mx && parseFloat(mx) > 55;
  }));
  // v0.9.240 실제 버그: .ring 이 요소 자체를 rotate 해서 회전 사각형의 대각선만큼
  // 박스가 커졌고, 후광이 위아래 카드까지 길게 번졌다. 각도만 돌려야 한다.
  chk('호버 후광이 카드에 붙어 있음', await p.evaluate(() => {
    const c = document.querySelector('.card');
    const cr = c.getBoundingClientRect(), rr = c.querySelector('.ring').getBoundingClientRect();
    return rr.top > cr.top - 12 && rr.bottom < cr.bottom + 12
      && rr.left > cr.left - 12 && rr.right < cr.right + 12;
  }));
  chk('호버한 카드가 맨 위로', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.card:hover')).zIndex === '3'));
  // 후광이 카드 뒤에서 배어 나와 본문 대비를 깎지 않는지 **실제 픽셀로** 잰다.
  // (backdrop-filter 의 saturate 때문에 한 번 4.45 까지 떨어졌던 지점)
  const hoverContrast = await contrastOf(p, '.card:hover .desc');
  chk('호버 상태 본문 대비 4.5 이상', hoverContrast >= 4.5, '측정 ' + hoverContrast);

  await p.mouse.move(5, 5); await wait(220);
  chk('벗어나면 기울기 복귀', await p.evaluate(() =>
    parseFloat(document.querySelector('.card').style.getPropertyValue('--rx')) === 0));

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

  // ── 텍스트 가시성 ── 움직이는 배경 위에서도 읽혀야 한다
  console.log('\n[텍스트 가시성 — 실제 픽셀 측정]');
  await p.mouse.move(5, 5); await wait(300);
  // 그라데이션이 흐르는 제목은 **주기 전체**에서 확인한다.
  // (밝은 보라·파랑을 정지점에 넣었더니 특정 구간에서 2.63:1 까지 떨어졌다 — v0.9.241 실제 사고)
  let worstTitle = 99;
  for (let i = 0; i < 5; i++) {
    const c = await contrastOf(p, 'h1');
    if (c !== null && c < worstTitle) worstTitle = c;
    await wait(1500);
  }
  chk('제목 대비 4.5 이상 (흐름 전 구간)', worstTitle >= 4.5, '최저 ' + worstTitle);
  for (const [label, sel, min] of [['부제', '.sub', 4.5], ['카드 제목', '.card .name', 4.5],
                                   ['카드 본문', '.card .desc', 4.5], ['푸터 링크', '.foot a', 3.5]]) {
    const c = await contrastOf(p, sel);
    chk(label + ' 대비 ' + min + ' 이상', c !== null && c >= min, '측정 ' + c);
  }

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
  chk('모바일은 불티를 줄임(6개)', await m.evaluate(() => document.querySelectorAll('.embers i').length) === 6);
  chk('모바일에선 기울기 미적용', await m.evaluate(() =>
    !document.querySelector('.card').style.getPropertyValue('--rx')));

  console.log('\n[모션 줄이기]');
  const rm = await b.newPage(); await rm.setViewport({ width: 1440, height: 900 });
  rm.on('pageerror', (e) => errors.push(e.message));
  rm.on('console', (e2) => { if (e2.type() === 'error') errors.push(e2.text()); });
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(500);
  chk('장식 애니메이션 정지', await rm.evaluate(() =>
    getComputedStyle(document.querySelector('.blob')).animationName === 'none'
    && getComputedStyle(document.querySelector('.mark')).animationName === 'none'
    && getComputedStyle(document.querySelector('.aurora i')).animationName === 'none'));
  chk('불티는 아예 만들지 않음', await rm.evaluate(() => document.querySelectorAll('.embers i').length) === 0);
  chk('타이틀은 읽히는 색으로 표시', await rm.evaluate(() => {
    const b = document.querySelector('h1 b');
    return parseFloat(getComputedStyle(b).opacity) > 0.98;
  }));
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
