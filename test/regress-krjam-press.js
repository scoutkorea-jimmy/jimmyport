/* 보도자료 게시판 회귀 (v0.9.249)
   기사 탭을 아코디언에서 **게시판**으로 바꾼 뒤의 계약을 지킨다.
     · 목록은 표만 — 본문은 목록에 끼워 넣지 않는다(모달로 연다)
     · 단계는 3종(초안 · 최종검수 완료 · 퍼블리싱 완료). 구 'released' 는 '퍼블리싱 완료'로 보인다
     · 여러 건을 골라 단계 일괄 변경 · 일괄 삭제. **권한 없는 글은 건드리지 않는다**
   `/api/*` 는 전부 목업 — 운영 KV 를 건드리지 않는다.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-press.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8894;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-planning') p = '/krjam-planning.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// p1 = 구 2단계 데이터('released') · p3 = 남의 글(권한 없음 검증용)
const PRESS = [
  { id: 'p1', title: '개영식 보도자료', body: '<p>본문 <b>서식</b> 유지</p>', date: '2026-08-05', contact: '김기자',
    outlets: '연합뉴스', status: 'released', attachments: [{ name: '원문.pdf', url: '/x.pdf', ct: 'application/pdf' }],
    author: 'jimmy', authorName: '박지민', createdAt: '2026-07-01T10:00:00Z' },
  { id: 'p2', title: '중간 브리핑', body: '두 번째', date: '2026-08-06', contact: '이기자', outlets: '',
    status: 'draft', attachments: [], author: 'jimmy', authorName: '박지민', createdAt: '2026-07-02T10:00:00Z' },
  { id: 'p3', title: '폐영식 안내', body: '세 번째', date: '', contact: '', outlets: '',
    status: 'reviewed', attachments: [], author: 'other', authorName: '남', createdAt: '2026-07-03T10:00:00Z' },
];

const SEED = function (press, role) {
  // ⚠️ Auth.isStaff() = 관리자 이거나 **MANAGE_TABS**(staff·contacts·orginfo·protocol) 중 하나를 가진 부원.
  //    'press' 는 MANAGE_TABS 가 아니라서 tabs:['press'] 로는 기사 탭이 안 보인다.
  //    '남의 글은 못 건드린다'를 검증하려면 관리자가 아니면서 staff 권한을 가진 부원이어야 한다.
  const tabs = role === 'admin' ? [] : ['staff'];
  localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: role, type: '홍보부', tabs: tabs, exp: Date.now() + 9e6 }));
  localStorage.setItem('jamboree-plan:view', 'press');
  window.__del = []; window.__st = [];
  const rf = window.fetch;
  window.fetch = (u, o) => {
    u = String(u);
    const J = (d) => Promise.resolve(new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } }));
    if (u.startsWith('/api/jp-press') && o && o.method === 'DELETE') { window.__del.push(decodeURIComponent(u.split('id=')[1])); return J({ ok: true }); }
    if (u.startsWith('/api/jp-press') && o && o.method === 'POST') {
      const b = JSON.parse(o.body); window.__st.push(b.id + ':' + b.status);
      const it = press.filter((x) => x.id === b.id)[0];
      return J({ ok: true, item: Object.assign({}, it, { status: b.status }) });
    }
    if (u.startsWith('/api/jp-press')) return J({ ok: true, press: press });
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: [] });
    if (u.startsWith('/api/jp-tips')) return J({ ok: true, tips: [] });
    if (u.startsWith('/api/jp-assets')) return J({ ok: true, assets: [] });
    if (u.startsWith('/api/krjam-dcount')) return J({ ok: true, slots: [], approved: [] });
    if (u.startsWith('/api/jamboree-plan')) return J({ ok: true, slots: {}, types: [], events: [], ttcats: [], offtimes: {},
      marketing: [], contacts: [], divisions: [], protocol: [], mappos: {}, shoots: [], timetable: [], roster: [] });
    if (u.startsWith('/api/')) return J({ ok: true });
    return rf(u, o);
  };
};

async function boardPage(b, base, role) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  await p.evaluateOnNewDocument(SEED, PRESS, role);
  await p.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700);
  await p.evaluate(() => setView('press'));
  await wait(600);
  return p;
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = []; const base = `http://localhost:${PORT}`;

  // ── 서버: 단계 화이트리스트 ── 클라가 보내는 값과 서버가 받는 값이 어긋나면 조용히 초안이 된다
  console.log('\n[서버 — 단계 정규화]');
  const api = await import('../functions/api/jp-press.js');
  chk('단계 3종 정의', JSON.stringify(api.PRESS_STATUS) === JSON.stringify(['draft', 'reviewed', 'published']));
  chk('구 released → published 승격', api.cleanStatus('released') === 'published');
  chk('3종은 그대로 통과', ['draft', 'reviewed', 'published'].every((v) => api.cleanStatus(v) === v));
  chk('모르는 값은 초안으로', api.cleanStatus('hacked') === 'draft' && api.cleanStatus('') === 'draft' && api.cleanStatus(undefined) === 'draft');

  // ── 목록 ──
  console.log('\n[목록 — 게시판]');
  const p = await boardPage(b, base, 'admin');
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  chk('행 3개', await p.evaluate(() => document.querySelectorAll('#press-list tbody tr').length) === 3);
  chk('행마다 선택 체크박스', await p.evaluate(() => document.querySelectorAll('#press-list [data-press-ck]').length) === 3);
  chk('전체 선택 체크박스', await p.evaluate(() => !!document.getElementById('press-ckall')));
  chk('단계 칩 3종 표기', await p.evaluate(() =>
    [...document.querySelectorAll('.pst')].map((e) => e.textContent).join('|')) === '퍼블리싱 완료|초안|최종검수 완료');
  chk('구 released 가 퍼블리싱 완료로 보임', await p.evaluate(() =>
    document.querySelector('#press-list tbody tr .pst').textContent.trim()) === '퍼블리싱 완료');
  // 아코디언이 되살아나면 여기서 잡힌다
  chk('본문을 목록에 끼워 넣지 않음', await p.evaluate(() =>
    !document.querySelector('.news-detailrow') && !document.querySelector('[data-press-expand]')));

  // ── 읽기 모달 ──
  console.log('\n[읽기 모달]');
  await p.evaluate(() => document.querySelector('[data-press-view]').click());
  await wait(450);
  chk('제목 클릭 → 모달 열림', await p.evaluate(() =>
    document.getElementById('pressview-scrim').classList.contains('show')));
  chk('제목·본문·첨부·메타 표시', await p.evaluate(() => {
    const t = document.getElementById('pv-title').textContent;
    const body = document.getElementById('pv-body').innerHTML;
    return t === '개영식 보도자료' && /<b>서식<\/b>/.test(body) && /원문\.pdf/.test(body) && /연합뉴스/.test(body);
  }));
  chk('단계 버튼 3개 · 현재 단계 강조', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#pv-tools [data-pv-st]')];
    return bs.length === 3 && bs.find((x) => x.dataset.pvSt === 'published').className.includes('solid');
  }));
  await p.evaluate(() => document.querySelector('[data-pv-st="reviewed"]').click());
  await wait(400);
  chk('단계 변경이 서버로 전달', await p.evaluate(() => window.__st.join(',')) === 'p1:reviewed');
  chk('닫기 동작', await p.evaluate(() => {
    document.getElementById('pv-cancel').click();
    return !document.getElementById('pressview-scrim').classList.contains('show');
  }));

  // ── 다중 선택 · 일괄 ──
  console.log('\n[다중 선택 · 일괄 작업]');
  await p.evaluate(() => document.getElementById('press-ckall').click());
  await wait(400);
  chk('전체 선택 → 일괄 바 노출', await p.evaluate(() => {
    const bar = document.querySelector('.press-bulk');
    return !!bar && /3개 선택/.test(bar.textContent);
  }));
  chk('일괄 단계 버튼 3개 · 삭제 · 해제', await p.evaluate(() =>
    document.querySelectorAll('[data-press-bulk-st]').length === 3
    && !!document.querySelector('[data-press-bulk-del]') && !!document.querySelector('[data-press-selnone]')));
  await p.evaluate(() => { window.__st = []; document.querySelector('[data-press-bulk-st="published"]').click(); });
  await wait(600);
  chk('관리자는 3건 모두 일괄 변경', await p.evaluate(() => window.__st.length) === 3);
  chk('선택 해제', await p.evaluate(() => {
    document.querySelector('[data-press-selnone]').click();
    return !document.querySelector('.press-bulk');
  }));

  // ── 권한 ── 기사 권한은 있지만 관리자가 아닌 부원은 남의 글을 건드리지 못한다
  console.log('\n[권한 — 남의 글 제외]');
  const p2 = await boardPage(b, base, 'member');
  p2.on('pageerror', (e) => errors.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.evaluate(() => document.getElementById('press-ckall').click());
  await wait(400);
  await p2.evaluate(() => { window.__st = []; document.querySelector('[data-press-bulk-st="draft"]').click(); });
  await wait(600);
  chk('내 글 2건만 변경(남의 글 제외)', await p2.evaluate(() => window.__st.slice().sort().join(',')) === 'p1:draft,p2:draft');
  await p2.evaluate(() => { window.confirm = () => true; window.__del = []; document.querySelector('[data-press-bulk-del]').click(); });
  await wait(700);
  chk('일괄 삭제도 내 글 2건만', await p2.evaluate(() => window.__del.slice().sort().join(',')) === 'p1,p2');
  chk('삭제된 행만 목록에서 사라짐', await p2.evaluate(() =>
    document.querySelectorAll('#press-list tbody tr').length === 1));

  // ── 편집기 ──
  console.log('\n[작성 모달]');
  await p.evaluate(() => openPressEditor(null));
  await wait(500);
  chk('작성 모달 열림', await p.evaluate(() => document.getElementById('press-scrim').classList.contains('show')));
  chk('단계 선택 3종', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#pe-status [data-pst]')];
    return bs.length === 3 && bs.map((x) => x.dataset.pst).join(',') === 'draft,reviewed,published';
  }));
  chk('기본값은 초안', await p.evaluate(() =>
    document.querySelector('#pe-status [data-pst="draft"]').classList.contains('on')));

  console.log('\n[모바일 레이아웃 — 실측]');
  /* 표 머리(th)에 클래스를 안 주면 좁은 화면에서 td 만 숨겨져 열이 어긋나고 제목 칸이 눌린다.
     v0.9.249 배포분이 실제로 그 상태였다(v0.9.250 에서 머리에도 같은 클래스를 줬다). */
  const pm = await b.newPage();
  await pm.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await pm.evaluateOnNewDocument(SEED, PRESS, 'admin');
  await pm.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700); await pm.evaluate(() => setView('press')); await wait(600);
  const mo = await pm.evaluate(async () => {
    const vis = (el) => getComputedStyle(el).display !== 'none';
    const ths = [...document.querySelectorAll('#press-list thead th')].filter(vis).length;
    const tds = [...document.querySelectorAll('#press-list tbody tr:first-child td')].filter(vis).length;
    const sc = document.querySelector('#press-list .tblscroll');
    const title = document.querySelector('#press-list td.nr-title').getBoundingClientRect().width;
    document.querySelector('[data-press-view]').click(); await new Promise((r) => setTimeout(r, 400));
    const modal = document.querySelector('#pressview-scrim .modal').getBoundingClientRect();
    const out = [...document.querySelectorAll('#pressview-scrim .mfoot button')]
      .filter((x) => x.getBoundingClientRect().right > modal.right + 1 || x.getBoundingClientRect().left < modal.left - 1)
      .map((x) => x.textContent.trim());
    return { ths, tds, over: sc.scrollWidth - sc.clientWidth, title: Math.round(title), out,
      docOver: document.documentElement.scrollWidth - window.innerWidth };
  });
  chk('표 머리와 몸통의 열 수가 같음(열 어긋남 없음)', mo.ths === mo.tds, 'th=' + mo.ths + ' td=' + mo.tds);
  chk('표가 가로로 넘치지 않음', mo.over <= 0, mo.over + 'px 넘침');
  chk('제목 칸이 눌리지 않음(120px 이상)', mo.title >= 120, mo.title + 'px');
  chk('읽기 모달 바닥 버튼이 모달 밖으로 나가지 않음', mo.out.length === 0, mo.out.join(' | '));
  chk('페이지 가로 스크롤 없음', mo.docOver <= 0, mo.docOver + 'px');
  await pm.close();

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
