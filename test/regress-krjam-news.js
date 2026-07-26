/* 홍보부원 기사 게시판 회귀 (v0.9.250)
   기사 탭을 아코디언 → 게시판으로 바꾼 계약을 지킨다.
     · 작성 입력 순서: 제목 → 부제목 → 내용 → 사진 → 태그 (사용자가 정한 순서)
     · 단계 3종(초안 · 최종검수 완료 · 퍼블리싱 완료). 구 published(boolean) 는 서버가 유도
     · 목록은 표만 — 본문은 모달로 연다 · 다중 선택 + 일괄 단계/삭제
   ⚠️ 부제목·태그·단계는 서버 화이트리스트에도 있어야 한다(없으면 저장 때 조용히 사라진다).
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-news.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8895;
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

const NEWS = [
  { id: 'n1', title: '개영식 현장', subtitle: '첫날 밤의 기록', body: '<p>본문 <b>서식</b></p>',
    images: ['/jamboree/assets/logo.png'], tags: ['개영식', '현장'], stage: 'published', cardnewsDone: true,
    author: 'jimmy', authorName: '박지민', createdAt: '2026-07-01T10:00:00Z',
    comments: [{ id: 'c1', username: 'jimmy', author: '박지민', text: '사진 교체 바랍니다', ts: '2026-07-02T01:00:00Z' }] },
  { id: 'n2', title: '과정활동 스케치', subtitle: '', body: '두 번째', images: [], tags: [], stage: 'draft',
    author: 'jimmy', authorName: '박지민', createdAt: '2026-07-02T10:00:00Z', comments: [] },
  { id: 'n3', title: '남이 쓴 기사', subtitle: '', body: '세 번째', images: [], tags: ['분단'], stage: 'reviewed',
    author: 'other', authorName: '남', createdAt: '2026-07-03T10:00:00Z', comments: [] },
];
const SEED = function (news, role) {
  localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: role, type: '홍보부', tabs: [], exp: Date.now() + 9e6 }));
  localStorage.setItem('jamboree-plan:view', 'news');
  window.__del = []; window.__flag = []; window.__save = null;
  const rf = window.fetch;
  window.fetch = (u, o) => {
    u = String(u);
    const J = (d) => Promise.resolve(new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } }));
    if (u.startsWith('/api/jp-news') && o && o.method === 'DELETE') { window.__del.push(decodeURIComponent(u.split('id=')[1])); return J({ ok: true }); }
    if (u.startsWith('/api/jp-news') && o && (o.method === 'POST' || o.method === 'PUT')) {
      const bb = JSON.parse(o.body);
      if (bb.action === 'flags') { window.__flag.push(bb.id + ':' + bb.stage); return J({ ok: true }); }
      window.__save = bb; return J({ ok: true, item: bb });
    }
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: news });
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-press')) return J({ ok: true, press: [] });
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
  await p.evaluateOnNewDocument(SEED, NEWS, role);
  await p.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700); await p.evaluate(() => setView('news')); await wait(600);
  return p;
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = []; const base = `http://localhost:${PORT}`;

  console.log('\n[서버 — 단계·필드 화이트리스트]');
  const api = await import('../functions/api/jp-news.js');
  chk('단계 3종 정의', JSON.stringify(api.NEWS_STAGES) === JSON.stringify(['draft', 'reviewed', 'published']));
  chk('3종은 그대로 통과', ['draft', 'reviewed', 'published'].every((v) => api.cleanStage(v, null) === v));
  chk('구 published:true → 퍼블리싱 완료 유도', api.cleanStage('', { published: true }) === 'published');
  chk('구 published:false → 초안 유도', api.cleanStage('', { published: false }) === 'draft');
  chk('모르는 값은 초안으로', api.cleanStage('hacked', null) === 'draft');
  const src = fs.readFileSync(path.join(ROOT, 'functions/api/jp-news.js'), 'utf8');
  chk('부제목·태그가 서버 저장 경로에 있음', /rec\.subtitle\s*=/.test(src) && /rec\.tags\s*=/.test(src) && /subtitle:\s*String/.test(src));
  // 안 보낸 필드를 지우면, 다른 화면의 저장 한 번에 부제목·태그가 통째로 날아간다
  chk('PUT 은 안 보낸 부제목·태그를 지우지 않음', /if \(body\.subtitle !== undefined\)/.test(src) && /if \(body\.tags !== undefined\)/.test(src));

  console.log('\n[목록 — 게시판]');
  const p = await boardPage(b, base, 'admin');
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  chk('행 3개 + 선택 체크박스', await p.evaluate(() =>
    document.querySelectorAll('#news-list tbody tr').length === 3 && document.querySelectorAll('[data-news-ck]').length === 3 && !!document.getElementById('news-ckall')));
  chk('단계 칩 3종', await p.evaluate(() =>
    [...document.querySelectorAll('#news-list .pst')].map((e) => e.textContent).join('|')) === '퍼블리싱 완료|초안|최종검수 완료');
  chk('본문을 목록에 끼워 넣지 않음', await p.evaluate(() =>
    !document.querySelector('.news-detailrow') && !document.querySelector('[data-news-expand]')));
  chk('목록에 부제목·태그 표기', await p.evaluate(() => {
    const row = document.querySelector('#news-list tbody tr');
    return !!row.querySelector('.nr-sub') && !!row.querySelector('.nr-tags');
  }));

  console.log('\n[작성 모달 — 입력 순서]');
  await p.evaluate(() => openNewsEditor(null)); await wait(500);
  chk('제목 → 부제목 → 내용 → 사진 → 태그 순', await p.evaluate(() =>
    [...document.querySelectorAll('#news-body .fl')].map((e) => e.textContent.split('(')[0].trim()).join('>')) === '제목>부제목>내용>사진>태그>단계');
  chk('부제목·태그 입력칸 존재', await p.evaluate(() =>
    !!document.getElementById('news-subtitle') && !!document.getElementById('news-taginput')));
  chk('태그는 Enter 로 칩이 된다', await p.evaluate(() => {
    const ip = document.getElementById('news-taginput');
    ip.value = '개영식'; ip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return document.querySelectorAll('#news-tagsec .news-tag').length === 1;
  }));
  chk('태그 중복은 안 들어간다', await p.evaluate(() => {
    const ip = document.getElementById('news-taginput');
    ip.value = '개영식'; ip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return document.querySelectorAll('#news-tagsec .news-tag').length === 1;
  }));
  chk('단계 선택 3종 · 기본 초안', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#news-stage [data-nst]')];
    return bs.length === 3 && bs.map((x) => x.dataset.nst).join(',') === 'draft,reviewed,published'
      && document.querySelector('#news-stage [data-nst="draft"]').classList.contains('on');
  }));
  chk('저장 payload 에 부제목·태그·단계가 실린다', await p.evaluate(async () => {
    document.getElementById('news-title').value = '새 기사';
    document.getElementById('news-title').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('news-subtitle').value = '부제 테스트';
    document.getElementById('news-subtitle').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#news-stage [data-nst="reviewed"]').click();
    newsEdit.body = '<p>본문</p>';
    commitNews(); await new Promise((r) => setTimeout(r, 250));
    const s = window.__save;
    return !!s && s.title === '새 기사' && s.subtitle === '부제 테스트' && s.stage === 'reviewed' && Array.isArray(s.tags) && s.tags[0] === '개영식';
  }));

  console.log('\n[읽기 모달]');
  await p.evaluate(() => { closeNewsEditor(); document.querySelector('[data-news-view]').click(); });
  await wait(500);
  chk('제목 클릭 → 모달', await p.evaluate(() => document.getElementById('newsview-scrim').classList.contains('show')));
  chk('부제목·본문·사진·태그 표시', await p.evaluate(() => {
    const body = document.getElementById('nv-body');
    return /첫날 밤의 기록/.test(body.textContent) && !!body.querySelector('.news-text b')
      && !!body.querySelector('.nv-img') && /#개영식/.test(body.textContent);
  }));
  chk('검수 코멘트가 모달에 살아 있음(등록칸 포함)', await p.evaluate(() => {
    const body = document.getElementById('nv-body');
    return /검수 코멘트 1/.test(body.textContent) && /사진 교체 바랍니다/.test(body.textContent)
      && !!body.querySelector('[data-ac-input]') && !!body.querySelector('[data-ac-send]');
  }));
  chk('카드뉴스 만들기 버튼 유지', await p.evaluate(() => !!document.querySelector('#nv-tools [data-news-tocard]')));
  chk('단계 버튼 3개 · 현재 단계 강조', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#nv-tools [data-nv-st]')];
    return bs.length === 3 && bs.find((x) => x.dataset.nvSt === 'published').className.includes('solid');
  }));
  await p.evaluate(() => document.querySelector('[data-nv-st="draft"]').click()); await wait(400);
  chk('단계 변경이 서버로', await p.evaluate(() => window.__flag.join(',')) === 'n1:draft');
  chk('삭제하면 열려 있던 모달이 닫힌다', await p.evaluate(async () => {
    window.confirm = () => true;
    document.getElementById('nv-del').click();
    await new Promise((r) => setTimeout(r, 500));
    return !document.getElementById('newsview-scrim').classList.contains('show');
  }));
  await p.evaluate(() => closeNewsView()); await wait(250);

  console.log('\n[다중 선택 · 일괄]');
  await p.evaluate(() => document.getElementById('news-ckall').click()); await wait(400);
  chk('전체 선택 → 일괄 바', await p.evaluate(() => {
    const bar = document.querySelector('.press-bulk');
    return !!bar && /3개 선택/.test(bar.textContent) && document.querySelectorAll('[data-news-bulk-st]').length === 3;
  }));
  await p.evaluate(() => { window.__flag = []; document.querySelector('[data-news-bulk-st="published"]').click(); });
  await wait(600);
  chk('관리자는 3건 일괄 변경', await p.evaluate(() => window.__flag.length) === 3);
  await p.evaluate(() => { window.confirm = () => true; window.__del = []; document.querySelector('[data-news-bulk-del]').click(); });
  await wait(700);
  chk('일괄 삭제 3건 · 목록 비움', await p.evaluate(() =>
    window.__del.length === 3 && document.querySelectorAll('#news-list tbody tr').length === 0));

  console.log('\n[권한 — 삭제는 관리자만]');
  const p2 = await boardPage(b, base, 'member');
  p2.on('pageerror', (e) => errors.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.evaluate(() => document.getElementById('news-ckall').click()); await wait(400);
  await p2.evaluate(() => { window.confirm = () => true; window.__del = []; document.querySelector('[data-news-bulk-del]').click(); });
  await wait(600);
  chk('부원은 일괄 삭제 불가(호출 0건)', await p2.evaluate(() => window.__del.length) === 0);
  chk('부원도 목록·모달은 그대로 본다', await p2.evaluate(() =>
    document.querySelectorAll('#news-list tbody tr').length === 3));

  console.log('\n[접근성 — 새로 만든 UI 실측]');
  /* 본 회귀의 타이포 스윕은 '화면'만 훑고 모달 안은 못 본다. 새로 만든 두 모달과 칩·체크박스를
     여기서 직접 잰다(글자 >=13px · 조작 요소 >=40px). 표 안 체크박스는 셀 컨트롤이라 18px 이상만 본다. */
  const p3 = await boardPage(b, base, 'admin');
  const a11y = await p3.evaluate(async () => {
    const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
      const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1; };
    const scan = (root) => {
      const small = [], tap = [];
      root.querySelectorAll('*').forEach((el) => {
        if (!vis(el)) return;
        const cs = getComputedStyle(el);
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
        if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
        const r = el.getBoundingClientRect();
        // 겹쳐 놓는 micro 컨트롤(태그 x · 모달 닫기 x · 코멘트 삭제 x)은 40px 를 주면 대상을 덮는다.
        // 대신 터치 기기에서는 누르는 면만 40px 로 넓힌다(styles.css @media (pointer:coarse)) — 아래 터치 검사가 지킨다.
        // ttb(서식 도구)는 마우스 화면에서 24개가 40px 이 되면 도구줄이 본문보다 커진다 → 터치에서만 40px.
        const MICRO = ['news-tagx', 'x', 'ac-del', 'ttb'];
        if (el.tagName === 'BUTTON' && !MICRO.some((c) => el.classList.contains(c)) && r.height < 40)
          tap.push(Math.round(r.height) + 'px ' + (el.className || el.tagName));
        if (el.tagName === 'INPUT' && el.type === 'text' && r.height < 40) tap.push(Math.round(r.height) + 'px input');
        if (el.tagName === 'INPUT' && el.type === 'checkbox' && Math.min(r.height, r.width) < 18)
          tap.push(Math.round(r.height) + 'px checkbox');
      });
      return { small: [...new Set(small)], tap: [...new Set(tap)] };
    };
    const out = { list: scan(document.getElementById('news-list')) };
    document.querySelector('[data-news-view]').click(); await new Promise((r) => setTimeout(r, 350));
    out.view = scan(document.querySelector('#newsview-scrim .modal'));
    closeNewsView(); openNewsEditor(null); await new Promise((r) => setTimeout(r, 350));
    const ip = document.getElementById('news-taginput');
    ip.value = '개영식'; ip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    out.edit = scan(document.querySelector('#news-scrim .modal'));
    return out;
  });
  for (const [k, label] of [['list', '목록'], ['view', '읽기 모달'], ['edit', '작성 모달']]) {
    chk(label + ' 글자 13px 이상', a11y[k].small.length === 0, a11y[k].small.slice(0, 4).join(' | '));
    chk(label + ' 조작 요소 크기', a11y[k].tap.length === 0, a11y[k].tap.slice(0, 4).join(' | '));
  }
  await p3.close();

  // 터치 기기 — 손가락으로 누르는 면이 실제로 40px 인지(서식 도구 · 코멘트 삭제 x)
  const p4 = await b.newPage();
  await p4.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p4.evaluateOnNewDocument(SEED, NEWS, 'admin');
  await p4.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700); await p4.evaluate(() => setView('news')); await wait(600);
  const touch = await p4.evaluate(async () => {
    const box = (el) => { const r = el.getBoundingClientRect(); return Math.min(r.height, r.width); };
    document.querySelector('[data-news-view]').click(); await new Promise((r) => setTimeout(r, 350));
    const acdel = document.querySelector('#nv-body .ac-del');
    const ac = acdel ? Math.round(box(acdel)) : 0;
    closeNewsView(); openNewsEditor(null); await new Promise((r) => setTimeout(r, 500));
    const tt = [...document.querySelectorAll('#news-scrim .ttb')].map((e) => Math.round(e.getBoundingClientRect().height));
    return { ac, ttbMin: tt.length ? Math.min(...tt) : 0, ttbN: tt.length };
  });
  chk('터치: 서식 도구 40px 이상', touch.ttbN > 0 && touch.ttbMin >= 40, touch.ttbMin + 'px × ' + touch.ttbN + '개');
  chk('터치: 검수 코멘트 삭제 누르는 면 40px 이상', touch.ac >= 40, touch.ac + 'px');
  await p4.close();

  console.log('\n[모바일 레이아웃 — 실측]');
  /* 표 머리(th)에 클래스를 안 주면 좁은 화면에서 td 만 숨겨져 열이 어긋난다.
     그러면 제목 칸이 눌려 글자가 세로로 서고, 표가 화면 밖으로 넘친다(실제로 그렇게 깨졌다). */
  const p5 = await b.newPage();
  await p5.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p5.evaluateOnNewDocument(SEED, NEWS, 'admin');
  await p5.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700); await p5.evaluate(() => setView('news')); await wait(600);
  const mo = await p5.evaluate(async () => {
    const vis = (el) => getComputedStyle(el).display !== 'none';
    const ths = [...document.querySelectorAll('#news-list thead th')].filter(vis).length;
    const tds = [...document.querySelectorAll('#news-list tbody tr:first-child td')].filter(vis).length;
    const sc = document.querySelector('#news-list .tblscroll');
    const title = document.querySelector('#news-list td.nr-title').getBoundingClientRect().width;
    document.querySelector('[data-news-view]').click(); await new Promise((r) => setTimeout(r, 400));
    const modal = document.querySelector('#newsview-scrim .modal').getBoundingClientRect();
    const out = [...document.querySelectorAll('#newsview-scrim .mfoot button')]
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
  await p5.close();

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
