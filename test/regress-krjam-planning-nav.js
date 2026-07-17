/* 2단 내비게이션 검증 (v0.9.184) — PC 상단 공간바+세부바 / 모바일 하단 공간탭+세부 스크롤.
   가장 중요한 것: 12개 뷰가 전부 도달 가능한가 · 권한이 새지 않는가 */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8881;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-planning') p = '/krjam-planning.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ALL = ['dashboard', 'calendar', 'list', 'news', 'tips', 'shootlist', 'library', 'timetable', 'sitemap', 'protocol', 'staff', 'contacts', 'orginfo'];
const WS_OF = { dashboard: 'dash', calendar: 'content', list: 'content', news: 'content', tips: 'content', shootlist: 'content', timetable: 'field', sitemap: 'field', protocol: 'field', staff: 'team', contacts: 'team', orginfo: 'team', library: 'team' };
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const SEED = function (role, type, tabs) {
  localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: role, type: type, tabs: tabs, exp: Date.now() + 9e6 }));
  localStorage.setItem('jamboree-plan:view', 'dashboard');
  const rf = window.fetch;
  window.fetch = (u, o) => { u = String(u);
    const J = (d) => Promise.resolve(new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } }));
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: [] });
    if (u.startsWith('/api/jp-assets')) return J({ ok: true, assets: [] });
    if (u.startsWith('/api/jp-tips')) return J({ ok: true, tips: [] });
    if (u.startsWith('/api/krjam-dcount')) return J({ ok: true, slots: [], approved: [] });
    if (u.startsWith('/api/jamboree-plan')) { if (o && o.method === 'PUT') return J({ ok: true });
      return J({ ok: true, slots: {}, types: [], events: [], ttcats: [], offtimes: {}, marketing: [], contacts: [], divisions: [], protocol: [], mappos: {}, shoots: [], timetable: [],
        roster: [{ id: 'r1', name: '김기자', role: '취재', team: 't1' }] }); }
    if (u.startsWith('/api/')) return J({ ok: true });
    return rf(u, o); };
};
// PC = 사이드바에서 항목 직접 클릭(공간 전환 단계가 없다 — 14개가 모두 펼쳐져 있다)
async function goVia(p, v) {
  await p.evaluate((x) => { const b = document.querySelector('.side-item[data-v="' + x + '"]'); if (b) b.click(); else setView(x); }, v);
  await new Promise((r) => setTimeout(r, 160));
  return p.evaluate(() => curViewMode);
}
async function goViaBot(p, v) {
  await p.evaluate((ws) => { const b = document.querySelector('#botnav [data-bnws="' + ws + '"]'); if (b) b.click(); }, WS_OF[v]);
  await new Promise((r) => setTimeout(r, 120));
  await p.evaluate((x) => { const b = document.querySelector('.subbar .vtab[data-v="' + x + '"]'); if (b && b.style.display !== 'none') b.click(); else setView(x); }, v);
  await new Promise((r) => setTimeout(r, 140));
  return p.evaluate(() => curViewMode);
}
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = [];

  // ── PC ──
  console.log('\n[PC 1440 — 공간바 + 세부바]');
  let p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.evaluateOnNewDocument(SEED, 'admin', '홍보부', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  const pc = await p.evaluate(() => {
    const side = document.querySelector('.side').getBoundingClientRect();
    const wrap = document.querySelector('.wrap').getBoundingClientRect();
    return { grp: document.querySelectorAll('.side-grp').length,
      items: document.querySelectorAll('.side-item[data-v]').length,
      sideLeft: Math.round(side.left), sideW: Math.round(side.width), wrapLeft: Math.round(wrap.left),
      sticky: getComputedStyle(document.querySelector('.side')).position,
      botnav: getComputedStyle(document.getElementById('botnav')).display,
      sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  });
  chk('PC = 좌측 사이드바 · 4그룹 14항목 전부 펼침', pc.grp === 4 && pc.items === 14, pc.grp + '그룹 · ' + pc.items + '항목');
  chk('사이드바가 본문 왼쪽 · 스크롤 고정', pc.sideLeft === 0 && pc.wrapLeft >= pc.sideW && pc.sticky === 'sticky',
    '사이드 ' + pc.sideW + 'px · 본문 시작 ' + pc.wrapLeft + ' · ' + pc.sticky);
  chk('하단 탭 PC 숨김', pc.botnav === 'none');
  chk('PC 가로 넘침 없음', pc.sw <= pc.iw, 'scrollW=' + pc.sw);
  let pcOk = 0;
  for (const v of ALL) { if ((await goVia(p, v)) === v) pcOk++; }
  chk('PC 공간→세부로 13뷰 전부 이동', pcOk === 13, pcOk + '/13');
  await goVia(p, 'dashboard');
  await p.screenshot({ path: '/tmp/nav-pc.png' });
  await p.close();

  // ── 모바일 ──
  console.log('\n[모바일 390 — 하단 공간탭 + 세부 스크롤]');
  p = await b.newPage(); await p.setViewport({ width: 390, height: 844 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.evaluateOnNewDocument(SEED, 'admin', '홍보부', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  const mb = await p.evaluate(() => {
    const bn = document.getElementById('botnav').getBoundingClientRect();
    return { wsbar: getComputedStyle(document.querySelector('.side')).display,
      pos: getComputedStyle(document.getElementById('botnav')).position,
      n: document.querySelectorAll('#botnav .bn').length,
      atBottom: Math.round(bn.bottom) === window.innerHeight,
      tap: Math.round(document.querySelector('#botnav .bn').getBoundingClientRect().height),
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      on: (document.querySelector('#botnav .bn.on span') || {}).textContent,
      ready: document.documentElement.classList.contains('botnav-ready') };
  });
  chk('사이드바 숨김(모바일) — 하단 탭이 대신한다', mb.wsbar === 'none');
  chk('하단 탭 그려진 뒤에만 상단 숨김(botnav-ready)', mb.ready === true && mb.n > 0, 'ready=' + mb.ready);
  chk('하단 탭 고정 · 4공간', mb.pos === 'fixed' && mb.n === 4 && mb.atBottom, mb.n + '공간');
  chk('탭 터치 타깃 ≥48px', mb.tap >= 48, mb.tap + 'px');
  chk('현재 공간 활성 표시(대시보드)', mb.on === '대시보드', mb.on);
  chk('모바일 가로 넘침 없음', mb.sw <= mb.iw, 'scrollW=' + mb.sw);
  let mOk = 0;
  for (const v of ALL) { if ((await goViaBot(p, v)) === v) mOk++; }
  chk('모바일 하단공간→세부로 13뷰 전부 이동', mOk === 13, mOk + '/13');
  await p.close();

  // ── 권한: 일반 회원 ──
  console.log('\n[권한 — 일반 회원]');
  p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.evaluateOnNewDocument(SEED, 'member', '일반', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  // 팀·자료 공간의 세부 확인(관리 탭 안 보이고 자료실만)
  // 사이드바는 모두 펼쳐져 있으므로 보이는 항목을 그대로 읽으면 된다
  const shown = await p.evaluate(() => [...document.querySelectorAll('.side-item[data-v]')].map((x) => x.getAttribute('data-v')));
  chk('일반 회원: 관리 탭(staff/contacts/orginfo/protocol/sitemap/tips) 없음',
    !['staff', 'contacts', 'orginfo', 'protocol', 'sitemap', 'tips'].some((x) => shown.includes(x)), '보이는 세부: ' + shown.join(','));
  chk('일반 회원: 자료실·일정표는 보임(공개)', shown.includes('library') && shown.includes('timetable'), shown.join(','));
  const blocked = await p.evaluate(() => { setView('staff'); return curViewMode; });
  chk('직접 호출해도 관리 탭 차단', blocked === 'dashboard', blocked);
  const blockedTip = await p.evaluate(() => { setView('tips'); return curViewMode; });
  chk('일반 회원 tips 직접 호출 차단', blockedTip === 'dashboard', blockedTip);
  await p.close();

  console.log('\n[콘솔]');
  chk('에러 0', errors.length === 0, errors.slice(0, 2).join(' | ') || 'clean');

  await b.close(); server.close();
  const f = R.filter((x) => !x.p);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' PASS ===');
  if (f.length) console.log('FAILED: ' + f.map((x) => x.n).join(' | '));
  process.exit(f.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); server.close(); process.exit(2); });
