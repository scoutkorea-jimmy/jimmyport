/* / 랜딩 허브 회귀 (v0.9.297 — 정돈된 랜딩 기준으로 다시 씀)
 *
 * v0.9.240~241 의 화려한 랜딩(5겹 배경 · 무지개 아우라 · 빛 쓸기 · 커서 3D 기울기 ·
 * 그라데이션 글자)을 `rules/ui-ux.md`(규칙 ④)와 `DESIGN.md` 기준으로 걷어낸 뒤의 계약을 지킨다.
 *
 *  · 도구 카드가 전부 살아있는가 · 종료한 서비스가 되살아나지 않았는가
 *  · **장식이 다시 기어들어오지 않았는가** — 무한 애니메이션 · 그라데이션 글자 ·
 *    3D 기울기 · 색조 글로우 · 유리(blur)는 전부 0이어야 한다
 *  · 타입 계층이 뭉개지지 않았는가 · 대비 4.5 이상 · 조작 40px 이상 · 콘솔 에러 0
 *
 * 실행: NODE_PATH=<scratch>/node_modules node test/regress-landing.js */
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

// v0.9.295 — 카드뉴스 제작기·디데이 카드는 서비스 종료로 랜딩에서 내렸다.
const LINKS = ['/tour', '/krjam-planning', 'https://bpmedia.net/'];
// 내린 주소가 랜딩에 되살아나면 실패한다(실수로 되돌리는 것을 막는 이빨).
const GONE_LINKS = ['/krjam-cardnews', '/krjam-dcount', '/krjam-fnc', '/krjam-fnc-book'];
// v0.9.297 타입 스케일 — 이 넷 밖의 크기가 생기면 계층이 뭉갠다.
const SCALE = [13, 16.5, 21, 28];

// 요소 영역을 캡처해 **실제 픽셀**로 명암비를 잰다(가장 밝은 픽셀=바탕, 가장 어두운=글자).
// 배경에 옅은 그라데이션이 깔려 있어 선언값 계산만으로는 실제 대비를 알 수 없다.
async function contrastOf(page, sel) {
  // ⚠️ clip 이 뷰포트를 조금이라도 벗어나면 page.screenshot 이 예외를 던진다
  //    (카드가 화면 아래로 걸치면 간헐적으로 터졌다 — v0.9.245 실제 사고).
  //    보이는 곳으로 스크롤한 뒤, 뷰포트 안으로 잘라서 잰다.
  const box = await page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
    const w = Math.min(Math.ceil(r.width), window.innerWidth - x);
    const h = Math.min(Math.ceil(r.height), window.innerHeight - y);
    return (w > 2 && h > 2) ? { x, y, width: w, height: h } : null;
  }, sel);
  if (!box) return null;
  const shot = await page.screenshot({ clip: box, encoding: 'base64' });
  return page.evaluate((b64) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const lum = (r, gg, bb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(bb); };
      let hi = -1, lo = 2;
      for (let i = 0; i < d.length; i += 4) { const L = lum(d[i], d[i + 1], d[i + 2]); if (L > hi) hi = L; if (L < lo) lo = L; }
      res(Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100);
    };
    img.src = 'data:image/png;base64,' + b64;
  }), shot);
}

/* 화면에서 실제로 도는 애니메이션·변형을 훑는다 — 선언만 보면 놓친다 */
const PROBE_DECOR = () => {
  const infinite = [], gradText = [], threeD = [], glow = [], glass = [];
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    for (const pseudo of [null, '::before', '::after']) {
      const s = pseudo ? getComputedStyle(el, pseudo) : cs;
      if (s.animationName !== 'none' && /infinite/.test(s.animationIterationCount)) {
        infinite.push((el.className || el.tagName) + (pseudo || '') + ':' + s.animationName);
      }
    }
    // 그라데이션 글자 — 강조는 굵기·크기로 낸다(craft-floor / DESIGN.md 금지)
    if ((cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text')
        && /gradient/.test(cs.backgroundImage)) gradText.push(el.className || el.tagName);
    // 3D 기교 금지(ui-ux.md)
    if (/matrix3d|perspective/.test(cs.transform) || cs.perspective !== 'none') threeD.push(el.className || el.tagName);
    // 오프셋 0 인 색조 후광 = 장식용 글로우
    (cs.boxShadow.match(/rgba?\([^)]*\)[^,]*/g) || []).forEach((sh) => {
      const nums = (sh.match(/-?\d+(\.\d+)?px/g) || []).map(parseFloat);
      if (nums.length >= 3 && nums[0] === 0 && nums[1] === 0 && nums[2] > 0) glow.push((el.className || el.tagName) + ' ' + sh.trim());
    });
    if (cs.backdropFilter && cs.backdropFilter !== 'none') glass.push(el.className || el.tagName);
  });
  const uniq = (a) => [...new Set(a)].slice(0, 4);
  return { infinite: uniq(infinite), gradText: uniq(gradText), threeD: uniq(threeD), glow: uniq(glow), glass: uniq(glass) };
};

/* 스타일시트 **원문**을 긁는다.
   ⚠️ 계산된 스타일만 보면 놓친다 — `.reveal` 의 `animation:... forwards` 가 마지막 키프레임의
      `transform:none` 으로 요소의 transform 을 덮어써서, 3D 기울기를 되돌려 넣어도
      `getComputedStyle(el).transform` 은 `none` 으로 나온다(이빨 확인에서 실제로 안 걸렸다). */
const PROBE_CSS = () => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }   // 외부 폰트 CSS 는 못 읽는다
    /* ⚠️ 재귀로 내려가면 안 된다 — 크롬은 **CSS 중첩** 때문에 평범한 `CSSStyleRule` 에도
       (비어 있는) `cssRules` 를 달아 준다. `if (r.cssRules) 내려가기` 로 짜면 모든 스타일 규칙이
       빈 목록으로 내려가 **본문이 하나도 안 담긴다**(36개 규칙 중 2개만 담겼다 — 실제로 겪음).
       최상위 규칙의 `cssText` 에 `@media`·`@keyframes` 안쪽까지 이미 다 들어 있다. */
    for (let i = 0; i < rules.length; i++) if (rules[i].cssText) out.push(rules[i].cssText);
  }
  return out.join('\n');
};

/* 보이는 글자·조작 요소를 전수로 잰다 */
const PROBE_A11Y = () => {
  const small = [], tap = [], sizes = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
    if (own) {
      const fs = parseFloat(cs.fontSize);
      sizes.add(Math.round(fs * 10) / 10);
      if (fs < 13) small.push(fs + 'px ' + (el.className || el.tagName));
    }
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && cs.display !== 'inline' && r.height < 40) {
      tap.push(Math.round(r.height) + 'px ' + (el.className || el.tagName));
    }
  });
  return { small: [...new Set(small)].slice(0, 5), tap: [...new Set(tap)].slice(0, 5), sizes: [...sizes].sort((a, b) => a - b) };
};

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = []; const base = `http://localhost:${PORT}`;

  console.log('\n[PC 1440]');
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('requestfailed', (r) => errors.push('요청 실패 ' + r.url()));
  /* ⚠️ 크롬 콘솔 메시지에는 **어떤 주소가 404 였는지 안 들어 있다**("Failed to load resource: … 404 ()").
     v0.9.299 에서 재현 안 되는 404 를 만나 원인을 특정하지 못했다 → 응답 상태를 직접 남긴다.
     다음에 같은 일이 나면 로그만 보고 URL 을 알 수 있다. */
  p.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(900);

  chk('도구 카드 3개', await p.evaluate(() => document.querySelectorAll('.card').length) === 3);
  chk('링크 3종 정확', await p.evaluate((want) => {
    const got = [...document.querySelectorAll('.card')].map((a) => a.getAttribute('href'));
    return JSON.stringify(got) === JSON.stringify(want);
  }, LINKS));
  // v0.9.295 — 종료한 주소가 랜딩에 되살아나면 참가자가 안내 화면으로 새어 나간다.
  chk('종료한 서비스 링크가 없다', await p.evaluate((gone) => {
    const hrefs = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
    return gone.every((g) => hrefs.indexOf(g) < 0);
  }, GONE_LINKS));
  chk('카드마다 아이콘·제목·설명·태그가 있다', await p.evaluate(() =>
    [...document.querySelectorAll('.card')].every((c) =>
      c.querySelector('.dot svg') && c.querySelector('.name') && c.querySelector('.desc') && c.querySelector('.tag'))));
  chk('진입 연출 후 (보이는 것은) 전부 보임(opacity 1)', await p.evaluate(() =>
    [...document.querySelectorAll('.reveal')]
      .filter((e) => !e.hidden && getComputedStyle(e).display !== 'none')
      .every((e) => parseFloat(getComputedStyle(e).opacity) > 0.98)));
  chk('카드가 실제로 클릭 가능(배경이 안 가림)', await p.evaluate(() =>
    [...document.querySelectorAll('.card')].every((a) => {
      const r = a.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + 12);
      return !!e && (a === e || a.contains(e));
    })));
  chk('가로 스크롤 없음', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  /* ══ 정돈 계약 — 걷어낸 장식이 다시 기어들어오면 여기서 걸린다 ══════════════════
     v0.9.297 에서 걷어낸 것: 오로라 2겹 · 색덩어리 3개 · 매듭선 · 불티 · 그레인 ·
     무지개 아우라(.ring) · 빛 쓸기(.sheen) · 커서 3D 기울기 · 그라데이션 제목 ·
     로고 빛 쓸기 · 카드 로딩 바슬라이드.
     ⚠️ 선언(CSS 텍스트)만 보면 안 된다 — 실제로 **계산된 스타일**에서 확인한다. */
  console.log('\n[정돈 계약 — 장식이 되돌아오지 않았는가]');
  {
    const d = await p.evaluate(PROBE_DECOR);
    chk('무한 반복 애니메이션 0개', d.infinite.length === 0, d.infinite.join(' | '));
    chk('그라데이션 글자 없음(강조는 굵기·크기로)', d.gradText.length === 0, d.gradText.join(' | '));
    chk('3D 기울기·원근 없음(계산값)', d.threeD.length === 0, d.threeD.join(' | '));
    // 계산값은 진입 애니메이션에 가려 놓칠 수 있다 → 스타일시트 원문도 본다(ui-ux.md 3D 기교 금지)
    const css = await p.evaluate(PROBE_CSS);
    const hits3d = (css.match(/perspective\([^)]*\)|rotate[XY]\([^)]*\)|matrix3d\(/g) || []);
    chk('3D 기울기·원근 없음(CSS 원문)', hits3d.length === 0, [...new Set(hits3d)].slice(0, 4).join(' | '));
    chk('오프셋 0 색조 글로우 없음', d.glow.length === 0, d.glow.join(' | '));
    chk('유리(backdrop-filter) 장식 없음', d.glass.length === 0, d.glass.join(' | '));
    const bgLayers = await p.evaluate(() =>
      [...document.querySelectorAll('body > *')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.position === 'fixed' && el.getAttribute('aria-hidden') === 'true' && el.id !== 'np';
      }).length);
    chk('배경 장식 DOM 0개(정적 한 겹은 body::before)', bgLayers === 0, bgLayers + '개');
    chk('배경 한 겹은 클릭을 가로채지 않는다', await p.evaluate(() =>
      getComputedStyle(document.body, '::before').pointerEvents === 'none'));
  }

  console.log('\n[타입 계층]');
  {
    const a = await p.evaluate(PROBE_A11Y);
    chk('본문·라벨 전부 13px 이상', a.small.length === 0, a.small.join(' | '));
    chk('조작 요소 전부 40px 이상', a.tap.length === 0, a.tap.join(' | '));
    const off = a.sizes.filter((s) => !SCALE.includes(s));
    chk('스케일 4단계(13·16.5·21·28) 밖의 크기가 없다', off.length === 0, '벗어남 ' + off.join(','));
    chk('가장 큰 글자와 가장 작은 글자가 2배 이상 차이', a.sizes.length > 1 && a.sizes[a.sizes.length - 1] / a.sizes[0] >= 2,
      a.sizes.join(' · '));
  }

  console.log('\n[대비 실측]');
  for (const [label, sel, min] of [['제목', 'h1', 4.5], ['부제', '.sub', 4.5],
                                   ['카드 제목', '.card .name', 4.5], ['카드 본문', '.card .desc', 4.5],
                                   ['태그', '.card .tag', 4.5], ['푸터 링크', '.foot a', 4.5]]) {
    const c = await contrastOf(p, sel);
    chk(label + ' 대비 ' + min + ' 이상', c !== null && c >= min, '측정 ' + c);
  }
  // 호버는 바탕이 바뀐다 — 그 상태에서도 본문이 읽혀야 한다
  await p.hover('.card'); await wait(320);
  {
    const c = await contrastOf(p, '.card .desc');
    chk('호버 상태 본문 대비 4.5 이상', c !== null && c >= 4.5, '측정 ' + c);
  }
  await p.mouse.move(5, 5); await wait(260);

  console.log('\n[이동 중 로딩 표시]');
  chk('로딩바 초기 숨김', await p.evaluate(() => {
    const n = document.getElementById('np');
    return !!n && !n.classList.contains('on');
  }));
  /* ⚠️ **width 가 아니라 transform 이어야 한다** — width 애니메이션은 매 프레임 레이아웃을
     다시 잡는다(layout thrash). 옛 구현으로 되돌리면 이 검사가 FAIL 한다. */
  chk('로딩바는 width 가 아니라 transform 으로 움직인다', await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('np'));
    return /transform/.test(cs.transitionProperty) && !/(^|[,\s])width([,\s]|$)/.test(cs.transitionProperty);
  }), await p.evaluate(() => getComputedStyle(document.getElementById('np')).transitionProperty));
  {
    await p.evaluate(() => {
      // 실제 이동은 막고 클릭만 흘린다(테스트 서버에 /tour 가 없다)
      document.querySelectorAll('.card').forEach((a) => a.addEventListener('click', (e) => e.preventDefault(), true));
    });
    await p.click('.card'); await wait(420);
    const st = await p.evaluate(() => {
      const n = document.getElementById('np');
      const m = /matrix\(([^,]+)/.exec(getComputedStyle(n).transform);
      return { on: n.classList.contains('on'), sx: m ? parseFloat(m[1]) : null,
        loading: !!document.querySelector('.card.loading') };
    });
    chk('카드 누르면 상단 로딩바가 뜨고 실제로 늘어난다', st.on && st.sx !== null && st.sx > 0.05, JSON.stringify(st));
    chk('누른 카드에 로딩 상태 표시', st.loading);
  }

  console.log('\n[모바일 390x844]');
  const m = await b.newPage();
  m.on('pageerror', (e) => errors.push('모바일 ' + e.message));
  m.on('console', (x) => { if (x.type() === 'error') errors.push('모바일 ' + x.text()); });
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(800);
  chk('모바일 1열 + 가로 스크롤 없음', await m.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.grid'));
    return cs.gridTemplateColumns.split(' ').length === 1
      && document.documentElement.scrollWidth <= window.innerWidth + 1;
  }));
  {
    const a = await m.evaluate(PROBE_A11Y);
    chk('모바일 본문·라벨 전부 13px 이상', a.small.length === 0, a.small.join(' | '));
    chk('모바일 조작 요소 전부 40px 이상', a.tap.length === 0, a.tap.join(' | '));
    // ⚠️ 모바일에서 제목을 24px 로 줄이면 카드 제목(21px)과 1.14배밖에 차이가 안 난다.
    const off = a.sizes.filter((s) => !SCALE.includes(s));
    chk('모바일에서도 스케일 밖 크기가 생기지 않는다', off.length === 0, '벗어남 ' + off.join(','));
  }
  chk('모바일 제목이 잘리거나 넘치지 않는다', await m.evaluate(() => {
    const h = document.querySelector('h1'), w = document.querySelector('.wrap');
    return h.getBoundingClientRect().right <= w.getBoundingClientRect().right + 1;
  }));
  await m.close();

  console.log('\n[모션 줄이기]');
  const rm = await b.newPage(); await rm.setViewport({ width: 1440, height: 900 });
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(400);
  chk('진입 연출이 꺼진다', await rm.evaluate(() =>
    getComputedStyle(document.querySelector('.sub')).animationName === 'none'));
  chk('그래도 내용은 다 보임', await rm.evaluate(() =>
    [...document.querySelectorAll('.reveal')]
      .filter((e) => !e.hidden && getComputedStyle(e).display !== 'none')
      .every((e) => parseFloat(getComputedStyle(e).opacity) > 0.98)
    && document.querySelectorAll('.card').length === 3));
  {
    const d = await rm.evaluate(PROBE_DECOR);
    chk('모션 줄이기에서도 무한 애니메이션 0개', d.infinite.length === 0, d.infinite.join(' | '));
  }
  await rm.close();

  /* 개영식 카운트다운 (v0.9.294) — 경계값은 공용 모듈 검사가 정본이고, 여기서는 **이 화면에
     제대로 그려지는가**를 본다. */
  console.log('\n[개영식 카운트다운]');
  /* ⚠️ 이 검사는 **실제 시계로 재면 안 된다** — 개영식 뒤(8/9 12:00~)에는 배너를 숨기므로
     행사가 지난 날에는 무조건 FAIL 한다. v0.9.292·293 에서 같은 함정에 두 번 걸렸고
     v0.9.295(2026-08-14)에 실제로 빨개졌다. 카운트다운이 떠 있는 시각으로 갈아끼워 잰다. */
  const CD = await b.newPage(); await CD.setViewport({ width: 1440, height: 900 });
  await CD.evaluateOnNewDocument(() => {
    /* ⚠️ **얼리면 안 된다** — '초 단위로 흐른다' 를 같이 재기 때문이다.
       고정 시각에서 **출발해 실제 속도로 흐르는** 시계로 갈아끼운다. */
    const _D = Date, base = new _D('2026-08-04T20:00:00+09:00').getTime(), t0 = _D.now();
    const shift = () => base + (_D.now() - t0);
    window.Date = class extends _D { constructor(...a) { if (!a.length) super(shift()); else super(...a); } static now() { return shift(); } };
  });
  await CD.goto(`${base}/`, { waitUntil: 'networkidle2' }); await wait(300);
  chk('카운트다운이 보인다', await CD.evaluate(() => {
    const b2 = document.getElementById('cd-box');
    return !!b2 && !b2.hidden && getComputedStyle(b2).display !== 'none';
  }));
  chk('라벨에 개영식이 적혀 있다', await CD.evaluate(() =>
    /개영식까지/.test((document.querySelector('#cd-box .cd-lab') || {}).textContent || '')));
  chk('값이 D-형식 또는 D-DAY', await CD.evaluate(() => {
    const t = (document.getElementById('cd-v') || {}).textContent || '';
    return /^(D-\d+ )?\d{2}:\d{2}:\d{2}$/.test(t) || /D-DAY/.test(t);
  }), await CD.evaluate(() => (document.getElementById('cd-v') || {}).textContent));
  chk('초 단위로 흐른다', await CD.evaluate(async () => {
    const v = () => (document.getElementById('cd-v') || {}).textContent;
    const t0 = v();
    await new Promise((r) => setTimeout(r, 2200));
    return !!t0 && t0 !== v();
  }));
  chk('글자 13px 이상', await CD.evaluate(() => {
    const s = getComputedStyle(document.getElementById('cd-v'));
    const l = getComputedStyle(document.querySelector('#cd-box .cd-lab'));
    return parseFloat(s.fontSize) >= 13 && parseFloat(l.fontSize) >= 13;
  }));
  chk('가로 넘침 없음', await CD.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await CD.close();
  {
    // 시계를 8/9 12:00 이후로 밀고 새 탭에서 다시 연다(모듈은 로드 시점에 판단한다)
    const over = await b.newPage();
    await over.evaluateOnNewDocument(() => {
      const _D = Date, FIXED = new _D('2026-08-09T12:00:01+09:00').getTime();
      window.Date = class extends _D { constructor(...a) { if (!a.length) super(FIXED); else super(...a); } static now() { return FIXED; } };
    });
    await over.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await wait(300);
    chk('행사 종료(8/9 12:00) 이후에는 사라진다', await over.evaluate(() => {
      const el = document.getElementById('cd-box');
      return !!el && (el.hidden === true || getComputedStyle(el).display === 'none');
    }));
    await over.close();
  }

  console.log('\n[콘솔]');
  chk('콘솔 에러·요청 실패 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
