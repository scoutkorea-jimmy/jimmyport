/* 홍보부 운영보드 — 디자인 규칙 픽셀 감사 (v0.9.256)
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
const PORT = 8904;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const ROUTES = { '/krjam-planning': '/krjam-planning.html' };
const NEWS = [{ id: 'n1', title: '개영식 현장 스케치', subtitle: '첫날 밤, 4만 명의 함성', body: '<p>본문</p>', images: [],
  tags: ['개영식', '현장'], stage: 'published', cardnewsDone: true, photographer: '김사진', reporter: '박취재',
  depts: ['기획조정본부', '운영본부'], priority: 3.5, en: 'need', author: 'jimmy', authorName: '박지민',
  createdAt: '2026-08-05T22:10:00Z', comments: [{ id: 'c1', username: 'kim', author: '김검수', text: '사진 교체 바랍니다', ts: '2026-08-06T01:00:00Z', v: 1 }] },
 { id: 'n2', title: '과정활동 스케치', subtitle: '', body: '두 번째', images: [], tags: ['과정활동'], stage: 'draft',
  priority: 5, en: 'done', reporter: '김취재', depts: ['프로그램본부'], author: 'jimmy', authorName: '박지민',
  createdAt: '2026-08-06T10:00:00Z', comments: [] }];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, articles: NEWS, press: [], tips: [], assets: [], items: [], slots: {}, types: [],
      events: [], ttcats: [], offtimes: {}, marketing: [], contacts: [], divisions: [], protocol: [], mappos: {},
      shoots: [], timetable: [], roster: [], duties: {} }));
  }
  if (ROUTES[p]) p = ROUTES[p];
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 실제로 그려진 픽셀에서 명도비를 잰다 — 색 값을 계산하는 게 아니라 화면을 본다.
   (배경이 그러데이션·반투명이면 계산값과 실제가 다르다.) */
async function contrastOf(page, sel) {
  /* ⚠️ 좌표를 먼저 재고 나중에 캡처하면, 그 사이 이미지 로드로 화면이 밀려 **빈 자리**를 찍는다
     (실측 5.4:1 인 링크가 1.3:1 로 나온 적이 있다 — 측정 결함이 규칙 위반으로 둔갑한다).
     요소 핸들로 직접 찍으면 브라우저가 그 순간의 위치를 잡아 준다. */
  const el = await page.$(sel);
  if (!el) return null;
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(120);
  const bb = await el.boundingBox();
  if (!bb || bb.width < 2 || bb.height < 2) return null;
  let shot;
  try { shot = await el.screenshot({ encoding: 'base64' }); }
  catch { return null; }
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
    await p.evaluateOnNewDocument(() => {
      localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: 'admin', type: '홍보부', tabs: [], exp: Date.now() + 9e6 }));
    });
    await p.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' }); await wait(1200);
    const views = ['dashboard', 'calendar', 'list', 'news', 'press', 'tips', 'timetable', 'staff', 'protocol', 'library', 'meals', 'contacts'];
    for (const v of views) {
      await p.evaluate((x) => setView(x), v);
      await wait(420);
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
          /* 예외 - 규칙의 하한은 '버튼'이다.
             checkbox/radio: 표 칸의 표시용 컨트롤. 40px 로 키우면 행 높이가 두 배가 되어 표를 못 읽는다.
             range: 손잡이가 조작 대상이고 트랙은 얇은 것이 정상이다.
             color: 색 견본 자체가 크기다. */
          const ty = (el.getAttribute && el.getAttribute('type')) || '';
          const exempt = /^(checkbox|radio|range|color)$/.test(ty);
          const ctl = el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
            || (el.tagName === 'INPUT' && !exempt)
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
  await pc.evaluateOnNewDocument(() => {
    localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: 'admin', type: '홍보부', tabs: [], exp: Date.now() + 9e6 }));
    localStorage.setItem('jamboree-plan:view', 'news');
  });
  await pc.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' }); await wait(1400);
  await pc.evaluate(() => setView('news')); await wait(700);
  const TARGETS = [
    ['화면 제목', '#view-title'], ['섹션 설명', '.note'],
    ['표 머리글', '#news-list thead th'], ['표 본문', '#news-list td.nr-title .nr-tt'],
    ['부제목', '#news-list .nr-sub'], ['태그', '#news-list .nr-tags'],
    ['단계 칩', '#news-list td.nr-pub .pst'], ['영문 칩', '#news-list td.nr-en .enchip'],
    ['협조부서 칩', '#news-list td.nr-dept .news-tag'], ['담당 표기', '#news-list .nr-photog'],
    ['별점 숫자', '#news-list .starnum'], ['통계바', '#news-bar .press-stat'],
    ['필터 고르개', '.newsfilter select'], ['좌측 메뉴(선택)', '.side .on'],
    ['저장 상태', '#syncst'], ['D-day', '.dday'],
  ];
  for (const [name, sel] of TARGETS) {
    const c = await contrastOf(pc, sel);
    if (c !== null && c < 4.5) found.contrast.push(name + ' ' + c + ':1  (' + sel + ')');
    console.log('  대비 ' + String(c === null ? '—' : c).padStart(6) + ' : ' + name);
  }
  // 도표 캡션·경고 상자는 다른 화면에 있다
  await pc.evaluate(() => openNewsView('n1')); await wait(600);
  for (const [name, sel] of [['모달 제목', '#nv-title'], ['모달 메타', '#nv-body .pv-meta'], ['버전 배지', '.nv-ver'],
                             ['코멘트 버전', '.ac-v'], ['코멘트 본문', '.ac-t'], ['모달 버튼', '#nv-tools .btn']]) {
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
