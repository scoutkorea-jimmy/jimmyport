/* 내비게이션 개편 검증 — PC 사이드바 / 모바일 하단탭+시트.
   가장 중요한 것: 12개 탭이 전부 도달 가능한가 · 권한이 새지 않는가 */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/Users/jimmy/Desktop/VS_Code/jimmyport';
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
const ALL = ['dashboard', 'calendar', 'list', 'news', 'tips', 'library', 'timetable', 'sitemap', 'protocol', 'staff', 'contacts', 'orginfo'];
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
// evaluateOnNewDocument 는 함수를 직렬화해 보내므로 클로저 변수가 페이지에 없다 → 반드시 인자로 넘긴다
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
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = [];

  // ── PC 사이드바 ──
  console.log('\n[PC 1440 — 좌측 사이드바]');
  let p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.evaluateOnNewDocument(SEED, 'admin', '홍보부', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  const pc = await p.evaluate(() => {
    const nav = document.querySelector('.tabbar').getBoundingClientRect();
    const sec = document.getElementById('dashboard').getBoundingClientRect();
    const hdr = document.querySelector('header.top').getBoundingClientRect();
    return { navL: Math.round(nav.left), navW: Math.round(nav.width), navTop: Math.round(nav.top),
      hdrBot: Math.round(hdr.bottom), secTop: Math.round(sec.top),
      secL: Math.round(sec.left), sticky: getComputedStyle(document.querySelector('.tabbar')).position,
      dir: getComputedStyle(document.querySelector('.tabbar')).flexDirection,
      botnav: getComputedStyle(document.getElementById('botnav')).display,
      sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  });
  chk('탭바가 좌측 세로 사이드바', pc.dir === 'column' && pc.navW < 260, pc.navW + 'px · ' + pc.dir);
  chk('사이드바가 헤더 아래에 (위로 안 올라감)', pc.navTop > pc.hdrBot - 2, '헤더끝 ' + pc.hdrBot + ' / 나브 ' + pc.navTop);
  chk('사이드바-본문 세로 시작 일치', Math.abs(pc.navTop - pc.secTop) < 4, '나브 ' + pc.navTop + ' / 본문 ' + pc.secTop);
  chk('본문이 사이드바 오른쪽에', pc.secL > pc.navL + pc.navW - 5, '나브 ' + pc.navL + '+' + pc.navW + ' / 본문 ' + pc.secL);
  chk('사이드바 sticky', pc.sticky === 'sticky', pc.sticky);
  chk('하단 탭은 PC 에서 숨김', pc.botnav === 'none');
  chk('PC 가로 넘침 없음', pc.sw <= pc.iw, 'scrollW=' + pc.sw);
  // PC 에서 12탭 전부 이동되는가
  let pcOk = 0;
  for (const v of ALL) {
    await p.evaluate((x) => document.querySelector('.vtab[data-v="' + x + '"]').click(), v);
    await new Promise((r) => setTimeout(r, 160));
    const cur = await p.evaluate(() => curViewMode); if (cur === v) pcOk++;
  }
  chk('PC 사이드바로 12탭 전부 이동', pcOk === 12, pcOk + '/12');
  await p.evaluate(() => document.querySelector('.vtab[data-v="dashboard"]').click());
  await new Promise((r) => setTimeout(r, 300));
  await p.screenshot({ path: '/tmp/nav-pc.png' });
  await p.close();

  // ── 모바일 하단탭 ──
  console.log('\n[모바일 390 — 하단 탭 + 더보기]');
  p = await b.newPage(); await p.setViewport({ width: 390, height: 844 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.evaluateOnNewDocument(SEED, 'admin', '홍보부', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  const mb = await p.evaluate(() => {
    const bn = document.getElementById('botnav').getBoundingClientRect();
    return { tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
      pos: getComputedStyle(document.getElementById('botnav')).position,
      n: document.querySelectorAll('#botnav .bn').length,
      h: Math.round(bn.height), atBottom: Math.round(bn.bottom) === window.innerHeight,
      tap: Math.round(document.querySelector('#botnav .bn').getBoundingClientRect().height),
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      on: (document.querySelector('#botnav .bn.on span') || {}).textContent };
  });
  chk('상단 4그룹 탭바 숨김 (380px 회수)', mb.tabbar === 'none');
  chk('하단 탭 고정 · 5칸(4+더보기)', mb.pos === 'fixed' && mb.n === 5 && mb.atBottom, mb.n + '칸 · h=' + mb.h);
  chk('탭 터치 타깃 ≥48px', mb.tap >= 48, mb.tap + 'px');
  chk('현재 탭 활성 표시', mb.on === '대시보드', mb.on);
  chk('모바일 가로 넘침 없음', mb.sw <= mb.iw, 'scrollW=' + mb.sw);
  await p.screenshot({ path: '/tmp/nav-mob.png' });

  // 더보기 시트로 나머지 8개 도달
  await p.click('[data-bn="__more"]'); await new Promise((r) => setTimeout(r, 300));
  const sheet = await p.evaluate(() => ({ show: document.getElementById('navsheet').classList.contains('show'),
    items: document.querySelectorAll('#navsheet [data-sheet]').length,
    grps: document.querySelectorAll('#navsheet .sheet-grp').length }));
  chk('더보기 → 시트 열림 · 12개 전부 · 4그룹', sheet.show && sheet.items === 12 && sheet.grps === 4, sheet.items + '개 / ' + sheet.grps + '그룹');
  await p.screenshot({ path: '/tmp/nav-sheet.png' });
  let mOk = 0;
  for (const v of ALL) {
    await p.evaluate(() => { const s = document.getElementById('navsheet'); if (!s.classList.contains('show')) document.querySelector('[data-bn="__more"]').click(); });
    await new Promise((r) => setTimeout(r, 160));
    await p.evaluate((x) => document.querySelector('#navsheet [data-sheet="' + x + '"]').click(), v);
    await new Promise((r) => setTimeout(r, 160));
    const cur = await p.evaluate(() => curViewMode); if (cur === v) mOk++;
  }
  chk('시트로 12탭 전부 이동', mOk === 12, mOk + '/12');
  await p.evaluate(() => { const s = document.getElementById('navsheet'); if (!s.classList.contains('show')) document.querySelector('[data-bn="__more"]').click(); });
  await new Promise((r) => setTimeout(r, 200));
  await p.evaluate(() => document.getElementById('navsheet-bg').click());
  await new Promise((r) => setTimeout(r, 200));
  chk('배경 탭하면 시트 닫힘', !(await p.evaluate(() => document.getElementById('navsheet').classList.contains('show'))));
  await p.close();

  // ── 권한: 일반 회원은 관리 탭 못 봄 ──
  console.log('\n[권한 — 일반 회원]');
  p = await b.newPage(); await p.setViewport({ width: 390, height: 844 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.evaluateOnNewDocument(SEED, 'member', '일반', []);
  await p.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  await p.click('[data-bn="__more"]'); await new Promise((r) => setTimeout(r, 250));
  const perm = await p.evaluate(() => {
    const inSheet = [...document.querySelectorAll('#navsheet [data-sheet]')].map((x) => x.getAttribute('data-sheet'));
    return { inSheet, staff: inSheet.includes('staff'), contacts: inSheet.includes('contacts'), sitemap: inSheet.includes('sitemap') };
  });
  chk('일반 회원 시트에 관리 탭 없음', !perm.staff && !perm.contacts && !perm.sitemap, '보이는 탭: ' + perm.inSheet.join(','));
  const blocked = await p.evaluate(() => { setView('staff'); return curViewMode; });
  chk('직접 호출해도 관리 탭 차단', blocked === 'dashboard', blocked);
  await p.close();

  console.log('\n[콘솔]');
  chk('에러 0', errors.length === 0, errors.slice(0, 2).join(' | ') || 'clean');

  await b.close(); server.close();
  const f = R.filter((x) => !x.p);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' PASS ===');
  if (f.length) console.log('FAILED: ' + f.map((x) => x.n).join(' | '));
  process.exit(f.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); server.close(); process.exit(2); });
