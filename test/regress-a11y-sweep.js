/* 전 화면 접근성 스윕 회귀 (v0.9.248)
   [rules/ui-ux.md] 의 두 하한을 **모든 공개 화면 × 두 해상도**에서 전수로 지킨다.
     · 자기 텍스트를 가진 요소의 글자 ≥ 13px
     · 조작 요소(버튼 · 블록으로 놓인 링크)의 높이 ≥ 40px
   화면마다 검사가 있어야 규칙이 지켜진다 — 실제로 랜딩·플립북에만 스윕이 있던 동안
   나머지 6개 화면에 75종의 위반이 남아 있었다(v0.9.248 에서 일괄 정리).

   ⚠️ 문장 속 **인라인 링크**(이메일 · 지도 출처 표기)는 조작 요소로 보지 않는다.
      40px 로 만들면 문단이 깨진다. `display:inline` 인 <a> 는 제외한다.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-a11y-sweep.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8893;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/jsx', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf' };
const ROUTES = { '/': '/index.html', '/tour': '/tour/index.html', '/krjam-cardnews': '/krjam-cardnews.html',
  '/krjam-dcount': '/krjam-dcount.html', '/krjam-jebo': '/krjam-jebo.html', '/privacy': '/privacy.html',
  '/krjam-planning': '/krjam-planning.html', '/krjam-fnc': '/krjam-fnc.html' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (ROUTES[p]) p = ROUTES[p];
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 화면별 예외 — 왜 예외인지 적지 않으면 예외가 아니다.
const EXCEPT = {
  // 지도 핀 위에 얹는 글자(순위 번호 · 지역 코드)와 출처 표기는 '본문·라벨'이 아니라 지도 그래픽이다.
  // 13px 로 키우면 핀을 덮어 지도를 못 읽는다. 출처 표기는 OSM 라이선스상 지워서도 안 된다.
  '/tour': { fontSel: ['.leaflet-marker-icon', '.leaflet-control-attribution', '.leaflet-tooltip'] },
};

const PAGES = ['/', '/tour', '/krjam-cardnews', '/krjam-dcount', '/krjam-jebo', '/privacy', '/krjam-planning', '/krjam-fnc'];
const VIEWPORTS = [['모바일', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
                   ['PC', { width: 1440, height: 900 }]];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const base = `http://localhost:${PORT}`;

  for (const route of PAGES) {
    for (const [vn, vp] of VIEWPORTS) {
      const p = await b.newPage(); await p.setViewport(vp);
      let loaded = true;
      try { await p.goto(base + route, { waitUntil: 'networkidle2', timeout: 30000 }); }
      catch (e) { loaded = false; }
      if (!loaded) { chk(`${route} ${vn} 로드`, false, '로드 실패'); await p.close(); continue; }
      await wait(1800);
      const ex = (EXCEPT[route] && EXCEPT[route].fontSel) || [];
      const v = await p.evaluate((exSel) => {
        const label = (el) => {
          const c = String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
          return el.tagName.toLowerCase() + (el.id ? '#' + el.id : (c ? '.' + c : ''));
        };
        const small = [], tap = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
          const skip = exSel.some((s) => el.closest(s));
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
          if (!skip && own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + label(el));
          const ctl = el.tagName === 'BUTTON' || /(^|\s)btn(\s|$)/.test(String(el.className))
            || (el.tagName === 'A' && cs.display !== 'inline');
          if (!skip && ctl && r.height < 40) tap.push(Math.round(r.height) + 'px ' + label(el));
        });
        return { small: [...new Set(small)], tap: [...new Set(tap)] };
      }, ex);
      chk(`${route} ${vn} 글자 13px 이상`, v.small.length === 0, v.small.slice(0, 4).join(' | '));
      chk(`${route} ${vn} 조작 요소 40px 이상`, v.tap.length === 0, v.tap.slice(0, 4).join(' | '));
      await p.close();
    }
  }

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
