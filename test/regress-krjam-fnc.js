/* /krjam-fnc-book 플립북 회귀 (v0.9.239 · v0.9.253 에서 /krjam-fnc → /krjam-fnc-book 로 이전)
   확인 대상: 31쪽 자산이 전부 살아있는가(IST 업무배정 3쪽이 전부 삭제됐는가) · 좌측 목차/넘김/딥링크/확대가
   동작하는가 · 모바일 드로어와 가로 보기가 동작하는가 · 콘솔 에러 0.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-fnc.js   (puppeteer-core 필요) */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8884;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' };

// Cloudflare Pages 라우팅 흉내: /krjam-fnc-book → krjam-fnc-book.html (/krjam-fnc 는 안내 보드가 쓴다)
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-fnc-book') p = '/krjam-fnc-book.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TOTAL = 31;                       // IST 업무배정 3쪽(8/3~8/5 · 8/6~8/7 · 8/8~8/9) 전량 삭제 후

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = [];
  const base = `http://localhost:${PORT}`;

  // ── 1. 자산 ──
  console.log('\n[자산]');
  let missPage = [], missThumb = [];
  for (let i = 1; i <= TOTAL; i++) {
    const n = String(i).padStart(2, '0');
    if (!fs.existsSync(path.join(ROOT, `krjam-fnc/pages/p${n}.webp`))) missPage.push(i);
    if (!fs.existsSync(path.join(ROOT, `krjam-fnc/thumbs/t${n}.webp`))) missThumb.push(i);
  }
  chk(`페이지 이미지 ${TOTAL}종 존재`, missPage.length === 0, missPage.join(','));
  chk(`썸네일 ${TOTAL}종 존재`, missThumb.length === 0, missThumb.join(','));
  chk('삭제된 32~34번째 파일 없음', [32, 33, 34].every((n) =>
    !fs.existsSync(path.join(ROOT, `krjam-fnc/pages/p${n}.webp`))
    && !fs.existsSync(path.join(ROOT, `krjam-fnc/thumbs/t${n}.webp`))));
  chk('PDF 원본 존재', fs.existsSync(path.join(ROOT, 'krjam-fnc/assets/KNJ16-FnC-Orientation.pdf')));
  chk('OG 이미지 존재', fs.existsSync(path.join(ROOT, 'krjam-fnc/assets/og-fnc.png')));
  // 내려받기 PDF 도 33쪽이어야 한다(포퍼가 없으면 건너뜀)
  let pdfPages = null;
  try {
    pdfPages = parseInt((execFileSync('pdfinfo', [path.join(ROOT, 'krjam-fnc/assets/KNJ16-FnC-Orientation.pdf')],
      { encoding: 'utf8' }).match(/^Pages:\s*(\d+)/m) || [])[1], 10);
  } catch (e) { /* poppler 없음 */ }
  if (pdfPages === null) console.log('  SKIP 내려받기 PDF 쪽수 (pdfinfo 없음)');
  else chk(`내려받기 PDF 도 ${TOTAL}쪽`, pdfPages === TOTAL, 'pages=' + pdfPages);

  // ── 2. 로딩 (PC) ──
  console.log('\n[PC 1440 — 로딩]');
  let p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const failedReq = [];
  p.on('requestfailed', (r) => { if (r.url().startsWith(base)) failedReq.push(r.url()); });
  p.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) failedReq.push(r.status() + ' ' + r.url()); });
  await p.goto(`${base}/krjam-fnc-book`, { waitUntil: 'networkidle2' });
  await wait(400);

  chk('첫 페이지 이미지 렌더', await p.evaluate(() => {
    const im = document.getElementById('leafTop');
    return !!im && im.naturalWidth > 800;
  }));
  chk('부팅 오버레이 제거', await p.evaluate(() => !document.getElementById('boot')));
  chk(`쪽 표시 1 / ${TOTAL}`, await p.evaluate((t) => document.getElementById('pgNum').textContent === '1'
    && document.getElementById('pgTot').textContent === String(t), TOTAL));
  chk('한국잼버리 엠블럼 표시', await p.evaluate(() => {
    const im = document.querySelector('.emblem');
    return !!im && im.naturalWidth > 0 && /jamboree\/assets\/logo\.png$/.test(im.src);
  }));
  chk('부팅 진행바가 100%까지 차고 사라짐', await p.evaluate(() => {
    // boot 는 제거됐고(위 검사), 남아 있었다면 채워진 상태여야 한다
    const b = document.getElementById('boot');
    return !b || (document.getElementById('bootFill') || {}).style.width === '100.0%';
  }));
  chk('상단 로딩바 존재·기본 꺼짐', await p.evaluate(() => {
    const t = document.getElementById('topload');
    return !!t && !t.classList.contains('on');
  }));
  chk('배경 연출 레이어 2겹', await p.evaluate(() =>
    document.querySelectorAll('.stagebg i').length) === 2);
  chk('배경이 뷰어를 가리지 않음(book 이 위)', await p.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!e && !e.closest('.stagebg');
  }));
  chk('이전 버튼 비활성(1쪽)', await p.evaluate(() => document.getElementById('btnPrev').disabled));
  // v0.9.247 실제 사고: PC 에서만 보이는 목차(챕터 머리글 12.5px · 번호 12.5px)와 <sup> 9.36px 가
  // 모바일 스윕에 안 걸렸다. **화면 크기마다** 전수로 재야 한다.
  const pcSweep = await p.evaluate(() => {
    const small = [], tap = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
      if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
      if ((el.tagName === 'BUTTON' || el.tagName === 'A') && r.height < 40)
        tap.push(Math.round(r.height) + 'px ' + (el.className || el.tagName));
    });
    return { small: [...new Set(small)].slice(0, 4), tap: [...new Set(tap)].slice(0, 4) };
  });
  chk('PC 본문·라벨 전부 13px 이상', pcSweep.small.length === 0, pcSweep.small.join(' | '));
  chk('PC 조작 요소 전부 40px 이상', pcSweep.tap.length === 0, pcSweep.tap.join(' | '));
  chk('PC 는 이어보기 아님(피드 숨김·모드버튼 숨김)', await p.evaluate(() =>
    document.getElementById('feed').hidden
    && !document.body.classList.contains('scrollmode')
    && getComputedStyle(document.getElementById('btnMode')).display === 'none'));
  // v0.9.234 실제 버그: [hidden] 이 .toc{display:flex} 에 밀려 숨긴 패널이 클릭을 가로챘다.
  chk('숨긴 오버레이가 클릭을 가로채지 않음', await p.evaluate(() => {
    const hit = (el) => {
      const r = el.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!e && (e === el || el.contains(e));
    };
    const covered = ['tocMask', 'leafFlip', 'leafUnder', 'zoomBadge']
      .filter((id) => document.getElementById(id).offsetParent !== null);
    return covered.length === 0 && hit(document.getElementById('btnNext'))
      && hit(document.getElementById('btnToc')) && hit(document.getElementById('btnFs'));
  }));

  // ── 3. 목차 (좌측 상시 사이드바) ──
  console.log('\n[목차 — PC 좌측 사이드바]');
  chk('기본으로 열려 있음', await p.evaluate(() => !document.getElementById('toc').hidden));
  chk('스테이지 왼쪽에 위치', await p.evaluate(() => {
    const t = document.getElementById('toc').getBoundingClientRect();
    const s = document.getElementById('stage').getBoundingClientRect();
    return t.left < 2 && t.right <= s.left + 1 && t.width > 200;
  }));
  chk('오버레이가 아님(마스크 없음)', await p.evaluate(() => {
    const m = document.getElementById('tocMask');
    return m.hidden || getComputedStyle(m).display === 'none';
  }));
  chk(`목차 항목 ${TOTAL}개`, await p.evaluate(() => document.querySelectorAll('.tocitem').length) === TOTAL);
  chk('챕터 머리글 8개', await p.evaluate(() => document.querySelectorAll('.tocsec-h').length) === 8);
  chk('첫 챕터명 = 행사 · 본부 개요', await p.evaluate(() =>
    document.querySelector('.tocsec-h').textContent.trim()) === '행사 · 본부 개요');
  chk('썸네일 16:9 유지', await p.evaluate(() => {
    const im = document.querySelector('.tocitem img');
    const r = im.getBoundingClientRect();
    return r.width > 40 && Math.abs(r.width / r.height - 16 / 9) < 0.05;
  }));
  chk('현재쪽 강조', await p.evaluate(() => {
    const on = document.querySelector('.tocitem.on');
    return !!on && on.dataset.p === '1';
  }));
  const wBefore = await p.evaluate(() => document.getElementById('stage').getBoundingClientRect().width);
  await p.click('#btnToc'); await wait(260);
  chk('접으면 뷰어가 넓어짐', await p.evaluate((w) => {
    const hidden = document.getElementById('toc').hidden;
    const now = document.getElementById('stage').getBoundingClientRect().width;
    return hidden && now > w + 200;
  }, wBefore));
  await p.click('#btnToc'); await wait(260);
  chk('다시 열림', await p.evaluate(() => !document.getElementById('toc').hidden));
  chk('열림 상태 저장', await p.evaluate(() => localStorage.getItem('krjam-fnc:toc') === '1'));

  // ── 4. 넘김 ──
  console.log('\n[넘김]');
  await p.click('#btnNext'); await wait(700);
  chk('다음 → 2쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '2');
  chk('해시 #p2 반영', (await p.evaluate(() => location.hash)) === '#p2');
  chk('넘김 후 flip 레이어 숨김', await p.evaluate(() => document.getElementById('leafFlip').hidden
    && document.getElementById('leafUnder').hidden));
  chk('2쪽 이미지 실제 교체', await p.evaluate(() => /p02\.webp/.test(document.getElementById('leafTop').src)));
  chk('목차 강조도 따라 이동', await p.evaluate(() => {
    const on = document.querySelector('.tocitem.on');
    return !!on && on.dataset.p === '2';
  }));

  await p.click('#btnPrev'); await wait(700);
  chk('이전 → 1쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '1');

  await p.keyboard.press('ArrowRight'); await wait(700);
  await p.keyboard.press('ArrowRight'); await wait(700);
  chk('키보드 → → 3쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '3');
  await p.keyboard.press('End'); await wait(700);
  chk('End → 마지막쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === String(TOTAL));
  chk('다음 버튼 비활성(마지막)', await p.evaluate(() => document.getElementById('btnNext').disabled));
  chk('마지막쪽 이미지 로드', await p.evaluate(() => {
    const im = document.getElementById('leafTop');
    return /p31\.webp/.test(im.src) && im.naturalWidth > 800;
  }));
  await p.keyboard.press('Home'); await wait(700);
  chk('Home → 1쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '1');

  // ── 5. 스크러버 · 제목 · 삭제 반영 ──
  console.log('\n[스크러버 · 제목 · 31쪽 삭제 반영]');
  const setScrub = async (v) => {
    await p.evaluate((x) => {
      const s = document.getElementById('scrub');
      s.value = String(x); s.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await wait(250);
  };
  await setScrub(15);
  chk('스크러버 15쪽 이동', await p.evaluate(() => document.getElementById('pgNum').textContent) === '15');
  chk('15쪽 제목 = 식권 종류', await p.evaluate(() => (document.getElementById('pgTitle').textContent || '').includes('식권')));
  await setScrub(31);
  chk('마지막 31쪽 = 맺음말', await p.evaluate(() => (document.getElementById('pgTitle').textContent || '').includes('맺음말')));
  chk('30쪽 = 주요 업무추진 일정', await p.evaluate(() => {
    const e = document.querySelector('.tocitem[data-p="30"] .t');
    return !!e && e.textContent.includes('업무추진 일정');
  }));
  chk('목차에 IST 업무배정 항목이 하나도 없음', await p.evaluate(() =>
    ![...document.querySelectorAll('.tocitem .t')].some((e) => /업무배정/.test(e.textContent))));
  chk('마지막 챕터명에도 IST 배정 없음', await p.evaluate(() =>
    ![...document.querySelectorAll('.tocsec-h')].some((e) => /IST 배정/.test(e.textContent))));
  await setScrub(1);

  // ── 6. 목차 클릭 이동 ──
  console.log('\n[목차 이동]');
  await p.evaluate(() => document.querySelector('.tocitem[data-p="24"]').click());
  await wait(750);
  chk('목차 클릭 → 24쪽', await p.evaluate(() => document.getElementById('pgNum').textContent) === '24');
  chk('PC 는 클릭 후에도 목차 유지', await p.evaluate(() => !document.getElementById('toc').hidden));

  // ── 7. 확대 ──
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

  // ── 8. 딥링크 ──
  console.log('\n[딥링크]');
  const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 900 });
  p2.on('pageerror', (e) => errors.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.goto(`${base}/krjam-fnc-book#p12`, { waitUntil: 'networkidle2' }); await wait(400);
  chk('#p12 진입 시 12쪽', await p2.evaluate(() => document.getElementById('pgNum').textContent) === '12');
  chk('#p12 이미지 일치', await p2.evaluate(() => /p12\.webp/.test(document.getElementById('leafTop').src)));
  // 같은 문서 내 해시 변경은 리로드가 없으므로 새 탭에서 확인한다.
  const p2b = await b.newPage(); await p2b.setViewport({ width: 1440, height: 900 });
  p2b.on('pageerror', (e) => errors.push(e.message));
  p2b.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2b.goto(`${base}/krjam-fnc-book#p99`, { waitUntil: 'networkidle2' }); await wait(300);
  chk('범위 밖 해시(#p99) → 1쪽', await p2b.evaluate(() => document.getElementById('pgNum').textContent) === '1');
  await p2b.goto(`${base}/krjam-fnc-book#p32`, { waitUntil: 'networkidle2' }); await wait(300);
  chk('삭제로 사라진 #p32 → 1쪽', await p2b.evaluate(() => document.getElementById('pgNum').textContent) === '1');

  // ── 9. 모바일 ──
  console.log('\n[모바일 390x844]');
  const p3 = await b.newPage();
  await p3.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p3.on('pageerror', (e) => errors.push(e.message));
  p3.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p3.goto(`${base}/krjam-fnc-book`, { waitUntil: 'networkidle2' }); await wait(700);

  // ── 이어보기(세로 스크롤) — 터치 기본 모드 ──
  console.log('  · 이어보기 모드');
  chk('터치 기기 기본 = 이어보기', await p3.evaluate(() =>
    document.body.classList.contains('scrollmode')
    && !document.getElementById('feed').hidden
    && document.getElementById('stage').hidden));
  chk(`피드에 ${TOTAL}쪽이 세로로 쌓임`, await p3.evaluate((t) => {
    const f = document.getElementById('feed');
    const els = f.querySelectorAll('.fpage');
    if (els.length !== t) return false;
    const a = els[0].getBoundingClientRect(), b = els[1].getBoundingClientRect();
    return b.top > a.bottom - 1 && f.scrollHeight > f.clientHeight * 3;   // 세로 배치 + 스크롤 가능
  }, TOTAL));
  chk('첫 쪽 이미지 로드', await p3.evaluate(() => {
    const im = document.querySelector('.fpage[data-p="1"] img');
    return !!im && im.naturalWidth > 800;
  }));
  chk('쪽마다 번호·제목 캡션', await p3.evaluate(() => {
    const c = document.querySelector('.fpage[data-p="1"] .fcap');
    return !!c && c.textContent.includes('1') && c.textContent.includes('표지');
  }));
  chk('모드 버튼 노출(터치)', await p3.evaluate(() =>
    getComputedStyle(document.getElementById('btnMode')).display !== 'none'));
  chk('내려온 쪽은 스켈레톤이 걷힘', await p3.evaluate(() => {
    const el = document.querySelector('.fpage[data-p="1"]');
    return el.classList.contains('ready') && !el.classList.contains('loading');
  }));
  chk('아직 안 내려온 쪽은 스켈레톤 유지', await p3.evaluate(() => {
    const els = [...document.querySelectorAll('.fpage')].slice(-6);
    return els.some((e) => e.classList.contains('loading'));
  }));
  chk('이어보기에선 배경 연출 끔', await p3.evaluate(() =>
    getComputedStyle(document.querySelector('.stagebg')).display === 'none'));
  chk('이어보기 중엔 가로보기 숨김', await p3.evaluate(() =>
    getComputedStyle(document.getElementById('btnRot')).display === 'none'));

  // 스크롤 → 현재 쪽 갱신
  await p3.evaluate(() => {
    const f = document.getElementById('feed');
    const el = document.querySelector('.fpage[data-p="7"]');
    f.scrollTop = f.scrollTop + el.getBoundingClientRect().top - f.getBoundingClientRect().top - 10;
  });
  await wait(600);
  chk('스크롤하면 현재 쪽이 따라옴', await p3.evaluate(() =>
    document.getElementById('pgNum').textContent === '7'
    && (document.getElementById('pgTitle').textContent || '').includes('배치도')));
  chk('스크롤 시 해시도 갱신', await p3.evaluate(() => location.hash) === '#p7');

  // 목차 → 해당 쪽으로 스크롤
  await p3.click('#btnToc'); await wait(320);
  await p3.evaluate(() => document.querySelector('.tocitem[data-p="20"]').click());
  await wait(900);
  chk('목차 선택 → 그 쪽으로 스크롤', await p3.evaluate(() => {
    const f = document.getElementById('feed');
    const el = document.querySelector('.fpage[data-p="20"]');
    const delta = el.getBoundingClientRect().top - f.getBoundingClientRect().top;
    return document.getElementById('pgNum').textContent === '20' && Math.abs(delta - 10) < 40;
  }));
  // 스크러버 → 스크롤
  await p3.evaluate(() => {
    const s = document.getElementById('scrub');
    s.value = '3'; s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(500);
  chk('스크러버로도 이동', await p3.evaluate(() => document.getElementById('pgNum').textContent) === '3');
  chk('확대는 브라우저 기본에 맡김(피드 touch-action 미차단)', await p3.evaluate(() =>
    getComputedStyle(document.getElementById('feed')).touchAction !== 'none'));

  // ── 모드 전환 → 플립북 ──
  console.log('  · 한 장씩(플립북) 모드');
  await p3.click('#btnMode'); await wait(500);
  chk('모드 전환 → 플립북', await p3.evaluate(() =>
    !document.body.classList.contains('scrollmode')
    && document.getElementById('feed').hidden
    && !document.getElementById('stage').hidden));
  chk('전환해도 보던 쪽 유지', await p3.evaluate(() => document.getElementById('pgNum').textContent) === '3');
  chk('모드 저장', await p3.evaluate(() => localStorage.getItem('krjam-fnc:mode') === 'flip'));
  chk('모바일은 목차 기본 닫힘', await p3.evaluate(() => document.getElementById('toc').hidden));
  chk('모바일 book 이 화면 안에 들어감', await p3.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    return r.width > 100 && r.width <= window.innerWidth + 1 && r.height <= window.innerHeight;
  }));
  chk('모바일 넘김 버튼 40px 이상', await p3.evaluate(() => {
    const r = document.getElementById('btnNext').getBoundingClientRect();
    return r.height >= 40 && r.width >= 36;
  }));
  // v0.9.245 실제 사고: 상단 브랜드 링크가 36px 였다(엠블럼 30 + 패딩 6).
  // 개별 요소만 보지 말고 **보이는 조작 요소를 전수**로 재야 이런 게 걸린다.
  chk('모바일 조작 요소 전부 40px 이상', await p3.evaluate(() => {
    const bad = [];
    document.querySelectorAll('a,button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
      if (r.height < 40) bad.push(Math.round(r.height) + 'px ' + (el.className || el.id || el.tagName));
    });
    window.__tapBad = bad;
    return bad.length === 0;
  }), await p3.evaluate(() => (window.__tapBad || []).slice(0, 3).join(' | ')));
  await p3.click('#btnToc'); await wait(320);
  chk('목차가 좌측 드로어로 열림', await p3.evaluate(() => {
    const t = document.getElementById('toc');
    if (t.hidden) return false;
    const r = t.getBoundingClientRect();
    return r.left < 2 && r.top < 2 && Math.abs(r.bottom - window.innerHeight) < 2 && r.width < window.innerWidth;
  }));
  chk('드로어에는 배경 마스크 표시', await p3.evaluate(() => {
    const m = document.getElementById('tocMask');
    return !m.hidden && getComputedStyle(m).display !== 'none';
  }));
  chk('드로어 항목 터치 타깃 40px 이상', await p3.evaluate(() => {
    const r = document.querySelector('.tocitem').getBoundingClientRect();
    return r.height >= 40;
  }));
  await p3.evaluate(() => document.querySelector('.tocitem[data-p="9"]').click());
  await wait(800);
  chk('모바일은 선택 후 드로어 닫힘', await p3.evaluate(() => document.getElementById('toc').hidden
    && document.getElementById('pgNum').textContent === '9'));
  await p3.click('#btnToc'); await wait(250);
  await p3.keyboard.press('Escape'); await wait(250);
  chk('Esc 로 드로어 닫힘', await p3.evaluate(() => document.getElementById('toc').hidden));

  // ── 10. 가로 보기 ──
  console.log('\n[가로 보기]');
  chk('PC 에선 가로보기 버튼 숨김', await p.evaluate(() => getComputedStyle(document.getElementById('btnRot')).display === 'none'));
  chk('모바일 세로에선 가로보기 버튼 노출', await p3.evaluate(() => getComputedStyle(document.getElementById('btnRot')).display !== 'none'));
  const before = await p3.evaluate(() => document.getElementById('book').getBoundingClientRect().width);
  await p3.click('#btnRot'); await wait(420);
  chk('가로보기 전환 시 90도 회전', await p3.evaluate(() => {
    const st = document.getElementById('stage').classList.contains('rot');
    const r = document.getElementById('book').getBoundingClientRect();
    return st && r.height > r.width;
  }));
  chk('가로보기에서 슬라이드가 1.75배 이상 커짐', await p3.evaluate((bw) => {
    const r = document.getElementById('book').getBoundingClientRect();
    return r.height / bw > 1.75;
  }, before));
  chk('가로보기 중 확대 잠금', await p3.evaluate(() => {
    const r = document.getElementById('book').getBoundingClientRect();
    const ev = new MouseEvent('dblclick', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 });
    document.getElementById('stage').dispatchEvent(ev);
    return /scale\(1\)|^$/.test(document.getElementById('zoomWrap').style.transform || '');
  }));
  await p3.click('#btnRot'); await wait(420);
  chk('가로보기 해제', await p3.evaluate(() => !document.getElementById('stage').classList.contains('rot')));
  await p3.click('#btnMode'); await wait(500);
  chk('이어보기로 되돌아옴', await p3.evaluate(() =>
    document.body.classList.contains('scrollmode') && !document.getElementById('feed').hidden));

  // ── 11. 자산 HTTP 상태 ──
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
  chk(`${TOTAL * 2}종 이미지 + PDF + OG 모두 200`, codes.length === 0, codes.slice(0, 4).join(' / '));

  // ── 12. 콘솔 ──
  console.log('\n[콘솔 · 네트워크]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));
  chk('요청 실패 0', failedReq.length === 0, failedReq.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
