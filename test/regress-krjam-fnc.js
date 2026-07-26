/* /krjam-fnc 플립북 회귀 (v0.9.234)
   확인 대상: 34쪽 자산이 전부 살아있는가 · 넘김/목차/딥링크/확대가 동작하는가 · 콘솔 에러 0.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-fnc.js   (puppeteer-core 필요) */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8884;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' };

// Cloudflare Pages 라우팅 흉내: /krjam-fnc → krjam-fnc.html (디렉터리보다 .html 우선)
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-fnc') p = '/krjam-fnc.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TOTAL = 34;

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = [];
  const base = `http://localhost:${PORT}`;

  // ── 1. 자산 존재 (34 pages + 34 thumbs + pdf + og) ──
  console.log('\n[자산]');
  let missPage = [], missThumb = [];
  for (let i = 1; i <= TOTAL; i++) {
    const n = String(i).padStart(2, '0');
    if (!fs.existsSync(path.join(ROOT, `krjam-fnc/pages/p${n}.webp`))) missPage.push(i);
    if (!fs.existsSync(path.join(ROOT, `krjam-fnc/thumbs/t${n}.webp`))) missThumb.push(i);
  }
  chk('페이지 이미지 34종 존재', missPage.length === 0, missPage.join(','));
  chk('썸네일 34종 존재', missThumb.length === 0, missThumb.join(','));
  chk('PDF 원본 존재', fs.existsSync(path.join(ROOT, 'krjam-fnc/assets/KNJ16-FnC-Orientation.pdf')));
  chk('OG 이미지 존재', fs.existsSync(path.join(ROOT, 'krjam-fnc/assets/og-fnc.png')));

  // ── 2. 로딩 ──
  console.log('\n[PC 1440 — 로딩]');
  let p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const failedReq = [];
  p.on('requestfailed', (r) => { if (r.url().startsWith(base)) failedReq.push(r.url()); });
  p.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) failedReq.push(r.status() + ' ' + r.url()); });
  await p.goto(`${base}/krjam-fnc`, { waitUntil: 'networkidle2' });
  await wait(300);

  chk('첫 페이지 이미지 렌더', await p.evaluate(() => {
    const im = document.getElementById('leafTop');
    return !!im && im.naturalWidth > 800;
  }));
  chk('부팅 오버레이 제거', await p.evaluate(() => !document.getElementById('boot')));
  chk('쪽 표시 1 / 34', await p.evaluate(() => document.getElementById('pgNum').textContent === '1'
    && document.getElementById('pgTot').textContent === '34'));
  chk('목차 34개 생성', await p.evaluate(() => document.querySelectorAll('.tocitem').length) === TOTAL);
  chk('이전 버튼 비활성(1쪽)', await p.evaluate(() => document.getElementById('btnPrev').disabled));
  // v0.9.234 실제 버그: [hidden] 이 .toc{display:flex} 에 밀려 목차 패널이 화면을 덮고 클릭을 가로챘다.
  chk('숨긴 오버레이가 클릭을 가로채지 않음', await p.evaluate(() => {
    const hit = (el) => {
      const r = el.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!e && (e === el || el.contains(e));
    };
    const covered = ['toc', 'tocMask', 'leafFlip', 'leafUnder', 'zoomBadge']
      .filter((id) => document.getElementById(id).offsetParent !== null);
    return covered.length === 0 && hit(document.getElementById('btnNext'))
      && hit(document.getElementById('btnToc')) && hit(document.getElementById('btnFs'));
  }));

  // ── 3. 넘김 ──
  console.log('\n[넘김]');
  await p.click('#btnNext'); await wait(700);
  chk('다음 → 2쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '2');
  chk('해시 #p2 반영', (await p.evaluate(() => location.hash)) === '#p2');
  chk('넘김 후 flip 레이어 숨김', await p.evaluate(() => document.getElementById('leafFlip').hidden
    && document.getElementById('leafUnder').hidden));
  chk('2쪽 이미지 실제 교체', await p.evaluate(() => /p02\.webp/.test(document.getElementById('leafTop').src)));

  await p.click('#btnPrev'); await wait(700);
  chk('이전 → 1쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '1');
  chk('1쪽 이미지 복귀', await p.evaluate(() => /p01\.webp/.test(document.getElementById('leafTop').src)));

  await p.keyboard.press('ArrowRight'); await wait(700);
  await p.keyboard.press('ArrowRight'); await wait(700);
  chk('키보드 → → 3쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '3');
  await p.keyboard.press('End'); await wait(700);
  chk('End → 마지막쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === String(TOTAL));
  chk('다음 버튼 비활성(마지막)', await p.evaluate(() => document.getElementById('btnNext').disabled));
  chk('마지막쪽 이미지 로드', await p.evaluate(() => {
    const im = document.getElementById('leafTop');
    return /p34\.webp/.test(im.src) && im.naturalWidth > 800;
  }));
  await p.keyboard.press('Home'); await wait(700);
  chk('Home → 1쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '1');

  // ── 4. 스크러버 · 제목 ──
  console.log('\n[스크러버 · 제목]');
  await p.evaluate(() => {
    const s = document.getElementById('scrub');
    s.value = '15'; s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(250);
  chk('스크러버 15쪽 이동', await p.evaluate(() => document.getElementById('pgNum').textContent) === '15');
  chk('쪽 제목 표시', await p.evaluate(() => (document.getElementById('pgTitle').textContent || '').includes('식권')));

  // ── 5. 목차 ──
  console.log('\n[목차]');
  await p.click('#btnToc'); await wait(220);
  chk('목차 열림', await p.evaluate(() => !document.getElementById('toc').hidden));
  // v0.9.234 실제 버그: img 의 height="180" 속성이 살아 aspect-ratio 가 무시돼 썸네일이 잘렸다.
  chk('썸네일 16:9 유지', await p.evaluate(() => {
    const im = document.querySelector('.tocitem img');
    const r = im.getBoundingClientRect();
    return r.width > 40 && Math.abs(r.width / r.height - 16 / 9) < 0.05;
  }));
  chk('현재쪽 목차 활성', await p.evaluate(() => {
    const on = document.querySelector('.tocitem.on');
    return !!on && on.dataset.p === '15';
  }));
  await p.evaluate(() => document.querySelector('.tocitem[data-p="24"]').click());
  await wait(750);
  chk('목차 클릭 → 24쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '24');
  chk('목차 자동 닫힘', await p.evaluate(() => document.getElementById('toc').hidden));
  await p.click('#btnToc'); await wait(150);
  await p.keyboard.press('Escape'); await wait(150);
  chk('Esc 로 목차 닫힘', await p.evaluate(() => document.getElementById('toc').hidden));

  // ── 6. 확대 ──
  console.log('\n[확대]');
  const box = await p.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await p.mouse.click(box.x, box.y, { clickCount: 2 });
  await wait(320);
  chk('더블클릭 확대 적용', await p.evaluate(() => /scale\((1\.[1-9]|[2-4])/.test(document.getElementById('zoomWrap').style.transform)));
  chk('확대 배지 표시', await p.evaluate(() => !document.getElementById('zoomBadge').hidden));
  await p.click('#btnZoomReset'); await wait(320);
  chk('원래대로 복귀', await p.evaluate(() => {
    const t = document.getElementById('zoomWrap').style.transform;
    return /scale\(1\)/.test(t) && document.getElementById('zoomBadge').hidden;
  }));

  // ── 7. 딥링크 ──
  console.log('\n[딥링크]');
  const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 900 });
  p2.on('pageerror', (e) => errors.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.goto(`${base}/krjam-fnc#p12`, { waitUntil: 'networkidle2' }); await wait(400);
  chk('#p12 진입 시 12쪽', await p2.evaluate(() => document.getElementById('pgNum').textContent) === '12');
  chk('#p12 이미지 일치', await p2.evaluate(() => /p12\.webp/.test(document.getElementById('leafTop').src)));
  // 같은 문서 내 해시 변경은 리로드가 없으므로 새 탭에서 확인한다.
  const p2b = await b.newPage(); await p2b.setViewport({ width: 1440, height: 900 });
  p2b.on('pageerror', (e) => errors.push(e.message));
  p2b.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2b.goto(`${base}/krjam-fnc#p99`, { waitUntil: 'networkidle2' }); await wait(300);
  chk('범위 밖 해시(#p99) → 1쪽', await p2b.evaluate(() => document.getElementById('pgNum').textContent) === '1');

  // ── 8. 모바일 ──
  console.log('\n[모바일 390x844]');
  const p3 = await b.newPage();
  await p3.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p3.on('pageerror', (e) => errors.push(e.message));
  p3.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p3.goto(`${base}/krjam-fnc`, { waitUntil: 'networkidle2' }); await wait(400);
  chk('모바일 페이지 렌더', await p3.evaluate(() => document.getElementById('leafTop').naturalWidth > 800));
  chk('모바일 book 이 화면 안에 들어감', await p3.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    return r.width > 100 && r.width <= window.innerWidth + 1 && r.height <= window.innerHeight;
  }));
  chk('모바일 넘김 버튼 40px 이상', await p3.evaluate(() => {
    const r = document.getElementById('btnNext').getBoundingClientRect();
    return r.height >= 40 && r.width >= 36;
  }));
  chk('PC 에선 가로보기 버튼 숨김', await p.evaluate(() => getComputedStyle(document.getElementById('btnRot')).display === 'none'));
  chk('모바일 세로에선 가로보기 버튼 노출', await p3.evaluate(() => getComputedStyle(document.getElementById('btnRot')).display !== 'none'));
  const before = await p3.evaluate(() => document.getElementById('book').getBoundingClientRect().width);
  await p3.click('#btnRot'); await wait(420);
  chk('가로보기 전환 시 90도 회전', await p3.evaluate(() => {
    const st = document.getElementById('stage').classList.contains('rot');
    const r = document.getElementById('book').getBoundingClientRect();
    return st && r.height > r.width;                 // 회전 후 화면상 세로가 더 길다
  }));
  chk('가로보기에서 슬라이드가 1.75배 이상 커짐', await p3.evaluate((b) => {
    const r = document.getElementById('book').getBoundingClientRect();
    return r.height / b > 1.75;                      // 회전 전 폭 대비 실제 표시 길이
  }, before));
  chk('가로보기 중 확대 잠금', await p3.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    const ev = new MouseEvent('dblclick', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 });
    document.getElementById('stage').dispatchEvent(ev);
    return /scale\(1\)|^$/.test(document.getElementById('zoomWrap').style.transform || '');
  }));
  await p3.click('#btnRot'); await wait(420);
  chk('가로보기 해제', await p3.evaluate(() => !document.getElementById('stage').classList.contains('rot')));

  await p3.click('#btnToc'); await wait(250);
  chk('모바일 목차(하단시트) 열림', await p3.evaluate(() => {
    const t = document.getElementById('toc');
    if (t.hidden) return false;
    const r = t.getBoundingClientRect();
    return Math.abs(r.bottom - window.innerHeight) < 2 && r.width > window.innerWidth - 2;
  }));

  // ── 9. 자산 HTTP 상태 ──
  console.log('\n[자산 서빙]');
  const codes = await p.evaluate(async (t) => {
    const bad = [];
    for (let i = 1; i <= t; i++) {
      const n = String(i).padStart(2, '0');
      for (const u of ['/krjam-fnc/pages/p' + n + '.webp', '/krjam-fnc/thumbs/t' + n + '.webp']) {
        const r = await fetch(u, { method: 'GET' });
        if (!r.ok) bad.push(r.status + ' ' + u);
      }
    }
    const pdf = await fetch('/krjam-fnc/assets/KNJ16-FnC-Orientation.pdf');
    if (!pdf.ok) bad.push(pdf.status + ' pdf');
    const og = await fetch('/krjam-fnc/assets/og-fnc.png');
    if (!og.ok) bad.push(og.status + ' og');
    return bad;
  }, TOTAL);
  chk('68종 이미지 + PDF + OG 모두 200', codes.length === 0, codes.slice(0, 4).join(' / '));

  // ── 10. 콘솔 ──
  console.log('\n[콘솔 · 네트워크]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));
  chk('요청 실패 0', failedReq.length === 0, failedReq.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
