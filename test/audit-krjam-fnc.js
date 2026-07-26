/* 급식편의본부 보드 — 디자인 규칙 픽셀 감사 (v0.9.256)
   rules/ui-ux.md 를 화면에서 **직접 재서** 지키는지 본다. 회귀가 아니라 감사 도구다
   (회귀는 통과/실패만 남기지만, 이건 "어디가 몇 px 인지"를 뽑아 준다).

   재는 것:
     ① 타이포 계층 — 글자 ≥13px · 대타이틀 20~28px · 음수 자간 -3% 이내
     ② 조작 요소 — 버튼/링크 높이 ≥40px
     ③ 대비 — 화면을 캡처해 페이지 안 canvas 로 디코드, 글자/배경 실제 명도비 4.5+
     ④ 레이어 — 카드 안에 카드 금지
     ⑤ 정보 완결성 — 시간 표기는 HH:MM(24h)
     ⑥ 여백 — 화면 밖으로 넘치지 않는가 · 본문이 화면 폭을 쓰는가
   실행: NODE_PATH=<scratch>/node_modules node test/audit-krjam-fnc.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8903;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const ROUTES = { '/krjam-fnc': '/krjam-fnc.html', '/krjam-fnc-book': '/krjam-fnc-book.html' };
const MEALS = { ok: true, meals: { crew_n: { '2026-08-05': { b: '시리얼·우유', l: '유닛 자율 조리', d: '불고기 세트' } },
  crew_s: {}, staff: { '2026-08-05': { b: '그린샐러드·모닝빵', l: '간편식', d: '제육볶음' } } } };
const DUTY = { ok: true, duties: { supply: { main: '주명림', sub: '장문수', note: '06:00 보급 준비' } },
  updatedAt: '2026-07-26T09:00:00Z', by: '심호웅' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/jp-meals')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(MEALS)); }
  if (p.startsWith('/api/jp-fnc')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(DUTY)); }
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (ROUTES[p]) p = ROUTES[p];
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 실제로 그려진 픽셀에서 명도비를 잰다 — 색 값을 계산하는 게 아니라 화면을 본다.
   (배경이 그러데이션·반투명이면 계산값과 실제가 다르다.) */
async function contrastOf(page, sel) {
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y),
      w: Math.min(r.width, window.innerWidth - Math.max(0, r.x)),
      h: Math.min(r.height, window.innerHeight - Math.max(0, r.y)) };
  }, sel);
  if (!box || box.w < 2 || box.h < 2) return null;
  await wait(60);
  const shot = await page.screenshot({ clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) }, encoding: 'base64' });
  return page.evaluate((b64) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
        return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      let lo = 1, hi = 0;
      for (let i = 0; i < d.length; i += 4) { const L = lum(d[i], d[i + 1], d[i + 2]); if (L < lo) lo = L; if (L > hi) hi = L; }
      resolve(+((hi + .05) / (lo + .05)).toFixed(2));
    };
    img.src = 'data:image/png;base64,' + b64;
  }), shot);
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const base = `http://localhost:${PORT}`;
  const VIEWPORTS = [['PC 1440', { width: 1440, height: 1000 }], ['PC 2000', { width: 2000, height: 1100 }],
                     ['모바일 390', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]];
  const found = { small: [], big: [], tap: [], track: [], nest: [], time: [], over: [], contrast: [] };

  for (const [vn, vp] of VIEWPORTS) {
    const p = await b.newPage(); await p.setViewport(vp);
    await p.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(700);
    const views = await p.evaluate(() => window.__fncBoard.VIEWS.map((v) => v.id));
    for (const v of views) {
      await p.evaluate((x) => window.__fncBoard.setView(x), v);
      await wait(320);
      const r = await p.evaluate((view) => {
        const label = (el) => { const c = String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
          return el.tagName.toLowerCase() + (el.id ? '#' + el.id : (c ? '.' + c : '')); };
        const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .1; };
        const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
        const out = { small: [], big: [], tap: [], track: [], nest: [], time: [] };
        document.querySelectorAll('*').forEach((el) => {
          if (!vis(el)) return;
          const cs = getComputedStyle(el), rect = el.getBoundingClientRect(), fs = parseFloat(cs.fontSize);
          if (own(el)) {
            if (fs < 13) out.small.push(view + ' ' + fs + 'px ' + label(el));
            // 대타이틀(h1·h2)은 20~28px 범위 — 규칙 ③ 타이포 계층
            if (/^H[12]$/.test(el.tagName) && (fs < 20 || fs > 28)) out.big.push(view + ' ' + fs + 'px ' + label(el));
            if (cs.letterSpacing && cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) / fs < -0.03)
              out.track.push(view + ' ' + cs.letterSpacing + ' ' + label(el));
            // 시간 표기는 24시간 HH:MM — 오전/오후·1자리 시는 금지
            const t = el.textContent || '';
            if (/(오전|오후)\s*\d{1,2}\s*시/.test(t) || /\b\d:\d\d\b/.test(t)) out.time.push(view + ' ' + t.trim().slice(0, 40));
          }
          const ctl = el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'INPUT'
            || (el.tagName === 'A' && cs.display !== 'inline');
          if (ctl && rect.height < 39.5) out.tap.push(view + ' ' + rect.height.toFixed(1) + 'px ' + label(el));
        });
        // 카드 안에 카드 금지
        document.querySelectorAll('.card').forEach((c) => { if (!vis(c)) return;
          const inner = c.querySelector('.card'); if (inner && vis(inner)) out.nest.push(view + ' ' + label(c) + ' > ' + label(inner)); });
        return Object.assign(out, { over: document.documentElement.scrollWidth - window.innerWidth });
      }, v);
      for (const k of ['small', 'big', 'tap', 'track', 'nest', 'time']) found[k].push(...r[k].map((x) => vn + ' · ' + x));
      if (r.over > 0) found.over.push(vn + ' · ' + v + ' ' + r.over + 'px');
    }
    await p.close();
  }

  // 대비 — 눈으로는 못 잡는다. 실제 픽셀로 잰다.
  const pc = await b.newPage(); await pc.setViewport({ width: 1440, height: 1000 });
  await pc.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(800);
  const TARGETS = [
    ['표지 제목', '.cover .cov-tx b'], ['표지 부제', '.cover .cov-tx em'],
    ['카운트다운 값', '#hero .dv'], ['카운트다운 라벨', '#hero .dl1'],
    ['섹션 제목', '.sec-h'], ['본문', '.card p'], ['흐린 글씨', '.muted'],
    ['상태 칩', '#mealnow .chip'], ['버튼', '.card .btn'], ['원문 링크', '.sec-h .src'],
    ['좌측 메뉴(선택)', '.navitem.on'], ['좌측 메뉴', '.navitem:not(.on)'], ['묶음 이름', '.sidegrp'],
    ['상단 시각', '#topnow'], ['검색 입력', '.topsearch input'],
  ];
  for (const [name, sel] of TARGETS) {
    const c = await contrastOf(pc, sel);
    if (c !== null && c < 4.5) found.contrast.push(name + ' ' + c + ':1  (' + sel + ')');
    console.log('  대비 ' + String(c === null ? '—' : c).padStart(6) + ' : ' + name);
  }
  // 도표 캡션·경고 상자는 다른 화면에 있다
  await pc.evaluate(() => window.__fncBoard.setView('ist')); await wait(500);
  for (const [name, sel] of [['경고 상자', '.callout.danger'], ['주의 상자', '.warnbox'], ['도표 캡션', '.fig figcaption'], ['큰 수치', '.big']]) {
    const c = await contrastOf(pc, sel);
    if (c !== null && c < 4.5) found.contrast.push(name + ' ' + c + ':1  (' + sel + ')');
    console.log('  대비 ' + String(c === null ? '—' : c).padStart(6) + ' : ' + name);
  }
  await pc.close();

  await b.close(); server.close();

  const uniq = (a) => [...new Set(a)];
  const REPORT = [
    ['글자 13px 미만', found.small], ['대타이틀 20~28px 벗어남', found.big],
    ['조작 요소 40px 미만', found.tap], ['음수 자간 -3% 초과', found.track],
    ['카드 중첩', found.nest], ['시간 표기 규칙 위반', found.time],
    ['가로 넘침', found.over], ['대비 4.5 미만', found.contrast],
  ];
  console.log('\n──────── 감사 결과 ────────');
  let total = 0;
  for (const [name, list] of REPORT) {
    const u = uniq(list);
    total += u.length;
    console.log((u.length ? '✗ ' : '✓ ') + name + ' : ' + u.length + '건');
    u.slice(0, 12).forEach((x) => console.log('    - ' + x));
    if (u.length > 12) console.log('    … 외 ' + (u.length - 12) + '건');
  }
  console.log('\n합계 ' + total + '건');
  process.exit(total === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
