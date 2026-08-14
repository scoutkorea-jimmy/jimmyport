/* krjam-planning 회귀 스위트 — 리팩터링 전/후 동작 동일성 고정용.
 * 로컬 http + 실제 Chrome, /api/* 전부 목업(운영 KV 무접촉).
 * 리팩터링 각 단계마다 실행 → 결과가 baseline 과 같아야 한다. */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8801;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-planning') p = '/krjam-planning.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const R = [];
const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d !== undefined && d !== '' ? ' — ' + d : '')); };

const SEED = () => {
  localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '테스터', username: 'tester', role: 'admin', type: '홍보부', tabs: [], exp: Date.now() + 9e6 }));
  localStorage.setItem('jamboree-plan:ttmode', 'day');
  localStorage.setItem('jamboree-plan:ttday', '2026-08-05');
  localStorage.removeItem('jamboree-plan:show-empty');
  localStorage.setItem('jamboree-plan:board-sort', 'date');
  window.__put = []; window.__tipPatch = []; window.__r2 = { creates: 0, parts: [], completed: null, aborted: 0 };
  window.__tip0 = { id: 'tip1', reporterName: '정성윤', phone: '01035520587', org: '국제본부', zone: 'food',
    text: 'IST Culture Night 취재 바랍니다', photos: [], status: 'new', assignee: '', source: 'public',
    date: '2026-08-05', time: '20:00', scheduled: null, createdAt: '2026-07-14T06:27:00Z' };
  window.__news0 = { id: 'n1', title: '개영식 현장 스케치', body: '<p>현장 <strong>스케치</strong> 기사입니다.</p>', images: ['/api/image?id=ni1'],
    author: 'tester', authorName: '테스터', published: false, cardnewsDone: false, comments: [],
    createdAt: '2026-07-14T02:00:00Z', updatedAt: '2026-07-14T02:00:00Z' };
  window.__press0 = { id: 'p1', title: '제16회 한국잼버리 개영 보도자료', body: '<p>개영식 <strong>보도자료</strong> 본문.</p>',
    date: '2026-08-05', contact: '박지민', outlets: '연합뉴스, KBS', status: 'draft',
    attachments: [{ name: '개영식_보도자료.pdf', url: '/api/file?id=pf1', ct: 'application/pdf', size: 120000 }],
    author: 'tester', authorName: '테스터', createdAt: '2026-07-14T03:00:00Z', updatedAt: '2026-07-14T03:00:00Z' };
  window.__assets = [
    { id: 'a1', url: '/api/file?id=f1', kind: 'file', name: '브랜드 가이드라인', type: 'photo', category: 'plan', ct: 'application/pdf', size: 3348000, tags: ['브랜드'], author: 'admin', authorName: '관리자', createdAt: '2026-07-13T07:07:00Z' },
    { id: 'a2', url: '/api/image?id=i1', kind: 'file', name: '개영식 사진', type: 'photo', category: 'photo', ct: 'image/jpeg', size: 820000, tags: [], author: 'admin', authorName: '관리자', createdAt: '2026-07-12T05:00:00Z' },
    { id: 'a3', kind: 'text', name: '8월 촬영 유의사항', category: 'notice', body: '<p><strong>안전</strong>을 최우선으로.</p><ul><li>초상권 동의</li></ul>', tags: ['공지'], author: 'admin', authorName: '관리자', createdAt: '2026-07-14T01:00:00Z', updatedAt: '2026-07-14T01:00:00Z' },
    { id: 'a4', url: '/api/file?id=f2', kind: 'file', name: '개영식 현장음', type: 'photo', category: 'reference', ct: 'audio/mpeg', size: 4200000, tags: [], author: 'admin', authorName: '관리자', createdAt: '2026-07-11T05:00:00Z' },
  ];
  const rf = window.fetch;
  window.fetch = (u, o) => {
    u = String(u && u.url ? u.url : u);
    const J = (d, s) => Promise.resolve(new Response(JSON.stringify(d), { status: s || 200, headers: { 'content-type': 'application/json' } }));
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-news')) {
      if (o && o.method === 'POST') { const b = JSON.parse(o.body || '{}');
        if (b.action === 'flags') { if (typeof b.stage === 'string') window.__news0.stage = b.stage; if (typeof b.published === 'boolean') window.__news0.published = b.published; if (typeof b.cardnewsDone === 'boolean') window.__news0.cardnewsDone = b.cardnewsDone; window.__newsFlag = b; return J({ ok: true, article: window.__news0 }); }
        return J({ ok: true, article: window.__news0 }); }
      if (o && (o.method === 'PUT' || o.method === 'DELETE')) return J({ ok: true, article: window.__news0 });
      return J({ ok: true, articles: [window.__news0] });
    }
    if (u.startsWith('/api/jp-assets')) {
      if (o && o.method === 'DELETE') return J({ ok: true });
      if (o && (o.method === 'POST' || o.method === 'PATCH')) { const b = JSON.parse(o.body || '{}'); window.__assetSave = b;
        if (b.kind === 'text' || b.body != null) return J({ ok: true, asset: { id: b.id || 'newtext', kind: 'text', name: b.name, category: b.category, body: b.body, tags: b.tags || [], authorName: '관리자', createdAt: '2026-07-15T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z' } });
        return J({ ok: true, asset: { id: 'new', kind: 'file', url: '/api/file?id=n', name: 'n', category: 'plan', ct: 'application/pdf', tags: [], authorName: '관리자', createdAt: '2026-07-15T00:00:00Z' } }); }
      return J({ ok: true, assets: window.__assets });
    }
    if (u.startsWith('/api/jp-tips')) { if (o && o.method === 'PATCH') { const b = JSON.parse(o.body); window.__tipPatch.push(b); return J({ ok: true, tip: Object.assign({}, window.__tip0, b) }); } return J({ ok: true, tips: [window.__tip0] }); }
    if (u.startsWith('/api/jp-press')) {
      if (o && o.method === 'DELETE') return J({ ok: true });
      if (o && (o.method === 'POST' || o.method === 'PUT')) { const b = JSON.parse(o.body || '{}'); window.__pressSave = b;
        if (b.action === 'status') { window.__press0.status = b.status; return J({ ok: true, item: window.__press0 }); }
        return J({ ok: true, item: Object.assign({ id: b.id || 'newpress', author: 'tester', authorName: '테스터', createdAt: '2026-07-15T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z' }, b) }); }
      return J({ ok: true, press: [window.__press0] });
    }
    if (u.startsWith('/api/r2?action=create')) { window.__r2.creates++; return J({ ok: true, key: 'jpa/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', uploadId: 'U1' }); }
    if (u.startsWith('/api/r2?action=part')) { const n = +new URL(u, location.origin).searchParams.get('part');
      return Promise.resolve(o.body.arrayBuffer()).then((b) => { window.__r2.parts.push(b.byteLength); return J({ ok: true, partNumber: n, etag: 'e' + n }); }); }
    if (u.startsWith('/api/r2?action=complete')) { window.__r2.completed = JSON.parse(o.body); return J({ ok: true, url: '/api/r2?id=k', name: 'f', ct: 'application/pdf', size: 1 }); }
    if (u.startsWith('/api/r2?action=abort')) { window.__r2.aborted++; return J({ ok: true }); }
    if (u.startsWith('/api/image') || u.startsWith('/api/file')) return J({ ok: true, url: '/api/file?id=x', name: 'f', ct: 'application/pdf' });
    if (u.startsWith('/api/jamboree-plan')) {
      if (o && o.method === 'PUT') { window.__put.push(JSON.parse(o.body));
        if (window.__failPut) return Promise.reject(new TypeError('Failed to fetch'));   // 저장 실패 재현용 스위치
        return J({ ok: true }); }
      return J({ ok: true, versions: { timetable: 'V1', roster: 'V1', contacts: 'V1', divisions: 'V1', protocol: 'V1', ttcats: 'V1', events: 'V1', types: 'V1', marketing: 'V1', meals: 'V1', shootlist: 'V1', mappos: 'V1', offtimes: 'V1', shoots: 'V1' },
        types: [], marketing: [], contacts: [], divisions: [], mappos: {}, shoots: [], ttcats: [], offtimes: {},
        // ⚠️ versions 에 도메인이 있으면 = '이미 저장된 보드' → v0.9.232 부터 시드를 다시 주입하지 않는다.
        //    그러므로 목업도 실제 라이브 보드처럼 **시드를 이미 담고 있는** 상태로 돌려줘야 한다.
        //    (이 fetch 훅은 app.js 로드 후에 불리므로 앱의 시드 함수를 그대로 쓸 수 있다.)
        events: [],        // 사용자가 회의 시드를 지운 보드 — 되살아나면 안 된다(아래 회귀)
        protocol: [{ id: 'usr-pr1', role: '대회장', name: '홍길동', title: '총재', date: '2026-08-05', time: '20:00', endTime: '21:30', activity: '개영식 인사말', place: '대집회장', memo: '', assignees: [] }],
        roster: [{ id: 'r1', name: '김기자', role: '취재', team: 't1' }, { id: 'r2', name: '이사진', role: '사진', team: 't2' }],
        timetable: [
          { id: 't1', day: '2026-08-05', start: '20:00', end: '21:30', title: '개영식', place: '메인무대', zone: 'stage', cat: '개·폐영식', assignees: ['r1'], contacts: [], rundown: [{ time: '20:00', title: '개회 선언', note: '' }], noCover: false },
          { id: 't2', day: '2026-08-05', start: '12:00', end: '13:00', title: '중식', place: '급식소', zone: 'food', cat: '식사', assignees: [], contacts: [], rundown: [], noCover: true },
          { id: 't3', day: '2026-08-06', start: '09:00', end: '10:00', title: '분단 회의', place: 'JHQ 본부', zone: 'jhq', cat: '회의', assignees: ['r2'], contacts: [], rundown: [], noCover: false },
        ].concat(typeof cubObserverSeeds === 'function' ? cubObserverSeeds() : [],
                 typeof superstarJSeeds === 'function' ? superstarJSeeds() : []),
        slots: {
          '2026-07-20#extra#c1': { edit: { title: '가나 대표단 소개', status: 'planned', owner: '박지민', due: '2026-07-25', channels: ['페이스북'] } },
          '2026-07-21#extra#c2': { edit: { title: '나이지리아 대표단', status: 'draft', owner: '김철수', channels: ['인스타그램'] } },
          '2026-07-22#extra#c3': { edit: { title: '다낭 서브캠프', status: 'ready', owner: '이영희', posted: true, channels: ['유튜브'] } },
          '2026-07-23#extra#c4': { edit: { title: 'D-Counter | D-50', status: 'planned' } },
          '2026-07-01#dcount': { edit: { title: 'D-Day 콘텐츠(숨겨져야 함)', status: 'planned' } },
        } });
    }
    if (u.startsWith('/api/')) return J({ ok: true });
    return rf(u, o);
  };
};

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.evaluateOnNewDocument(SEED);
  await page.goto(`http://localhost:${PORT}/krjam-planning`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.side-item', { timeout: 10000 });

  // 2단 내비게이션: 뷰 전환은 setView 로 직접(세부탭은 활성 공간에서만 보이므로) — 이 스위트는 뷰 동작 검증이 목적
  const go = async (v) => { await page.evaluate((x) => setView(x), v); await new Promise((r) => setTimeout(r, 250)); };

  // 시드 재주입 금지(v0.9.232) 검증은 **부팅 직후 상태**를 봐야 한다 — 뒤쪽 의전·캘린더 테스트가
  // state.protocol/events 를 자기 픽스처로 덮어쓰므로, 로드 결과를 여기서 찍어 두고 아래에서 단언한다.
  const bootSnap = await page.evaluate(() => ({
    stored: domainStored('timetable') && domainStored('events') && domainStored('protocol'),
    fresh: domainStored('nosuchdomain'),
    events: (state.events || []).length,
    protoUser: (state.protocol || []).filter((p) => p.id === 'usr-pr1').length,
    protoSeed: (state.protocol || []).filter((p) => /^prot-\d/.test(p.id)).length,
  }));

  console.log('\n[부팅 · 탭]');
  chk('게이트 통과 · 사이드바 렌더', await page.$('.side-nav') !== null);
  // 사이드바 = 4공간이 접히지 않고 모두 펼쳐진다(항목 14개). 목록의 원본은 app.js 의 WS_LIST/WS_VIEWS 하나뿐.
  const sg = await page.evaluate(() => ({ grp: document.querySelectorAll('.side-grp').length, item: document.querySelectorAll('.side-item[data-v]').length }));
  chk('사이드바 4그룹 · 15항목 전부 노출(보도자료 포함)', sg.grp === 4 && sg.item === 15, sg.grp + '그룹 · ' + sg.item + '항목');

  console.log('\n[콘텐츠 파이프라인 보드]');
  await go('list');
  const b = await page.evaluate(() => ({
    cards: document.querySelectorAll('#board .card:not(.card-inbox)').length,
    cols: document.querySelectorAll('#board .col').length,
    inbox: document.querySelectorAll('#board .col-inbox .card-inbox').length,
    stages: [...document.querySelectorAll('#board .col:not(.col-inbox)')].map((c) => c.getAttribute('data-st')).join(','),
    toggle: document.getElementById('toggle-empty').textContent, sorts: document.querySelectorAll('#board-sort [data-bsort]').length,
    filtersHidden: document.getElementById('filters').style.display === 'none',
    mseg: document.querySelectorAll('#board-mseg button').length }));
  chk('파이프라인 5칼럼(인박스+기획·작성·검수·완료)', b.cols === 5 && b.stages === 'planned,draft,review,done', b.cols + '칼럼 · ' + b.stages);
  chk('제보 인박스 카드(홍보부 · 새 제보 1)', b.inbox === 1, b.inbox + '건');
  chk('모바일 단계 세그먼트 5', b.mseg === 5, b.mseg + '개');
  chk('실제 콘텐츠 3장(extra 슬롯)', b.cards === 3, b.cards + '장');
  const ddayHide = await page.evaluate(() => {
    const titles = [...document.querySelectorAll('#board .card .ctitle')].map((x) => x.textContent);
    return { hasDcountSlot: titles.some((t) => /D-Day 콘텐츠/.test(t)), hasDcountTitle: titles.some((t) => /D-Counter/.test(t)), hasNormal: titles.some((t) => /가나 대표단/.test(t)) };
  });
  chk('D-Day(dcount) 빈 슬롯 + 제목 D-count 카드 숨김 · 일반 콘텐츠 유지',
    !ddayHide.hasDcountSlot && !ddayHide.hasDcountTitle && ddayHide.hasNormal, JSON.stringify(ddayHide));
  chk('정렬 4종 · 필터바 접힘', b.sorts === 4 && b.filtersHidden);
  const dnd = await page.evaluate(() => {
    const c = document.querySelector('#board .col[data-st="planned"] .card'); const t0 = c.querySelector('.ctitle').textContent.trim();
    const tgt = document.querySelector('#board .col[data-st="done"]'); const dt = new DataTransfer();
    c.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    return [...document.querySelectorAll('#board .col[data-st="done"] .ctitle')].map((x) => x.textContent.trim()).includes(t0);
  });
  chk('드래그로 단계 이동(기획→완료)', dnd === true);

  console.log('\n[캘린더]');
  await go('calendar');
  chk('캘린더 셀 렌더', (await page.$$('#calendar .cell')).length > 40, (await page.$$('#calendar .cell')).length + '칸');

  console.log('\n[일정표]');
  await go('timetable');
  const tt = await page.evaluate(() => ({
    evs: document.querySelectorAll('.ttg-ev[data-id]').length,
    cub: [...document.querySelectorAll('.ttg-ev[data-id]')].filter((x) => /^cub-/.test(x.getAttribute('data-id'))).length,
    t1: !!document.querySelector('.ttg-ev[data-id="t1"]'), t2: !!document.querySelector('.ttg-ev[data-id="t2"]'),
    nocover: document.querySelectorAll('.ttg-ev.nocover').length,
    nctag: !!document.querySelector('.ttg-ev[data-id="t2"] .nctag'),
    cov: document.querySelectorAll('.ttg-cov').length,
    rd: document.querySelectorAll('.ttg-ev[data-id="t1"] .ttg-rd-row').length,
    who: (document.querySelector('.ttg-ev[data-id="t1"] .ttg-evp') || {}).textContent || '',
    bg: getComputedStyle(document.querySelector('.ttg-ev[data-id="t2"]')).backgroundColor,
    t1bg: getComputedStyle(document.querySelector('.ttg-ev[data-id="t1"]')).backgroundColor,
    top: document.querySelector('.ttg-ev[data-id="t1"]').style.top,
    height: document.querySelector('.ttg-ev[data-id="t1"]').style.height,
  }));
  chk('8/5 t1·t2 렌더 + 컵 1기 5건(등록·과정·저녁·개영·취침)', tt.t1 && tt.t2 && tt.cub === 5, 't1·t2 + 컵 ' + tt.cub + '건/총 ' + tt.evs);
  chk('취재 불필요(t2) 회색 · 배지', tt.nocover === 1 && tt.nctag);
  // 취재 불필요 = 저채도 비활성 블록. 라이트=고명도 회색 / 다크=저명도 회색 둘 다 통과하도록 채도로 검사.
  chk('취재 불필요 배경 = 저채도 회색(비활성)', (() => { const m = (tt.bg.match(/\d+/g) || []).map(Number); if (m.length < 3) return false; return Math.max(m[0], m[1], m[2]) - Math.min(m[0], m[1], m[2]) <= 16; })(), tt.bg);
  chk('일반 일정(t1) 은 카테고리색 유지', !/237, 239, 240/.test(tt.t1bg), tt.t1bg);
  chk('취재 토글 = 편집 블록마다(=총 블록수)', tt.cov === tt.evs && tt.evs >= 2, tt.cov + '/' + tt.evs);
  chk('식순 인라인(일간뷰) 1행', tt.rd === 1, tt.rd + '행');
  chk('담당 인원 표기', /김기자/.test(tt.who), tt.who.trim());
  // 20:00 × TT_HH_DAY(96px/h) = 1920 · 1.5h × 96 − 3(gap) = 141.
  // 값의 출처는 app.js 의 TT_HH_DAY 다 — v0.9.210 에서 84→96 으로 올렸다(13px 바닥을 지키려면 행이 함께 커져야 한다).
  // 이 수치를 고칠 일이 생기면 먼저 TT_HH_* 가 왜 바뀌었는지 확인할 것: 좌표는 파생값이지 상수가 아니다.
  chk('블록 좌표 계산(top/height)', tt.top === '1920px' && tt.height === '141px', tt.top + ' / ' + tt.height);

  // 취재 불필요 토글 (hover 후 클릭)
  await page.hover('.ttg-ev[data-id="t1"]');
  await page.click('.ttg-ev[data-id="t1"] .ttg-cov');
  await new Promise((r) => setTimeout(r, 700));
  const tog = await page.evaluate(() => { const p = window.__put.filter((x) => x.timetable).pop(); return { cls: document.querySelector('.ttg-ev[data-id="t1"]').className, saved: p.timetable.filter((x) => x.id === 't1')[0].noCover }; });
  chk('토글 → .nocover + 서버 저장', /nocover/.test(tog.cls) && tog.saved === true);
  await page.hover('.ttg-ev[data-id="t1"]'); await page.click('.ttg-ev[data-id="t1"] .ttg-cov'); await new Promise((r) => setTimeout(r, 700));
  chk('재토글 → 해제', !/nocover/.test(await page.evaluate(() => document.querySelector('.ttg-ev[data-id="t1"]').className)));

  // 모달
  await page.evaluate(() => openTT('t1'));
  await new Promise((r) => setTimeout(r, 200));
  const m = await page.evaluate(() => ({ title: document.getElementById('tt-f-title').value, nc: !!document.getElementById('tt-f-nocover'),
    zone: document.getElementById('tt-f-zone').value, asg: document.querySelectorAll('#tt-asg .evkind').length, rd: document.querySelectorAll('#tt-rundown .rd-row').length }));
  chk('일정 모달 필드(제목·구역·담당·식순·취재불필요)', m.title === '개영식' && m.nc && m.zone === 'stage' && m.asg === 2 && m.rd === 1, JSON.stringify(m));
  await page.click('#tt-cancel');

  // 전체기간 뷰
  await page.evaluate(() => { const b = [...document.querySelectorAll('#tt-modeseg button')].find((x) => /전체/.test(x.textContent)); b && b.click(); });
  await new Promise((r) => setTimeout(r, 300));
  const wp = await page.evaluate(() => ({ ids: ['t1', 't2', 't3'].every((id) => !!document.querySelector('.ttg-ev[data-id="' + id + '"]')),
    cub: [...document.querySelectorAll('.ttg-ev[data-id]')].filter((x) => /^cub-/.test(x.getAttribute('data-id'))).length }));
  chk('전체기간 뷰 → t1·t2·t3 + 컵 참관단 34건 전부 렌더', wp.ids && wp.cub === 34, 't1·t2·t3 + 컵 ' + wp.cub);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#tt-modeseg button')].find((x) => /일간/.test(x.textContent)); b && b.click(); });
  await new Promise((r) => setTimeout(r, 250));

  console.log('\n[컵 참관단 트랙 — 일간뷰 3열 분리 · 1·2기 · 범례]');
  const cubv = await page.evaluate(() => ({
    labs: [...document.querySelectorAll('.ttg-col .ttg-grouplab')].map((x) => x.textContent),
    tags: [...document.querySelectorAll('.ttg-ev.cub .cubtag')].map((x) => x.textContent),
    cubBg: (document.querySelector('.ttg-ev.cub') && getComputedStyle(document.querySelector('.ttg-ev.cub')).backgroundColor) || '',
    legend: [...document.querySelectorAll('#tt-legend .li')].map((x) => x.textContent.trim()),
    catHasCub: (state.ttcats || []).some((c) => c[0] === '컵 참관단') }));
  chk('일간뷰 3열(잼버리·의전·컵 참관단)', cubv.labs.includes('잼버리 일정') && cubv.labs.includes('의전 일정') && cubv.labs.includes('컵 참관단'), cubv.labs.join('|'));
  chk('컵 블록에 기수 태그(1기)', cubv.tags.length > 0 && cubv.tags.every((t) => /^[12]기$/.test(t)), cubv.tags.slice(0, 4).join(','));
  chk('컵 색 = 빨강 아님(개·폐영식과 구분)', cubv.cubBg && !/176, 62, 36/.test(cubv.cubBg), cubv.cubBg);
  chk('범례: 컵 참관단 카테고리 제거 · 컵 1기/2기 스와치', !cubv.catHasCub && cubv.legend.includes('컵 1기') && cubv.legend.includes('컵 2기'), cubv.legend.join('·'));
  // 컵 일정 이미지 개정(2026-07-27): 1기 8/5~8/7오전 · 2기 8/7오후~8/9오전. 구 8/4 스케줄은 1회성 마이그레이션으로 교체.
  const cubimg = await page.evaluate(() => {
    const seeds = cubObserverSeeds();
    const byId = (id) => seeds.find((s) => s.id === id);
    return {
      total: seeds.length,
      no0804: !seeds.some((s) => /^cub-1-0804-/.test(s.id)),
      b1in: (byId('cub-1-0805-1400') || {}).title, b1out: (byId('cub-1-0807-0700') || {}).title,
      b2in: (byId('cub-2-0807-1400') || {}).title, b2out: (byId('cub-2-0809-0700') || {}).title,
      close: (byId('cub-2-0808-2000') || {}).title,
    };
  });
  chk('컵 시드 = 이미지 기준(1기 8/5입소·8/7오전퇴소 · 2기 8/7오후입소·8/9오전퇴소)',
    cubimg.total === 34 && cubimg.no0804 && /입소식/.test(cubimg.b1in) && /퇴소식/.test(cubimg.b1out) && /입소식/.test(cubimg.b2in) && /퇴소식/.test(cubimg.b2out) && cubimg.close === '폐영식',
    JSON.stringify(cubimg));
  const cubmig = await page.evaluate(() => {
    state.timetable = ttList().concat([
      { id: 'cub-1-0804-0900', day: '2026-08-04', start: '09:00', end: '14:00', title: '운영요원 입영', track: 'cub', batch: 1, cat: '컵 참관단', assignees: [], contacts: [], rundown: [] },
      { id: 'cub-1-0804-1400', day: '2026-08-04', start: '14:00', end: '15:00', title: '등록·입소식', track: 'cub', batch: 1, cat: '컵 참관단', assignees: [], contacts: [], rundown: [] },
      { id: 'mkid-user-cub', day: '2026-08-06', start: '13:00', end: '14:00', title: '사용자추가', track: 'cub', batch: 1, cat: '컵 참관단', assignees: [], contacts: [], rundown: [] },
    ]);
    const ran = migrateCubSchedule();
    const after0804 = ttList().filter((t) => /^cub-1-0804-/.test(t.id)).length;
    const cubTotal = ttList().filter((t) => /^cub-\d-\d{4}-\d{4}$/.test(t.id)).length;
    const userKept = !!ttList().find((t) => t.id === 'mkid-user-cub');
    const ranAgain = migrateCubSchedule();   // 멱등: 8/4 사라졌으므로 no-op
    return { ran, after0804, cubTotal, userKept, ranAgain };
  });
  chk('컵 일정 마이그레이션: 구 8/4 제거 + 신 시드 교체 + 사용자항목 보존 + 멱등',
    cubmig.ran === 1 && cubmig.after0804 === 0 && cubmig.cubTotal === 34 && cubmig.userKept === true && cubmig.ranAgain === 0,
    JSON.stringify(cubmig));
  const rep = await page.evaluate(() => {
    try { localStorage.removeItem('jamboree-plan:cub-reporter-ksy'); } catch (e) {}
    rosterList().push({ id: 'ksy1', name: '김승연 (대구)', role: '영상·촬영', team: 't2', arrive: '' });   // 명단에 김승연 추가
    const ran = migrateCubReporterKSY();
    const cubItems = ttList().filter((t) => t.track === 'cub');
    const allHave = cubItems.length > 0 && cubItems.every((t) => (t.assignees || []).indexOf('ksy1') >= 0);
    const again = migrateCubReporterKSY();   // localStorage 플래그 → no-op(개별 편집 존중)
    // 정리: 김승연 및 그 배정 제거
    ttList().forEach((t) => { if (t.assignees) { const i = t.assignees.indexOf('ksy1'); if (i >= 0) t.assignees.splice(i, 1); } });
    state.roster = rosterList().filter((x) => x.id !== 'ksy1');
    try { localStorage.removeItem('jamboree-plan:cub-reporter-ksy'); } catch (e) {}
    return { ran, allHave, n: cubItems.length, again };
  });
  chk('컵 일정 취재 담당 = 김승연 일괄 지정(전체·1회)', rep.ran === 1 && rep.allHave === true && rep.n >= 34 && rep.again === 0, JSON.stringify(rep));
  console.log('\n[홍보부 트랙]');
  const media = await page.evaluate(() => {
    const seeds = mediaTrackSeeds();
    const labs = [...document.querySelectorAll('.ttg-col .ttg-grouplab')].map((x) => x.textContent);
    const blocks = [...document.querySelectorAll('.ttg-ev[data-id]')].filter((x) => /^media-/.test(x.getAttribute('data-id'))).length;
    return {
      n: seeds.length, days: [...new Set(seeds.map((s) => s.day))].sort().join(','),
      allMedia: seeds.every((s) => s.track === 'media'), id0: seeds[0].id,
      titles: [...new Set(seeds.map((s) => s.title))],
      inTracks: TT_TRACKS.some((t) => t[0] === 'media' && t[1] === '홍보부'),
      hasLab: labs.includes('홍보부'), blocks,
    };
  });
  chk('홍보부 트랙 시드 30건(5일×6)·track=media·id media-0805-1130',
    media.n === 30 && media.allMedia && media.days === '2026-08-05,2026-08-06,2026-08-07,2026-08-08,2026-08-09' && media.id0 === 'media-0805-1130',
    media.n + '건 · ' + media.days);
  chk('홍보부 항목(사진 셀렉 3회·SNS 포스팅 3회)',
    ['1차 사진 셀렉', '오전 브리핑 · SNS 포스팅', '2차 사진 셀렉', '오후 브리핑 · SNS 포스팅', '3차 사진 셀렉', '저녁 브리핑 · SNS 포스팅'].every((x) => media.titles.indexOf(x) >= 0),
    media.titles.join('|'));
  chk('홍보부 트랙 등록 + 일간뷰 열·블록 렌더', media.inTracks && media.hasLab && media.blocks >= 6, '등록=' + media.inTracks + ' 열=' + media.hasLab + ' 블록=' + media.blocks);
  const mmove = await page.evaluate(() => {
    try { localStorage.removeItem('jamboree-plan:media-move-mtg'); } catch (e) {}
    state.timetable = ttList().concat([
      { id: 'usr-hb1', day: '2026-08-06', start: '08:00', end: '09:00', title: '홍보부 일간 회의', cat: '회의', track: '', assignees: [], contacts: [], rundown: [] },
      { id: 'usr-prog', day: '2026-08-06', start: '09:00', end: '12:00', title: '모듈 프로그램', cat: '프로그램', track: '', assignees: [], contacts: [], rundown: [] },
    ]);
    const moved = migrateMediaMoveMeetings();
    const hb = ttById('usr-hb1'), prog = ttById('usr-prog');
    const again = migrateMediaMoveMeetings();
    // 트랙 선택 모달에 홍보부 옵션?
    openTT('usr-hb1');
    const trkOpts = [...document.querySelectorAll('#tt-track [data-trk]')].map((b) => b.textContent);
    document.getElementById('tt-cancel').click();
    state.timetable = ttList().filter((t) => t.id !== 'usr-hb1' && t.id !== 'usr-prog');
    try { localStorage.removeItem('jamboree-plan:media-move-mtg'); } catch (e) {}
    return { moved, hbTrack: hb && hb.track, progTrack: (prog && prog.track) || 'jam', again, trkOpts };
  });
  chk('홍보부 회의 → 홍보부 트랙 이동(프로그램은 유지·멱등)', mmove.moved === 1 && mmove.hbTrack === 'media' && mmove.progTrack === 'jam' && mmove.again === 0, JSON.stringify({ m: mmove.moved, hb: mmove.hbTrack, prog: mmove.progTrack, again: mmove.again }));
  chk('편집 모달 트랙 선택에 홍보부 옵션', mmove.trkOpts.indexOf('홍보부') >= 0, mmove.trkOpts.join('|'));

  /* 입·퇴영 호차 트랙 (v0.9.290) — 입영·퇴영을 **한 열**에 두고 방향은 dir + 태그로 구분한다(사용자 지시).
   * 여기서 못 박는 것: 시드 내용/개수, 30분 블록, 일간뷰 별도 열, dir 저장(화이트리스트), track/dir 복구. */
  console.log('\n[입·퇴영 호차 트랙]');
  const bus = await page.evaluate(() => {
    const seeds = busTrackSeeds();
    const byId = (id) => seeds.find((s) => s.id === id);
    const dur = seeds.map((s) => (t2h(s.end) - t2h(s.start)).toFixed(2));
    return {
      n: seeds.length,
      allBus: seeds.every((s) => s.track === 'bus'),
      idOk: seeds.every((s) => /^bus-(in|out)-\d{4}-\d{4}-/.test(s.id)),
      uniq: new Set(seeds.map((s) => s.id)).size,
      ins: seeds.filter((s) => s.dir === 'in').length,
      outs: seeds.filter((s) => s.dir === 'out').length,
      days: [...new Set(seeds.map((s) => s.day))].sort().join(','),
      allHalfHour: dur.every((d) => d === '0.50'),
      inTracks: TT_TRACKS.some((t) => t[0] === 'bus' && t[1] === '입·퇴영'),
      // 표기 정정 3건(사용자 확정)
      ukr: (byId('bus-out-0809-0910-c') || {}).title || '',
      twn: (byId('bus-in-0804-1730-b') || {}).title || '',
      bus12: (byId('bus-in-0805-1730-12') || {}).title || '',
      firstOut: (byId('bus-out-0809-0600-a') || {}).title || '',
    };
  });
  chk('입·퇴영 시드 16건(입영 9 · 퇴영 7) · track=bus · id 규칙 · 중복 없음',
    bus.n === 16 && bus.ins === 9 && bus.outs === 7 && bus.allBus && bus.idOk && bus.uniq === 16,
    bus.n + '건(입' + bus.ins + '/퇴' + bus.outs + ') uniq=' + bus.uniq);
  chk('입영 8/3·8/4·8/5 · 퇴영 8/9', bus.days === '2026-08-03,2026-08-04,2026-08-05,2026-08-09', bus.days);
  chk('블록 길이 30분 고정(시각만 주어짐)', bus.allHalfHour, '');
  chk('트랙 목록에 입·퇴영 등록(입영/퇴영 한 열)', bus.inTracks, '');
  chk('표기 정정 — 우크라이타 → 우크라이나', /우크라이나/.test(bus.ukr) && !/우크라이타/.test(bus.ukr), bus.ukr);
  chk('표기 정정 — 8/4 B호차 대만 중복 제거', bus.twn === 'B호차 — 대만 · 슬로베니아 · 홍콩', bus.twn);
  chk('12호차는 원문 표기 유지', /^12호차 — /.test(bus.bus12), bus.bus12);
  chk('8/9 첫 퇴영 = 06:00 A호차', bus.firstOut === 'A호차 — 뉴질랜드 · 마카오', bus.firstOut);

  // 일간뷰 8/5 — 입·퇴영이 잼버리/컵과 구분된 별도 열로 뜨는가
  const busv = await page.evaluate(() => ({
    labs: [...document.querySelectorAll('.ttg-col .ttg-grouplab')].map((x) => x.textContent),
    blocks: [...document.querySelectorAll('.ttg-ev[data-id]')].filter((x) => /^bus-/.test(x.getAttribute('data-id'))).length,
    tags: [...document.querySelectorAll('.ttg-ev.bus .cubtag')].map((x) => x.textContent),
    legend: [...document.querySelectorAll('.ttfchip')].map((x) => x.textContent),
    busBg: (document.querySelector('.ttg-ev.bus') && getComputedStyle(document.querySelector('.ttg-ev.bus')).backgroundColor) || '',
  }));
  chk('일간뷰 8/5 — 입·퇴영 별도 열 + 호차 6건', busv.labs.includes('입·퇴영') && busv.blocks === 6, busv.labs.join('|') + ' / ' + busv.blocks + '건');
  chk('블록에 방향 태그(입영)', busv.tags.length === 6 && busv.tags.every((t) => t === '입영'), busv.tags.join(','));
  chk('보기 필터에 입·퇴영 칩', busv.legend.some((t) => /입·퇴영/.test(t)), busv.legend.join('·'));
  chk('입·퇴영 색 = 컵 1기(청)와 다름', busv.busBg && !/63, 111, 168/.test(busv.busBg), busv.busBg);

  // 8/9 — 09:00~09:50 에 5대가 몰린다. 전부 그려지고 레인으로 갈라져야 한다(겹쳐 가려지면 안 됨).
  const bus9 = await page.evaluate(() => {
    ttDay = '2026-08-09'; renderTimetable();
    const els = [...document.querySelectorAll('.ttg-ev[data-id]')].filter((x) => /^bus-out-/.test(x.getAttribute('data-id')));
    const lefts = new Set(els.map((x) => x.style.left));
    const pos = new Set(els.map((x) => x.style.top + '|' + x.style.left));
    return { n: els.length, lanes: lefts.size, pos: pos.size, tags: [...new Set([...document.querySelectorAll('.ttg-ev.bus .cubtag')].map((x) => x.textContent))] };
  });
  chk('8/9 퇴영 7건 전부 렌더', bus9.n === 7, bus9.n + '건');
  // 09:00·09:10·09:20·09:40·09:50 이 30분씩 겹친다 → 겹침 뭉치가 레인 3개로 갈라져야 한 대도 가려지지 않는다.
  chk('겹치는 호차는 레인으로 갈라진다(가려짐 없음)', bus9.lanes === 3 && bus9.pos === 7, '레인 ' + bus9.lanes + ' · 좌표 ' + bus9.pos + '/7');
  chk('8/9 블록 태그 = 퇴영', bus9.tags.length === 1 && bus9.tags[0] === '퇴영', bus9.tags.join(','));

  // 편집 모달 — 입영/퇴영 버튼으로 track='bus' + dir 저장. dir 은 서버 화이트리스트에도 있어야 산다.
  const busm = await page.evaluate(() => {
    openTT('bus-out-0809-0600-a');
    const opts = [...document.querySelectorAll('#tt-track [data-trk]')].map((b) => b.textContent);
    const onNow = (document.querySelector('#tt-track .trk.on') || {}).textContent || '';
    const inBtn = [...document.querySelectorAll('#tt-track [data-trk]')].find((b) => b.getAttribute('data-trk') === 'busin');
    inBtn.click();
    const clean = buildCleanTT();
    document.getElementById('tt-cancel').click();
    return { opts, onNow, track: clean.track, dir: clean.dir };
  });
  chk('모달 트랙 옵션에 입영·퇴영(열은 하나)', busm.opts.filter((t) => /입·퇴영/.test(t)).length === 2, busm.opts.join('|'));
  chk('퇴영 항목 열면 퇴영 버튼이 켜져 있다', /퇴영/.test(busm.onNow), busm.onNow);
  chk('입영으로 바꾸면 track=bus · dir=in 으로 저장된다', busm.track === 'bus' && busm.dir === 'in', busm.track + '/' + busm.dir);

  // track/dir 이 편집으로 벗겨져도 id 가 증거 → 복구(컵 트랙에서 겪은 유실 패턴)
  const busfix = await page.evaluate(() => {
    const t = ttById('bus-out-0809-0900-b');
    t.track = ''; t.dir = '';
    const fixedRun = mergeBusTrack();
    const after = ttById('bus-out-0809-0900-b');
    const again = mergeBusTrack();
    const total = ttList().filter((x) => /^bus-/.test(x.id)).length;
    ttDay = '2026-08-05'; renderTimetable();
    return { track: after.track, dir: after.dir, fixedRun, again, total };
  });
  chk('track/dir 이 벗겨져도 id 로 되살린다', busfix.track === 'bus' && busfix.dir === 'out', busfix.track + '/' + busfix.dir);
  chk('시드 재주입 없음(멱등 · 브라우저당 1회)', busfix.fixedRun === 0 && busfix.again === 0 && busfix.total === 16, JSON.stringify(busfix));

  // 취재 리스트는 호차를 잡지 않는다(취재 대상이 아님)
  chk('입·퇴영은 촬영 리스트에 올라가지 않는다',
    await page.evaluate(() => !shootListData().some((r) => /^tt:bus-/.test(r.ttId || ''))), '');

  /* 현재 시각 인디케이터 (v0.9.291) — 실제 시계에 기대면 검증이 안 되므로
   * 순수함수(ttNowGeometry)와, todayISO/nowHours 를 갈아끼운 렌더 둘 다 못 박는다.
   * 테스트가 도는 오늘(그리드 8/2~8/9 밖)에는 **선이 없어야** 한다는 것도 함께 검사한다. */
  console.log('\n[일정표 현재 시각 인디케이터]');
  const nowGeo = await page.evaluate(() => ({
    other: ttNowGeometry('2026-08-06', '2026-08-05', 14.5, 96),
    hit: ttNowGeometry('2026-08-05', '2026-08-05', 14.5, 96),
    mid: ttNowGeometry('2026-08-05', '2026-08-05', 9.25, 96),
    over: ttNowGeometry('2026-08-05', '2026-08-05', 24.5, 96),
    none: ttNowGeometry('', '2026-08-05', 14.5, 96),
    period: ttNowGeometry('2026-08-05', '2026-08-05', 14.5, 60),
    // '지금'은 내림이어야 한다 — 14:29:31 을 14:30 으로 보여 주면 시계가 앞선다(h2hhmm 은 반올림)
    floorLab: ttNowGeometry('2026-08-05', '2026-08-05', 14 + 29 / 60 + 31 / 3600, 96).label,
    roundLab: h2hhmm(14 + 29 / 60 + 31 / 3600),
  }));
  chk('오늘이 아닌 열에는 선이 없다', nowGeo.other === null && nowGeo.none === null, JSON.stringify(nowGeo.other));
  chk('오늘 열 14:30 → top=1392px · 라벨 14:30', nowGeo.hit && nowGeo.hit.top === 1392 && nowGeo.hit.label === '14:30', JSON.stringify(nowGeo.hit));
  chk('09:15 → top=888px · 라벨 09:15(분 단위)', nowGeo.mid && nowGeo.mid.top === 888 && nowGeo.mid.label === '09:15', JSON.stringify(nowGeo.mid));
  chk('그리드 시간 범위 밖이면 없다', nowGeo.over === null, JSON.stringify(nowGeo.over));
  chk('전체기간 뷰(60px/시간)는 같은 시각도 top=870px', nowGeo.period && nowGeo.period.top === 870, JSON.stringify(nowGeo.period));
  chk('현재 시각은 내림 — 14:29:31 은 14:29 (반올림이면 14:30)', nowGeo.floorLab === '14:29' && nowGeo.roundLab === '14:30', nowGeo.floorLab + ' vs 반올림 ' + nowGeo.roundLab);

  const nowLine = await page.evaluate(() => {
    const realToday = todayISO, realNow = nowHours;
    const off = { lines: document.querySelectorAll('.ttg-now').length };   // 오늘이 그리드 밖 → 0이어야
    todayISO = () => '2026-08-05'; nowHours = () => 14.5;
    renderTimetable();
    const el = document.querySelector('.ttg-now');
    const day = { n: document.querySelectorAll('.ttg-now').length, top: el && el.style.top,
      lab: el && el.querySelector('.ttg-now-lab').textContent,
      pe: el && getComputedStyle(el).pointerEvents,
      z: el && +getComputedStyle(el).zIndex,
      evZ: +getComputedStyle(document.querySelector('.ttg-ev')).zIndex };
    // 선만 옮긴다 — 그리드를 다시 그리지 않고 tick 만으로 위치·라벨이 갱신돼야 한다
    const gridBefore = document.getElementById('tt-grid').firstElementChild;
    nowHours = () => 15.0;
    const moved = tickTTNow();
    const after = { top: document.querySelector('.ttg-now').style.top,
      lab: document.querySelector('.ttg-now-lab').textContent, moved,
      sameGrid: document.getElementById('tt-grid').firstElementChild === gridBefore };
    // 전체기간 뷰 — 8일 중 오늘 열에만
    const b = [...document.querySelectorAll('#tt-modeseg button')].find((x) => /전체/.test(x.textContent)); b.click();
    const period = { n: document.querySelectorAll('.ttg-now').length,
      col: (document.querySelector('.ttg-now') || {}).parentElement.getAttribute('data-day') };
    [...document.querySelectorAll('#tt-modeseg button')].find((x) => /일간/.test(x.textContent)).click();
    todayISO = realToday; nowHours = realNow;
    renderTimetable();
    const restored = document.querySelectorAll('.ttg-now').length;
    return { off, day, after, period, restored };
  });
  chk('오늘이 그리드(8/2~8/9) 밖이면 선을 그리지 않는다', nowLine.off.lines === 0 && nowLine.restored === 0, '부팅 ' + nowLine.off.lines + ' · 복원 ' + nowLine.restored);
  chk('오늘 열에 선 1개 · top=1392px · 라벨 14:30', nowLine.day.n === 1 && nowLine.day.top === '1392px' && nowLine.day.lab === '14:30', JSON.stringify(nowLine.day));
  chk('선은 블록 위 · 클릭은 통과(pointer-events:none)', nowLine.day.pe === 'none' && nowLine.day.z > nowLine.day.evZ, 'pe=' + nowLine.day.pe + ' z=' + nowLine.day.z + '>' + nowLine.day.evZ);
  chk('tick 이 그리드 재렌더 없이 선만 옮긴다', nowLine.after.top === '1440px' && nowLine.after.lab === '15:00' && nowLine.after.moved === 1 && nowLine.after.sameGrid, JSON.stringify(nowLine.after));
  chk('전체기간 뷰 — 오늘(8/5) 열 하나에만', nowLine.period.n === 1 && nowLine.period.col === '2026-08-05', JSON.stringify(nowLine.period));

  /* 대시보드 '지금 현장' (v0.9.291) — 진행 중 · 앞으로 3시간을 **열(트랙) 단위**로.
   * 8/5 14:30 기준 고정 시나리오: 진행 중 = 컵 1기 등록(14:00–15:00) 하나,
   * 3시간 내 = 컵 과정활동 15:00 · 홍보부 16:30·17:30 · 입·퇴영 I·12호차 17:30 = 5건. */
  console.log('\n[대시보드 — 지금 진행 중 · 3시간 내 (열 단위)]');
  const ns = await page.evaluate(() => {
    const r = ttNowSoon('2026-08-05', 14.5, 3);
    const g = (x) => x.map((t) => t.key + ':' + t.items.length).join(',');
    // 보기 필터를 꺼도 대시보드 결과는 그대로여야 한다(현장 상황이 화면 설정에 좌우되면 안 됨)
    const keep = JSON.parse(JSON.stringify(ttFilter));
    ttFilter.bus = false; ttFilter.media = false;
    const filtered = ttNowSoon('2026-08-05', 14.5, 3);
    Object.assign(ttFilter, keep);
    return {
      nLive: r.nLive, nSoon: r.nSoon, live: g(r.live), soon: g(r.soon),
      liveTitle: r.live[0] && r.live[0].items[0].title,
      filteredSoon: filtered.nSoon,
      // 경계: 창 끝에 정확히 걸치는 17:30 호차는 포함, 창이 1분만 좁아지면 제외
      edgeIn: ttNowSoon('2026-08-05', 14.5, 3).soon.some((t) => t.key === 'bus'),
      edgeOut: ttNowSoon('2026-08-05', 14.5, 3 - 1 / 60).soon.some((t) => t.key === 'bus'),
      // 끝나는 순간은 '진행 중'이 아니다 — 14:00~14:30 호차는 14:30 에 빠진다
      busEnded: ttNowSoon('2026-08-05', 14.5, 3).live.some((t) => t.key === 'bus'),
      busLive: ttNowSoon('2026-08-05', 14.4, 3).live.some((t) => t.key === 'bus'),
      // 의전(pr)도 열 하나로 들어온다 — usr-pr1 은 8/5 20:00
      prLive: ttNowSoon('2026-08-05', 20.5, 3).live.some((t) => t.key === 'pr'),
      gaps: [humanGap(0.75), humanGap(2.3), humanGap(1), humanGap(0)],
    };
  });
  chk('8/5 14:30 — 진행 중 1건(컵 1기 등록·입소식)', ns.nLive === 1 && ns.live === 'cub1:1' && /입소식/.test(ns.liveTitle), ns.live + ' / ' + ns.liveTitle);
  chk('3시간 내 5건이 열 단위로 묶인다(홍보부2·컵1·입퇴영2)', ns.nSoon === 5 && ns.soon === 'media:2,cub1:1,bus:2', ns.soon);
  chk('열 순서는 일정표와 같다(잼버리→의전→홍보부→컵→입·퇴영)', ns.soon.indexOf('media') < ns.soon.indexOf('cub1') && ns.soon.indexOf('cub1') < ns.soon.indexOf('bus'), ns.soon);
  chk('보기 필터를 꺼도 현장 목록은 그대로', ns.filteredSoon === 5, ns.filteredSoon + '건');
  chk('창 경계 — 정확히 +3시간은 포함 · 1분 지나면 제외', ns.edgeIn && !ns.edgeOut, 'in=' + ns.edgeIn + ' out=' + ns.edgeOut);
  chk('끝나는 순간은 진행 중이 아니다(호차 14:00~14:30)', !ns.busEnded && ns.busLive, 'at14:30=' + ns.busEnded + ' at14:24=' + ns.busLive);
  chk('의전도 한 열로 들어온다', ns.prLive, '');
  chk('남은 시간 표기(45분 · 2시간 18분 · 1시간 · 곧)', ns.gaps.join('|') === '45분|2시간 18분|1시간|곧', ns.gaps.join('|'));

  await go('dashboard');
  const nsUI = await page.evaluate(() => {
    const realToday = todayISO, realNow = nowHours;
    // ⚠️ 기간 밖 문구는 '오늘'을 가짜로 밀어 넣어 재현한다. 실제 시계로 재면 잼버리 기간(8/2~8/9)에
    //    들어서는 순간부터 매일 FAIL 한다 — 정작 행사 중에 스위트가 빨개진다(v0.9.292 실제 관측).
    todayISO = () => '2026-07-01'; nowHours = () => 14.5;
    renderDashboard();
    const outside = { empty: (document.querySelector('#dash-now .dp-empty') || {}).textContent || '' };
    todayISO = () => '2026-08-05'; nowHours = () => 14.5;
    renderDashboard();
    const box = document.getElementById('dash-now');
    const res = {
      clock: (box.querySelector('.now-clock') || {}).textContent,
      tracks: [...box.querySelectorAll('.ntk')].map((x) => x.textContent),
      items: box.querySelectorAll('.nowitem').length,
      liveLeft: (box.querySelector('.nowsec .now-left.on') || {}).textContent,
      soonWin: (box.querySelector('.nowsec-win') || {}).textContent,
      busTag: [...box.querySelectorAll('.nowtag')].map((x) => x.textContent),
      clickable: box.querySelectorAll('.nowitem[data-ttid]').length,
    };
    todayISO = realToday; nowHours = realNow;
    renderDashboard();
    return { outside, res, afterEmpty: outside.empty };
  });
  chk('지금 현장 패널 — 14:30 기준 표기', nsUI.res.clock === '14:30 기준', nsUI.res.clock);
  chk('열 배지 렌더(컵 1기 · 홍보부 · 입·퇴영)', nsUI.res.tracks.join(',') === '컵 1기,홍보부,컵 1기,입·퇴영', nsUI.res.tracks.join(','));
  chk('항목 6건(진행 1 + 3시간 내 5) · 클릭 가능', nsUI.res.items === 6 && nsUI.res.clickable === 6, nsUI.res.items + '건 / 클릭 ' + nsUI.res.clickable);
  chk('진행 중은 남은 시간, 3시간 창은 시각 범위 표기', nsUI.res.liveLeft === '30분 남음' && nsUI.res.soonWin === '14:30~17:30', nsUI.res.liveLeft + ' · ' + nsUI.res.soonWin);
  chk('입·퇴영 항목에 방향 태그', nsUI.res.busTag.length === 2 && nsUI.res.busTag.every((t) => t === '입영'), nsUI.res.busTag.join(','));
  chk('잼버리 기간 밖이면 안내 문구를 보여 준다', /잼버리 기간이 되면/.test(nsUI.afterEmpty), nsUI.afterEmpty.slice(0, 30));

  console.log('\n[식사 메뉴]');
  await go('meals');
  const ml = await page.evaluate(() => ({
    rows: document.querySelectorAll('#mealbody tr').length,
    seg: [...document.querySelectorAll('#meal-groupseg button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')),
    cells: document.querySelectorAll('#mealbody td.mk[contenteditable]').length,
    heads: document.querySelectorAll('#mealhead th').length,
    rowh: [...document.querySelectorAll('#mealbody th.mealrowh')].map((t) => t.textContent).join(','),
    head1: (document.querySelector('#mealhead th:nth-child(2)') || {}).textContent }));
  // v0.9.287 행↔열 반전: 행=조식·중식·석식(3), 칸=3끼×7일(21). 급식보드와 같은 방향.
  chk('식사 메뉴 3끼(행) × 7일(8/3~8/9)', ml.rows === 3 && ml.cells === 21 && ml.heads === 8, ml.rows + '행 · ' + ml.cells + '칸 · 머리 ' + ml.heads);
  chk('식사 3그룹 토글(대원 일반식·특별식·운영요원)', ml.seg.length === 3 && ml.seg[0] === '대원 일반식*', ml.seg.join(' '));
  chk('행 머리는 조식·중식·석식 순', ml.rowh, '조식,중식,석식');
  chk('머리행 첫 날짜는 8/03 (구분 다음 칸)', /8\/03/.test(ml.head1 || ''), ml.head1);
  chk('저장은 그 칸의 날짜·끼니로 간다(행/열이 바뀌어도 값이 어긋나지 않는다)', await page.evaluate(() => {
    const td = document.querySelector('#mealbody td.mk[data-d="2026-08-06"][data-c="l"]');
    if (!td) return 'no cell';
    td.innerText = '반전검사메뉴';
    td.dispatchEvent(new Event('blur'));
    const v = ((mealsData()[mealGroup] || {})['2026-08-06'] || {}).l;
    return v === '반전검사메뉴' ? true : ('저장값=' + v);
  }), '');

  // 참가자 일반식(crew_n) 이미지 기준 재구성(2026-07-27) — 원본 대조 고정
  const meal = await page.evaluate(() => {
    const cn = defaultMeals().crew_n;
    return {
      dates: Object.keys(cn).sort().join(','),
      b0806: cn['2026-08-06'].b, d0806: cn['2026-08-06'].d, d0805: cn['2026-08-05'].d,
      l0807: cn['2026-08-07'].l, d0808: cn['2026-08-08'].d, b0809: cn['2026-08-09'].b,
      blank0805b: cn['2026-08-05'].b === '', blank0809d: cn['2026-08-09'].d === '',
    };
  });
  chk('일반식 이미지 기준 값(요거톡·고기듬뿍김치찌개·클로렐라쌀밥·뽀로로두부봉·치킨마크니커리)',
    meal.dates === '2026-08-05,2026-08-06,2026-08-07,2026-08-08,2026-08-09' &&
    /롤유부초밥_햇반/.test(meal.b0806) && /요거톡/.test(meal.b0806) && /고기듬뿍김치찌개&라면사리/.test(meal.d0806) &&
    /클로렐라쌀밥/.test(meal.d0805) && !/햇반/.test(meal.d0805.split('\n')[1] || '') && /뽀로로두부봉/.test(meal.l0807) &&
    /치킨마크니커리/.test(meal.d0808) && /컵시리얼&흰우유/.test(meal.b0809) && meal.blank0805b && meal.blank0809d,
    JSON.stringify(meal).slice(0, 120));
  const mmig = await page.evaluate(() => {
    // 구 일반식(롤유부초밥, _햇반 없음) 저장본 → 1회성 마이그레이션이 신 데이터로 교체
    mealsData().crew_n = { '2026-08-06': { b: '롤유부초밥\n미역된장국', l: '', d: '돼지김치찌개&라면사리' } };
    const ran = migrateMealsCrewN();
    const after = /롤유부초밥_햇반/.test(mealsData().crew_n['2026-08-06'].b) && /고기듬뿍김치찌개/.test(mealsData().crew_n['2026-08-06'].d);
    const again = migrateMealsCrewN();   // 멱등: 신 표식 있으면 no-op
    return { ran, after, again, n: Object.keys(mealsData().crew_n).length };
  });
  chk('일반식 마이그레이션: 구 데이터 → 신 데이터 교체(멱등)', mmig.ran === 1 && mmig.after === true && mmig.again === 0 && mmig.n === 5, JSON.stringify(mmig));
  // 운영요원(staff) 식사메뉴 확정본(2026-07-28 PDF) — 조식 하루 밀림·오타 교정. 원본 대조 고정.
  const smeal = await page.evaluate(() => {
    const st = defaultMeals().staff;
    return { dates: Object.keys(st).sort().join(','),
      b0803: st['2026-08-03'].b, b0808: st['2026-08-08'].b, b0809: st['2026-08-09'].b,
      l0804: st['2026-08-04'].l, d0803: st['2026-08-03'].d, d0808: st['2026-08-08'].d };
  });
  chk('운영요원 확정본(8/3 조식 없음·8/8 조식 돈육짜장덮밥·8/9 얼큰계란감자국·음료 [ ]·부추겉절이)',
    smeal.dates === '2026-08-03,2026-08-04,2026-08-05,2026-08-06,2026-08-07,2026-08-08,2026-08-09' &&
    smeal.b0803 === '' && /돈육짜장덮밥/.test(smeal.b0808) && /얼큰계란감자국/.test(smeal.b0809) &&
    /\[요구르트\]/.test(smeal.l0804) && /\[망고음료\]/.test(smeal.d0803) && /부추겉절이/.test(smeal.d0808),
    JSON.stringify(smeal).slice(0, 120));
  const smig = await page.evaluate(() => {
    // 구 운영요원(조식 하루 밀림: 8/3 조식 존재·8/8 조식 없음) 저장본 → 1회성 마이그레이션이 확정본으로 교체
    mealsData().staff = { '2026-08-03': { b: '쌀밥\n소고기미역국', l: '', d: '' }, '2026-08-08': { b: '', l: '', d: '' } };
    const ran = migrateMealsStaff();
    const after = mealsData().staff['2026-08-03'].b === '' && /돈육짜장덮밥/.test(mealsData().staff['2026-08-08'].b);
    const again = migrateMealsStaff();   // 멱등: 확정본 표식 있으면 no-op
    return { ran, after, again, n: Object.keys(mealsData().staff).length };
  });
  chk('운영요원 마이그레이션: 구(밀림) → 확정본 교체(멱등)', smig.ran === 1 && smig.after === true && smig.again === 0 && smig.n === 7, JSON.stringify(smig));

  console.log('\n[소식 제보 → 일정]');
  await go('tips');
  chk('제보 카드 · 일정 잡기 버튼', await page.$('[data-tip-sched]') !== null);
  // 가로로 긴 행 레이아웃 (1440px 뷰포트) — ≤820px 에서는 column 으로 되돌아감
  const tl = await page.evaluate(() => ({ card: getComputedStyle(document.querySelector('.tipcard')).flexDirection, grid: getComputedStyle(document.querySelector('.tipgrid')).flexDirection }));
  chk('제보 카드 가로 배치(row) · 목록은 세로 스택', tl.card === 'row' && tl.grid === 'column', JSON.stringify(tl));
  await page.click('[data-tip-sched]');
  await new Promise((r) => setTimeout(r, 200));
  const s1 = await page.evaluate(() => ({ date: document.getElementById('tsch-date').value, dest: document.querySelector('.tsch-dest').className }));
  chk('희망일시 프리필 + 8/5 → 일정표 분기', s1.date === '2026-08-05' && /jam/.test(s1.dest), s1.date + ' ' + s1.dest);
  await page.evaluate(() => { const d = document.getElementById('tsch-date'); d.value = '2026-07-20'; d.dispatchEvent(new Event('change', { bubbles: true })); });
  chk('7/20 → 캘린더 분기(라이브 전환)', /cal/.test(await page.evaluate(() => document.querySelector('.tsch-dest').className)));
  await page.click('[data-tsch-p="r1"]'); await page.click('#tsch-save');
  await new Promise((r) => setTimeout(r, 500));
  const s2 = await page.evaluate(() => { const p = window.__tipPatch.pop(); const sp = window.__put.filter((x) => x.slotKey).pop(); return { kind: p && p.scheduled && p.scheduled.kind, slot: sp && sp.slotKey, owner: sp && sp.edit && sp.edit.owner }; });
  chk('캘린더 경로 → 슬롯 생성 + 제보 링크', s2.kind === 'slot' && /2026-07-20/.test(s2.slot || '') && s2.owner === '김기자', JSON.stringify(s2));

  console.log('\n[자료실]');
  await go('library');
  const L = await page.evaluate(() => ({ cards: document.querySelectorAll('.libcard').length, open: document.querySelectorAll('.libcard[data-lib-open]').length, cats: document.querySelectorAll('#lib-cats .libcat').length, text: document.querySelectorAll('.libcard.istext').length }));
  chk('자료 4건(파일·텍스트·오디오) · 카드 클릭 가능 · 구분 탭(전체+5)', L.cards === 4 && L.open === 4 && L.cats === 6 && L.text === 1, JSON.stringify(L));
  await page.click('.libcard[data-lib-open="a1"] .libimg');
  await new Promise((r) => setTimeout(r, 250));
  const P = await page.evaluate(() => ({ shown: document.getElementById('asset-scrim').classList.contains('show'),
    iframe: (document.querySelector('.apv-pdf iframe') || {}).src || '', meta: document.querySelectorAll('.apv-meta dd').length }));
  chk('PDF 미리보기(iframe inline=1) + 메타 5행', P.shown && /inline=1/.test(P.iframe) && P.meta === 5, P.iframe);
  await page.click('#asset-close');
  await page.click('.libcard[data-lib-open="a2"] .libimg'); await new Promise((r) => setTimeout(r, 200));
  chk('이미지 자료 → 이미지 미리보기', await page.$('.apv-img img') !== null);
  await page.click('#asset-close');
  // 텍스트형 자료 (v0.9.218) — 리치 본문 보기(정화) · 받기 없음 · 작성 모달
  await page.click('.libcard[data-lib-open="a3"] .libimg'); await new Promise((r) => setTimeout(r, 200));
  const TX = await page.evaluate(() => ({ text: !!document.querySelector('.apv-text'), strong: !!document.querySelector('.apv-text strong'),
    dlHidden: getComputedStyle(document.getElementById('asset-dl')).display === 'none', openHidden: getComputedStyle(document.getElementById('asset-open')).display === 'none' }));
  chk('텍스트 자료 보기 = 리치 본문(정화) · 받기/새탭 숨김', TX.text && TX.strong && TX.dlHidden && TX.openHidden, JSON.stringify(TX));
  await page.click('#asset-close');
  const NT = await page.evaluate(async () => { openLibText(null); await new Promise((r) => setTimeout(r, 140));
    const hasName = !!document.getElementById('lt-name'), hasBody = !!document.getElementById('lt-bodywrap'), catOpts = document.querySelectorAll('#lt-catlist option').length;
    document.getElementById('lt-name').value = '새 공지'; document.getElementById('lt-name').dispatchEvent(new Event('input', { bubbles: true }));
    libTextEdit.body = '<p>본문</p>'; document.getElementById('libtext-save').click(); await new Promise((r) => setTimeout(r, 200));
    return { hasName, hasBody, catOpts, save: window.__assetSave }; });
  chk('텍스트 자료 작성 모달(제목·본문 에디터·구분) + 저장 kind:text', NT.hasName && NT.hasBody && NT.catOpts >= 5 && NT.save && NT.save.kind === 'text' && NT.save.name === '새 공지', JSON.stringify(NT.save));
  // 오디오(mp3) 미리보기 = <audio> 플레이어 · 모든 파일 허용
  await page.click('.libcard[data-lib-open="a4"] .libimg'); await new Promise((r) => setTimeout(r, 200));
  chk('오디오(mp3) 자료 → audio 플레이어 미리보기', await page.$('.apv-audio audio') !== null);
  await page.click('#asset-close');
  const acc = await page.evaluate(() => document.getElementById('lib-file-plan').getAttribute('accept'));
  chk('문서·파일 올리기 = 모든 파일 허용(accept 제한 없음)', !acc, 'accept=' + acc);
  // 업로드 모달 + R2 청크
  const U = await page.evaluate(async () => {
    openLibUpload([new File([new ArrayBuffer(2 * 1024 * 1024)], 'a.pdf', { type: 'application/pdf' }), new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })], 'plan');
    await new Promise((r) => setTimeout(r, 120));
    return { shown: document.getElementById('lib-scrim').classList.contains('show'), rows: document.querySelectorAll('.libup-row').length, over: document.querySelectorAll('.libup-row.over').length, btn: document.getElementById('lib-upload').textContent };
  });
  chk('업로드 모달(prompt 아님) · 100MB 초과 표시', U.shown && U.rows === 2 && U.over === 1 && /업로드 \(1\)/.test(U.btn), U.btn);
  // v0.9.180: 목록형 레이아웃 + 파일별 문서명 입력
  const LL = await page.evaluate(() => {
    const card = document.querySelector('.libcard');
    const names = document.querySelectorAll('#lib-body [data-libup-name]');
    const inp = names[0]; if (inp) { inp.value = '개영식 계획서'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    return { dir: getComputedStyle(card).flexDirection, gridDir: getComputedStyle(document.querySelector('.libgrid')).flexDirection,
             nameInputs: names.length, stored: (typeof libUp !== 'undefined' && libUp) ? libUp.names[0] : '' };
  });
  chk('자료실 목록형(행) 레이아웃', LL.dir === 'row' && LL.gridDir === 'column', LL.dir + '/' + LL.gridDir);
  chk('업로드 파일별 문서명 입력(초과 파일 제외)', LL.nameInputs === 1 && LL.stored === '개영식 계획서', JSON.stringify({ n: LL.nameInputs, v: LL.stored }));
  await page.evaluate(() => document.getElementById('lib-cancel').click());
  const U2 = await page.evaluate(async () => { await uploadAssets([new File([new ArrayBuffer(100 * 1024 * 1024)], 'p.pdf', { type: 'application/pdf' })], 'plan', ['t']); await new Promise((r) => setTimeout(r, 800)); return { parts: window.__r2.parts.length, creates: window.__r2.creates, aborted: window.__r2.aborted }; });
  chk('100MB → R2 8MiB 청크 13파트', U2.parts === 13 && U2.creates === 1 && U2.aborted === 0, JSON.stringify(U2));
  // 자료 편집(이름·카테고리·태그) + 자유 카테고리 — 관리자/업로더
  const assetPatch = await page.evaluate(async () => {
    window.__patch = []; const of = window.fetch;
    window.fetch = (u, o) => { u = String(u && u.url ? u.url : u); if (u.startsWith('/api/jp-assets') && o && o.method === 'PATCH') { const b = JSON.parse(o.body); window.__patch.push(b); return Promise.resolve(new Response(JSON.stringify({ ok: true, asset: Object.assign({}, window.__assets[0], { name: b.name, category: b.category, tags: b.tags }) }), { headers: { 'content-type': 'application/json' } })); } return of(u, o); };
    openAsset('a1'); await new Promise((r) => setTimeout(r, 100));
    const editVis = getComputedStyle(document.getElementById('asset-edit-btn')).display !== 'none';
    openAssetEdit(); await new Promise((r) => setTimeout(r, 100));
    const hasFields = !!(document.getElementById('ae-name') && document.getElementById('ae-cat') && document.getElementById('ae-tags'));
    document.getElementById('ae-name').value = '수정된 이름'; document.getElementById('ae-cat').value = '홍보물'; document.getElementById('ae-tags').value = '태그1, 태그2';
    document.getElementById('ae-save').click(); await new Promise((r) => setTimeout(r, 150));
    return { editVis, hasFields, patch: window.__patch[window.__patch.length - 1] };
  });
  chk('자료 수정 UI(이름·카테고리·태그 필드)', assetPatch.editVis && assetPatch.hasFields);
  chk('자유 카테고리 저장(PATCH category=홍보물)', assetPatch.patch && assetPatch.patch.category === '홍보물' && assetPatch.patch.name === '수정된 이름', JSON.stringify(assetPatch.patch));

  console.log('\n[대시보드 · 인원]');
  await go('dashboard');
  chk('대시보드 통계 카드', (await page.$$('#dashboard .statcard, #dashboard .stat')).length > 0 || (await page.$('#dashboard')) !== null);
  // 마감 임박·미게시 pill: 긴 제목이 테두리 밖으로 넘치지 않고 말줄임, 날짜 span 유지 (v0.9.289 회귀 — 실제 라이브 결함)
  const dueFit = await page.evaluate(() => {
    const col = document.createElement('div'); col.className = 'pubcol'; col.style.width = '260px';
    col.innerHTML = '<button class="pubrow due"><span>8/5 오늘</span><b>잼버리 안내 | 국제 참가자를 위한 잼버리 안내 - 헬프데스크, 기타 등등 아주 긴 제목</b></button>';
    document.getElementById('dashboard').appendChild(col);
    const row = col.querySelector('.pubrow.due'), b = col.querySelector('b'), sp = col.querySelector('span');
    const rowR = row.getBoundingClientRect(), bR = b.getBoundingClientRect();
    const res = { titleWithinRow: bR.right <= rowR.right + 1, rowNoOverflow: row.scrollWidth <= row.clientWidth + 1,
      ellipsized: b.scrollWidth > b.clientWidth + 1, dateVisible: sp.getBoundingClientRect().width > 0 };
    col.remove(); return res;
  });
  chk('마감 임박 긴 제목이 pill 밖으로 안 넘침', dueFit.titleWithinRow && dueFit.rowNoOverflow, JSON.stringify(dueFit));
  chk('마감 임박 제목 말줄임 + 날짜 span 유지', dueFit.ellipsized && dueFit.dateVisible, JSON.stringify(dueFit));

  /* 개영식 카운트다운 (v0.9.294) — 계산은 공용 `/countdown.js` 로 옮겼다(네 화면 공용).
     경계값 자체는 `regress-krjam-planning-server.js` 가 정본이고, 여기서는 이 화면 배선을 본다.
     ⚠️ 사용자 확정: **2026-08-09 12:00 이후에는 배너·상단 시계를 아예 보여 주지 않는다.**
        예전엔 개영식이 지나도 'D-DAY · 개영!' 이 행사 끝난 뒤까지 대시보드 맨 위를 차지했다. */
  console.log('\n[개영식 카운트다운]');
  chk('공용 모듈이 실려 있다', await page.evaluate(() => !!window.KJCountdown));
  chk('개영 기준이 8/5 20:00 KST', await page.evaluate(() =>
    window.KJCountdown && window.KJCountdown.OPEN_ISO === '2026-08-05T20:00:00+09:00'));
  /* ⚠️ **'배너가 그려지는가'는 실제 시계로 재면 안 된다** — 8/9 12:00 이후엔 숨기는 게 정상이라
     행사가 지난 날에는 무조건 FAIL 한다(v0.9.295, 2026-08-14 에 실제로 빨개졌다).
     아래 '사라지는가' 검사와 대칭으로, **떠 있어야 하는 시각**을 갈아끼워 잰다. */
  const cdOn = await page.evaluate(() => {
    const real = window.Date;
    try {
      const FIXED = new real('2026-08-04T20:00:00+09:00').getTime();
      window.Date = class extends real { constructor(...a) { if (!a.length) super(FIXED); else super(...a); } static now() { return FIXED; } };
      renderDashboard(); renderClock();
      return { banner: ((document.getElementById('dash-dday-t') || {}).textContent || '').trim(),
        hasBanner: !!document.getElementById('dash-dday-t'),
        clock: (document.getElementById('m-clock') || {}).textContent || '' };
    } finally { window.Date = real; renderDashboard(); renderClock(); }
  });
  chk('대시보드 D-day 배너가 있다', cdOn.hasBanner);
  chk('배너 값이 D-형식 또는 D-DAY',
    /^(D-\d+ )?\d{2}:\d{2}:\d{2}$/.test(cdOn.banner) || /D-DAY/.test(cdOn.banner), cdOn.banner);
  chk('상단 시계도 같은 기준으로 찍힌다',
    /\d{2}:\d{2}:\d{2}/.test(cdOn.clock) || /D-DAY/.test(cdOn.clock), cdOn.clock);
  // 시계를 8/9 12:00 이후로 밀면 배너가 사라져야 한다(렌더 함수를 직접 다시 부른다)
  const cdOver = await page.evaluate(() => {
    const real = window.Date;
    try {
      const FIXED = new real('2026-08-09T12:00:01+09:00').getTime();
      window.Date = class extends real { constructor(...a) { if (!a.length) super(FIXED); else super(...a); } static now() { return FIXED; } };
      renderDashboard(); renderClock();
      const clock = document.getElementById('m-clock');
      return { banner: !!document.getElementById('dash-dday-t'),
        clockText: (clock || {}).textContent || '',
        clockBoxHidden: !!(clock && clock.closest('.clock') && clock.closest('.clock').hidden) };
    } finally { window.Date = real; renderDashboard(); renderClock(); }
  });
  chk('행사 종료 후 대시보드 배너가 사라진다', cdOver.banner === false, '배너 존재=' + cdOver.banner);
  chk('행사 종료 후 상단 시계도 비운다', cdOver.clockText === '' && cdOver.clockBoxHidden === true,
    JSON.stringify(cdOver.clockText) + ' / 숨김=' + cdOver.clockBoxHidden);
  /* '원복' 은 **시계를 되돌리면 다시 그려지는가**를 보는 것이지 '오늘 배너가 있는가'가 아니다.
     오늘이 8/9 12:00 을 지났으면 원복해도 배너는 없는 게 맞다 — 시계를 다시 앞으로 밀어 확인한다. */
  chk('원복하면 배너가 다시 나온다', await page.evaluate(() => {
    const real = window.Date;
    try {
      const FIXED = new real('2026-08-04T20:00:00+09:00').getTime();
      window.Date = class extends real { constructor(...a) { if (!a.length) super(FIXED); else super(...a); } static now() { return FIXED; } };
      renderDashboard(); renderClock();
      return !!document.getElementById('dash-dday-t');
    } finally { window.Date = real; renderDashboard(); renderClock(); }
  }));
  /* ⚠️ **'지금 현장' 갱신이 카운트다운 타이머에 얹혀 있었다**(v0.9.294). 배너를 없애자
     `dash-dday-t` 가 사라지고 타이머가 통째로 멈춰 현장 목록까지 죽었다 — 둘을 떼어 놨다. */
  chk('배너가 없어도 "지금 현장" 갱신 타이머는 산다', await page.evaluate(() => {
    const el = document.getElementById('dash-dday-t');
    if (el) el.remove();                       // 배너만 없앤 상태를 만든다
    startDashClock();
    return new Promise((res) => setTimeout(() => res(!!dashClockTimer), 1500));
  }));
  await go('staff');
  chk('홍보부 인원 표 렌더', (await page.$$('#rostertbl tr')).length > 1, (await page.$$('#rostertbl tr')).length + '행');
  chk('인원 표 입영 = 날짜+블록 칩 렌더(datetime 아님)', (await page.$$('#rostertbl .arr-cell .arr-day')).length > 0 && (await page.$$('#rostertbl .arr-cell .arrblk')).length >= 3 && (await page.$$('#rostertbl .arr-in')).length === 0, '드롭다운 ' + (await page.$$('#rostertbl .arr-day')).length + ' · 블록칩 ' + (await page.$$('#rostertbl .arrblk')).length);

  // ===== 현장 지도 — 촬영 공백 (v0.9.216) =====
  // 기준 시각에 일정은 있는데 인원이 없는 구역을 찾는다. smByZone(배치) × ttList(일정) 교차.
  console.log('\n[현장 지도 — 촬영 공백]');
  await go('sitemap');
  const gap = await page.evaluate(() => {
    // 시간 지정 모드로 8/5 12:00 — 급식(food)에 중식 일정이 있으나 담당자 0 → 공백
    smTimeMode = 'pick'; smDay = '2026-08-05'; smTimeMin = 720; renderSiteMap();
    const box = document.getElementById('sm-gaps');
    return { display: box.style.display, zones: (window.smGaps || []).map((g) => g.zone),
      foodMarker: !!document.querySelector('.smzone.gap[data-zone="food"]'),
      stageMarker: !!document.querySelector('.smzone.gap[data-zone="stage"]'),
      text: (box.textContent || '') };
  });
  chk('12:00 급식 일정 있는데 담당 0 → 촬영 공백 감지', gap.zones.indexOf('food') >= 0, gap.zones.join(',') || '없음');
  chk('공백 구역 지도 마커 강조(.smzone.gap)', gap.foodMarker);
  chk('공백 패널 노출 + 문구', gap.display !== 'none' && /촬영 공백/.test(gap.text));
  const nogap = await page.evaluate(() => { smTimeMin = 1200; renderSiteMap();   // 20:00 개영식(담당 r1 stage 배치)
    return { zones: (window.smGaps || []).map((g) => g.zone) }; });
  chk('20:00 개영식은 담당 배치되어 공백 아님(stage)', nogap.zones.indexOf('stage') < 0, nogap.zones.join(',') || '공백 0');

  // ===== 배치도 2026-07-23 최종본 반영 (v0.9.292) =====
  // 핀 좌표는 이미지 2000×1414 기준 비율이다 — 이미지 크기가 바뀌면 좌표 전체가 무의미해지므로 실측으로 못 박는다.
  console.log('\n[배치도 최종본 · 구역]');
  const smImg = await page.evaluate(() => { const i = document.getElementById('sm-img'); return { w: i.naturalWidth, h: i.naturalHeight, alt: i.alt }; });
  chk('배치도 이미지 = 2000×1414 (핀 좌표 기준)', smImg.w === 2000 && smImg.h === 1414, smImg.w + '×' + smImg.h);
  chk('배치도 판(2026-07-23) 이 대체텍스트에 명시', /2026-07-23/.test(smImg.alt), smImg.alt);
  const zs = await page.evaluate(() => {
    const keys = ZONES.map((z) => z.key);
    const out = { keys, dup: keys.length !== new Set(keys).size, outside: [], sameSpot: [] };
    ZONES.forEach((z) => { if (!(z.x > 0 && z.x < 1 && z.y > 0 && z.y < 1)) out.outside.push(z.key); });
    for (let i = 0; i < ZONES.length; i++) for (let j = i + 1; j < ZONES.length; j++)
      if (Math.abs(ZONES[i].x - ZONES[j].x) < 0.004 && Math.abs(ZONES[i].y - ZONES[j].y) < 0.004) out.sameSpot.push(ZONES[i].key + '=' + ZONES[j].key);
    out.match = { p5: zoneForPlace('과정5'), p7: zoneForPlace('과정7'), gym6: zoneForPlace('과정6'), gymName: zoneForPlace('체육관'),
      stage: zoneForPlace('대집회장'), main: zoneForPlace('메인무대'), food: zoneForPlace('급식'), foodNew: zoneForPlace('급식편의시설'),
      safety: zoneForPlace('안전본부'), park: zoneForPlace('주차장'), bus: zoneForPlace('버스 주차장'),
      foodHQ: zoneForPlace('급식편의본부'), bareHQ: zoneForPlace('본부'), jhq: zoneForPlace('JHQ 본부') };
    out.labels = {}; ZONES.forEach((z) => { out.labels[z.key] = z.label; });
    return out;
  });
  chk('신설 구역 4종(과정5·과정7·안전본부·주차장)', ['p5', 'p7', 'safety', 'park'].every((k) => zs.keys.indexOf(k) >= 0), zs.keys.join(','));
  chk('폐지 구역 2종(운영요원·버스 주차장) 제거', zs.keys.indexOf('staffpark') < 0 && zs.keys.indexOf('buspark') < 0);
  chk('구역 key 중복 없음', !zs.dup);
  chk('모든 구역 좌표가 지도 안(0~1)', zs.outside.length === 0, zs.outside.join(',') || '전부 안쪽');
  chk('같은 자리에 겹친 구역 없음(핀 중복 방지)', zs.sameSpot.length === 0, zs.sameSpot.join(' ') || '겹침 0');
  chk('과정5 → 신설 p5 (옛 과정5·체육관으로 새지 않음)', zs.match.p5 === 'p5', '과정5→' + zs.match.p5);
  chk('과정6·체육관 → gym', zs.match.gym6 === 'gym' && zs.match.gymName === 'gym', zs.match.gym6 + ' · ' + zs.match.gymName);
  chk('과정7 → 신설 p7', zs.match.p7 === 'p7', '과정7→' + zs.match.p7);
  chk('대집회장·메인무대 둘 다 stage(옛 장소명 호환)', zs.match.stage === 'stage' && zs.match.main === 'stage', zs.match.stage + ' · ' + zs.match.main);
  chk('급식·급식편의시설 둘 다 food', zs.match.food === 'food' && zs.match.foodNew === 'food', zs.match.food + ' · ' + zs.match.foodNew);
  chk('안전본부 → safety · 주차장 → park', zs.match.safety === 'safety' && zs.match.park === 'park', zs.match.safety + ' · ' + zs.match.park);
  chk('옛 장소명 "버스 주차장" 도 주차장으로 흡수(유실 방지)', zs.match.bus === 'park', '버스 주차장→' + zs.match.bus);
  // '본부' 별칭이 너무 넓어 안전본부·급식편의본부까지 JHQ 로 끌어가던 것(v0.9.292) — '소무대' 와 같은 함정
  chk('"○○본부" 가 JHQ 로 새지 않는다', zs.match.safety === 'safety' && zs.match.foodHQ === 'food', '안전본부→' + zs.match.safety + ' · 급식편의본부→' + zs.match.foodHQ);
  chk('맨 "본부" · "JHQ 본부" 는 여전히 JHQ', zs.match.bareHQ === 'jhq' && zs.match.jhq === 'jhq', zs.match.bareHQ + ' · ' + zs.match.jhq);
  chk('라벨 정정(대집회장·급식편의본부·과정6)', zs.labels.stage === '대집회장' && zs.labels.food === '급식편의본부' && /과정6/.test(zs.labels.gym),
    [zs.labels.stage, zs.labels.food, zs.labels.gym].join(' · '));
  // 구역 마커가 실제로 지도 이미지 경계 안에서 그려지는가(좌표만 맞고 화면 밖이면 소용없다)
  const mk = await page.evaluate(() => {
    const img = document.getElementById('sm-img').getBoundingClientRect(), out = [];
    document.querySelectorAll('#sm-stage .smzone').forEach((e) => { const r = e.getBoundingClientRect();
      if (r.left < img.left - 2 || r.right > img.right + 2 || r.top < img.top - 2 || r.bottom > img.bottom + 2) out.push(e.dataset.zone); });
    return { n: document.querySelectorAll('#sm-stage .smzone').length, out };
  });
  chk('구역 마커 ' + mk.n + '개가 지도 이미지 안에 그려짐', mk.n === zs.keys.length && mk.out.length === 0, mk.out.join(',') || '넘침 0');

  // 분단 연맹 목록 = 배치도 최종본 기준 1회 정합(멱등 · 표식 fedver)
  const dv = await page.evaluate(() => {
    state.divisions = [
      { id: 'd1', name: '큰물결분단', federations: '전북연맹, 제주연맹, 원불교연맹, 대만, 말레이시아, 스리랑카', leader: '엄정영' },
      { id: 'd2', name: '푸른별분단', federations: '경남연맹, 강원연맹, 대구연맹, 불교연맹, 말레이시아, 대만, 라이베리아' },
      { id: 'd3', name: '꿈동산분단', federations: '경기남부연맹, 대전연맹, 방글라데시, 홍콩, 마카오' },
      { id: 'd4', name: '솔바람분단', federations: '서울남부연맹, 인천연맹, 충남세종연맹, 기독교연맹, 대만, 말레이시아, 필리핀' },
      { id: 'd5', name: '테스트분단', federations: '직접 추가한 연맹' },
    ];
    const first = migrateDivisionFeds(), second = migrateDivisionFeds();   // 두 번째는 0 이어야 멱등
    const by = {}; state.divisions.forEach((e) => { by[e.name] = e; });
    // 사용자가 나중에 연맹을 더해도 다음 로드에서 되돌아가면 안 된다
    by['큰물결분단'].federations += ', 라오스';
    const third = migrateDivisionFeds();
    return { first, second, third, leaderKept: by['큰물결분단'].leader,
      gn: by['큰물결분단'].federations, pb: by['푸른별분단'].federations, kd: by['꿈동산분단'].federations,
      sb: by['솔바람분단'].federations, mine: by['테스트분단'].federations, mineVer: by['테스트분단'].fedver };
  });
  chk('연맹 정합 1회차 = 3건 변경(큰물결·푸른별·꿈동산)', dv.first === 3, '변경 ' + dv.first + '건');
  chk('말레이시아·대구연맹·라이베리아·홍콩 삭제', !/말레이시아/.test(dv.gn) && !/대구연맹|라이베리아/.test(dv.pb) && !/홍콩/.test(dv.kd),
    [dv.gn, dv.pb, dv.kd].join(' | '));
  chk('솔바람(지도와 동일)은 그대로', dv.sb === '서울남부연맹, 인천연맹, 충남세종연맹, 기독교연맹, 대만, 말레이시아, 필리핀', dv.sb);
  chk('분단장 등 다른 칸은 보존', dv.leaderKept === '엄정영', dv.leaderKept);
  chk('사용자가 추가한 분단은 건드리지 않음', dv.mine === '직접 추가한 연맹' && !dv.mineVer, dv.mine + ' / fedver=' + dv.mineVer);
  chk('멱등 — 두 번째 실행은 변경 0', dv.second === 0, dv.second + '건');
  chk('표식(fedver) 이후 사용자가 더한 연맹은 되돌리지 않음', dv.third === 0 && /라오스/.test(dv.gn), dv.third + '건 · ' + dv.gn);

  // ===== 콘텐츠 보드 — 열 너비 슬라이더 + 열 표시(숨기기) (v0.9.216) =====
  console.log('\n[보드 열 너비 · 열 표시]');
  await go('list');
  const bvc = await page.evaluate(() => ({ slider: !!document.getElementById('board-colw'),
    chips: document.querySelectorAll('#board-cols [data-colv]').length }));
  chk('열 너비 슬라이더 존재', bvc.slider);
  chk('열 표시 토글 = 5(인박스+4단계)', bvc.chips === 5, bvc.chips + '개');
  const cwv = await page.evaluate(() => { const s = document.getElementById('board-colw'); s.value = 480; s.dispatchEvent(new Event('input', { bubbles: true }));
    return getComputedStyle(document.getElementById('board')).getPropertyValue('--board-colw').trim(); });
  chk('슬라이더 → --board-colw 갱신', cwv === '480px', cwv);
  const hid = await page.evaluate(() => { const before = document.querySelectorAll('#board .col').length;
    document.querySelector('#board-cols [data-colv="draft"]').click(); const after = document.querySelectorAll('#board .col').length;
    return { before, after, off: document.querySelector('#board-cols [data-colv="draft"]').classList.contains('off') }; });
  chk('열 숨기기 → 컬럼 감소 + 칩 off', hid.after === hid.before - 1 && hid.off, hid.before + '→' + hid.after);
  await page.evaluate(() => { document.querySelector('#board-cols [data-colv="draft"]').click(); const s = document.getElementById('board-colw'); s.value = 300; s.dispatchEvent(new Event('input', { bubbles: true })); });   // 복원
  // 보드가 넓은 화면을 빈 공간 없이 채운다 — 열 수만큼 명시 그리드(repeat(N,minmax..1fr))로 1fr 이 늘어난다
  const bfill = await page.evaluate(() => { const bd = document.getElementById('board'); const n = bd.querySelectorAll('.col').length;
    return { n, tracks: (getComputedStyle(bd).gridTemplateColumns || '').split(' ').filter(Boolean).length, tail: Math.round(bd.getBoundingClientRect().right - bd.querySelectorAll('.col')[n - 1].getBoundingClientRect().right) }; });
  chk('보드 = 열 수만큼 그리드 트랙(빈 공간 없이 채움)', bfill.tracks === bfill.n && bfill.tail <= 24, JSON.stringify(bfill));

  // ===== 콘텐츠 슬롯 모달 — 각 영역이 또렷한 박스로 (v0.9.220) =====
  const slotBox = await page.evaluate(() => {
    const c = document.querySelector('#board .card:not(.card-inbox)'); if (!c) return { opened: false };
    c.click();
    const fld = document.querySelector('.scrim.show .slot .fld'); if (!fld) return { opened: !!document.querySelector('.scrim.show .slot'), fld: false };
    const cs = getComputedStyle(fld);
    const boxed = cs.borderTopWidth !== '0px' && !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(cs.backgroundColor) && cs.backgroundColor !== 'transparent';
    // 섹션 안 입력은 흰색(회색 섹션과 대비)
    const inp = document.querySelector('.scrim.show .slot .fld input[type=text]');
    const white = inp ? getComputedStyle(inp).backgroundColor : '';
    return { opened: true, fld: true, boxed, sections: document.querySelectorAll('.scrim.show .slot .fld').length, white };
  });
  chk('콘텐츠 슬롯 모달 — 각 영역이 테두리+배경 박스', slotBox.opened && slotBox.fld && slotBox.boxed && slotBox.sections >= 7, JSON.stringify({ boxed: slotBox.boxed, n: slotBox.sections }));
  await page.evaluate(() => { const x = document.querySelector('.scrim.show .x, .scrim.show #modal-close, .scrim.show [data-close]'); if (x) x.click(); else if (typeof closeModal === 'function') closeModal(); });
  await new Promise((r) => setTimeout(r, 150));

  // ===== 기사 게시판 — 선택칸·단계·카드뉴스 + 모달 본문 (v0.9.250, 구 아코디언 대체) =====
  console.log('\n[기사 게시판]');
  await go('news');
  const nl = await page.evaluate(() => ({ table: !!document.querySelector('.newstbl'),
    ths: [...document.querySelectorAll('.newstbl th')].map((t) => t.textContent.replace(/[▲▼]/g, '').trim()),
    no: (document.querySelector('.newstbl td.nr-no') || {}).textContent,
    ckall: !!document.getElementById('news-ckall'), ck: document.querySelectorAll('[data-news-ck]').length,
    st: !!document.querySelector('#news-list td.nr-pub .pst'), cn: !!document.querySelector('.flagtog.cn'),
    pri: !!document.querySelector('#news-list td.nr-pri .star'), en: !!document.querySelector('#news-list td.nr-en .enchip'),
    inline: document.querySelectorAll('.news-detailrow').length }));
  chk('목차 표 10열(선택·번호·제목·작성자·담당·협조부서·작성일·우선순위·단계·영문·카드뉴스)', nl.table
    && nl.ths.join(',') === ',번호,제목,작성자 · 담당,협조부서,작성일,우선순위,단계,영문,카드뉴스', nl.ths.join(','));
  chk('글 번호 표기', nl.no === '1', nl.no);
  chk('선택 체크박스(전체 + 행)', nl.ckall && nl.ck === 1, 'ckall=' + nl.ckall + ' ck=' + nl.ck);
  chk('단계 칩·카드뉴스 토글 존재', nl.st && nl.cn);
  chk('우선순위 별점·영문 검토 칩 존재 (v0.9.252)', nl.pri && nl.en, '별=' + nl.pri + ' 영문=' + nl.en);
  chk('본문을 목록에 끼워 넣지 않음', nl.inline === 0, 'inline=' + nl.inline);
  const exp = await page.evaluate(async () => { document.querySelector('[data-news-view]').click();
    await new Promise((r) => setTimeout(r, 300));
    const b = document.getElementById('nv-body');
    return { open: document.getElementById('newsview-scrim').classList.contains('show'),
      strong: !!(b && b.querySelector('.news-text strong')), inline: document.querySelectorAll('.news-detailrow').length }; });
  chk('제목 클릭 → 읽기 모달 + 리치텍스트(strong) 정화 렌더', exp.open && exp.strong && exp.inline === 0, JSON.stringify(exp));
  const nflag = await page.evaluate(async () => { document.querySelector('[data-nv-st="published"]').click(); await new Promise((r) => setTimeout(r, 300));
    return { f: window.__newsFlag, on: document.querySelector('[data-nv-st="published"]').className.includes('solid') }; });
  chk('단계 버튼 → flags API(stage=published) + 강조', nflag.f && nflag.f.action === 'flags' && nflag.f.stage === 'published' && nflag.on, JSON.stringify(nflag.f));
  await page.evaluate(() => { const x = document.getElementById('nv-cancel'); if (x) x.click(); });
  await new Promise((r) => setTimeout(r, 200));

  // ===== 보도자료 게시판 (v0.9.219) — 홍보부 전용 목차 + 상태 + 첨부 + 작성 =====
  console.log('\n[보도자료 게시판]');
  await go('press');
  const PR = await page.evaluate(() => ({ table: !!document.querySelector('#press-list .newstbl'),
    ths: [...document.querySelectorAll('#press-list .newstbl th')].map((t) => t.textContent.trim()),
    no: (document.querySelector('#press-list td.nr-no') || {}).textContent,
    date: (document.querySelector('#press-list td.nr-date') || {}).textContent,
    contact: (document.querySelector('#press-list td.nr-author') || {}).textContent,
    chip: !!document.querySelector('#press-list .pst'),
    bar: (document.getElementById('press-bar') || {}).textContent }));
  // v0.9.249: 아코디언 → 게시판(선택 체크박스 · 읽기 모달 · 단계 3종). 깊은 검증은 regress-krjam-press.js.
  chk('보도자료 목차 6열(선택·번호·제목·배포일·담당자·단계) + 통계바',
    PR.table && PR.ths.join(',') === ',번호,제목,배포일,담당자,단계' && /전체/.test(PR.bar), PR.ths.join(','));
  chk('배포일·담당자 표기 + 단계 칩', PR.no === '1' && PR.date === '2026-08-05' && PR.contact === '박지민' && PR.chip, JSON.stringify(PR));
  const PRx = await page.evaluate(async () => {
    document.querySelector('[data-press-view]').click();
    await new Promise((r) => setTimeout(r, 300));
    const sc = document.getElementById('pressview-scrim'), body = document.getElementById('pv-body');
    const out = { open: sc.classList.contains('show'), inline: document.querySelectorAll('#press-list .news-detailrow').length,
      strong: !!body.querySelector('.news-text strong'), att: !!body.querySelector('.press-att'),
      outlets: /연합뉴스|강원일보|매체/.test(body.textContent), stages: document.querySelectorAll('#pv-tools [data-pv-st]').length };
    document.getElementById('pv-cancel').click();
    return out;
  });
  chk('제목 클릭 → 읽기 모달(본문 정화·첨부·매체·단계 3종)',
    PRx.open && PRx.inline === 0 && PRx.strong && PRx.att && PRx.outlets && PRx.stages === 3, JSON.stringify(PRx));
  const PRs = await page.evaluate(async () => {
    document.querySelector('[data-press-view]').click(); await new Promise((r) => setTimeout(r, 250));
    document.querySelector('#pv-tools [data-pv-st="published"]').click(); await new Promise((r) => setTimeout(r, 250));
    document.getElementById('pv-cancel').click();
    return window.__pressSave;
  });
  chk('단계 지정 → status API(published)', PRs && PRs.action === 'status' && PRs.status === 'published', JSON.stringify(PRs));
  const PRb = await page.evaluate(async () => {
    document.getElementById('press-ckall').click(); await new Promise((r) => setTimeout(r, 250));
    const bar = document.querySelector('.press-bulk');
    const out = { bulk: !!bar, bulkSt: document.querySelectorAll('[data-press-bulk-st]').length, del: !!document.querySelector('[data-press-bulk-del]') };
    if (document.querySelector('[data-press-selnone]')) document.querySelector('[data-press-selnone]').click();
    return out;
  });
  chk('다중 선택 → 일괄 바(단계 3 · 삭제)', PRb.bulk && PRb.bulkSt === 3 && PRb.del, JSON.stringify(PRb));
  const PRn = await page.evaluate(async () => { openPressEditor(null); await new Promise((r) => setTimeout(r, 140));
    const has = { title: !!document.getElementById('pe-title'), date: !!document.getElementById('pe-date'), outlets: !!document.getElementById('pe-outlets'), body: !!document.getElementById('pe-bodywrap'), status: !!document.getElementById('pe-status'), atts: !!document.getElementById('pe-atts'), secs: document.querySelectorAll('#press-body .fl-sec').length };
    document.getElementById('pe-title').value = '새 보도자료'; document.getElementById('pe-title').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('pe-outlets').value = '강원일보'; document.getElementById('pe-outlets').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#pe-status [data-pst="published"]').click();
    pressEdit.body = '<p>본문</p>'; document.getElementById('press-save').click(); await new Promise((r) => setTimeout(r, 200));
    return { has, save: window.__pressSave }; });
  chk('작성 모달(제목·배포일·매체·본문·단계·첨부) + 저장(published·매체)', PRn.has.title && PRn.has.date && PRn.has.outlets && PRn.has.body && PRn.has.status && PRn.has.atts && PRn.save && PRn.save.title === '새 보도자료' && PRn.save.status === 'published' && PRn.save.outlets === '강원일보', JSON.stringify({ has: PRn.has, s: PRn.save && PRn.save.status }));
  chk('모달 섹션이 박스로 구분(.fl-sec) — 입력 영역 구분', PRn.has.secs >= 5, PRn.has.secs + '박스');

  // ===== 동시편집 유실 방지 — 버전 가드 + 서버 병합 반영 (v0.9.221) =====
  console.log('\n[동시편집 병합]');
  const bv0 = await page.evaluate(() => (window.boardVer && window.boardVer.timetable) || null);
  chk('불러온 버전(boardVer) 저장', bv0 === 'V1', 'timetable=' + bv0);
  const baseSent = await page.evaluate(async () => { window.__put.length = 0; saveTimetable(); await new Promise((r) => setTimeout(r, 700));
    const p = window.__put.filter((x) => x.timetable).pop(); return p && p.baseVer && p.baseVer.timetable; });   // 다른 디바운스 저장과 경합하지 않게 timetable put 만 집는다(플레이키 제거)
  chk('저장 시 baseVer(불러온 버전) 동봉', baseSent === 'V1', 'baseVer.timetable=' + baseSent);
  const mrg = await page.evaluate(async () => {
    const rf = window.fetch;
    window.fetch = (u, o) => { u = String(u && u.url ? u.url : u);
      if (u.startsWith('/api/jamboree-plan') && o && o.method === 'PUT') {
        const merged = state.timetable.slice().concat([{ id: 'tX', day: '2026-08-05', start: '15:00', end: '16:00', title: '남이_추가한_일정', cat: '프로그램', assignees: [], contacts: [], rundown: [] }]);
        return Promise.resolve(new Response(JSON.stringify({ ok: true, key: 'timetable', updatedAt: 'V2', merged: true, value: merged }), { headers: { 'content-type': 'application/json' } }));
      }
      return rf(u, o); };
    saveTimetable(); await new Promise((r) => setTimeout(r, 700)); window.fetch = rf;
    return { has: state.timetable.some((t) => t.id === 'tX'), ver: window.boardVer.timetable };
  });
  chk('충돌 시 서버 병합본 반영(남의 항목 보존) + 버전 갱신', mrg.has && mrg.ver === 'V2', JSON.stringify(mrg));

  // ===== 디자인 계측 =====
  // 디자인 변경은 눈으로만 확인하기 쉬워 조용히 무너진다. 규칙을 테스트로 고정한다.
  console.log('\n[디자인 — 대비]');
  const CR = (a, b) => { // WCAG 2.1 상대휘도
    const L = (h) => { const c = h.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const l1 = L(a), l2 = L(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05);
  };
  await go('timetable');
  const white = await page.evaluate(() => {
    // 흰 글씨를 얹는 요소를 실제 계산값으로 수집 (일정표 블록 · 배지 · 선택된 상태 버튼)
    const out = [];
    document.querySelectorAll('.ttg-ev:not(.nocover), .solid, .chchip, .tip-src').forEach((el) => {
      const cs = getComputedStyle(el);
      if (/255,\s*255,\s*255/.test(cs.color)) out.push({ what: el.className.split(' ')[0] + '·' + (el.textContent || '').trim().slice(0, 8), bg: cs.backgroundColor, fg: cs.color });
    });
    return out;
  });
  const wbad = white.filter((w) => /rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(w.bg) ? false : CRx(w.fg, w.bg) < 4.5);
  function CRx(a, b) { return CR(a, b); }
  chk('흰 글씨를 얹는 요소 전부 대비 4.5+', wbad.length === 0,
    wbad.length ? wbad.map((w) => w.what + ' ' + CR(w.fg, w.bg).toFixed(2)).join(' | ') : white.length + '개 검사');

  // 다크 관제(v0.9.183): 토큰이 이중 역할이라 대비 계약을 둘로 나눈다 —
  //  솔리드(상태·단계·위험)는 "흰 글씨를 얹는 배경"이라 흰색 대비 4.5+,
  //  텍스트 역할(muted/ink-2)은 어두운 지면(--bg) 위에서 4.5+.
  const themed = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue(k).trim();
    return { bg: g('--bg'),
      solids: ['--st-planned', '--st-draft', '--st-ready', '--danger', '--c-sub', '--c-app', '--c-fin', '--c-rest'].map((k) => [k, g(k)]),
      texts: ['--muted', '--ink-2', '--ink'].map((k) => [k, g(k)]) }; });
  const h2 = (h) => { h = h.replace('#', ''); return 'rgb(' + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',') + ')'; };
  const sbad = themed.solids.filter(([, v]) => v.startsWith('#') && CR(h2(v), 'rgb(255,255,255)') < 4.5);
  chk('상태·단계 솔리드 전부 흰 글씨 4.5+', sbad.length === 0, sbad.map(([k, v]) => k + ' ' + v).join(' | ') || themed.solids.length + '개 검사');
  const ground = themed.bg.startsWith('#') ? h2(themed.bg) : themed.bg;
  const xbad = themed.texts.filter(([, v]) => v.startsWith('#') && CR(h2(v), ground) < 4.5);
  chk('텍스트 토큰 전부 지면 대비 4.5+', xbad.length === 0, xbad.map(([k, v]) => k + ' ' + v + ' vs ' + themed.bg).join(' | ') || themed.texts.length + '개 검사(지면 ' + themed.bg + ')');

  // ===== 의전 촬영 담당 (v0.9.211) =====
  // 값은 protocol[].assignees 하나다. 세 화면이 각자 복사본을 들면 반드시 어긋나므로
  // "어느 쪽에서 고쳐도 같은 배열"이라는 계약을 여기서 고정한다.
  console.log('\n[의전 촬영 담당 — 3면 공유]');
  await go('protocol');
  const pr1 = await page.evaluate(() => {
    state.protocol = [{ id: 'prot-t1', role: '대회장', name: '이찬희', title: '총재', date: '2026-08-05', time: '20:00', endTime: '21:30', activity: '개영식 참석', place: '메인무대', memo: '', assignees: [] }];
    renderProtocol();
    const cellBtn = document.querySelector('#pr-body .pr-asgbtn');
    const empty = cellBtn ? cellBtn.textContent.trim() : '';
    if (cellBtn) cellBtn.click();                                  // 표 → 지정 모달(일정표와 같은 모달)
    const chips = document.querySelectorAll('#pra-chips .pr-asg').length;
    const b = document.querySelector('#pra-chips .pr-asg[data-pid="r1"]'); if (b) b.click();
    closeProtAssign();
    const filled = (document.querySelector('#pr-body .pr-asgbtn') || {}).textContent || '';
    return { empty, chips, filled: filled.trim(), asg: (protById('prot-t1').assignees || []).slice() };
  });
  chk('의전 표: 담당 버튼 → 지정 모달 → 반영', pr1.chips === 2 && JSON.stringify(pr1.asg) === '["r1"]' && /김기자/.test(pr1.filled),
    pr1.empty + ' → ' + pr1.filled + ' · ' + JSON.stringify(pr1.asg));
  await go('timetable');
  const pr2 = await page.evaluate(() => {
    const blk = document.querySelector('.ttg-pr[data-pid="prot-t1"]');
    const shown = blk ? ((blk.querySelector('.ttg-evp') || {}).textContent || '').trim() : '(블록 없음)';
    if (blk) blk.click();
    const open = document.getElementById('pra-scrim').classList.contains('show');
    const b = document.querySelector('#pra-chips .pr-asg[data-pid="r2"]'); if (b) b.click();
    closeProtAssign();
    return { shown, open, asg: (protById('prot-t1').assignees || []).slice() };
  });
  chk('일정표 의전 블록: 담당 표시 + 클릭 시 지정 모달', /김기자/.test(pr2.shown) && pr2.open, pr2.shown + ' / 모달 ' + pr2.open);
  chk('일정표에서 추가 → 같은 배열에 반영(쌍방)', JSON.stringify(pr2.asg) === '["r1","r2"]', JSON.stringify(pr2.asg));
  const pr3 = await page.evaluate(() => {
    mergeShootlistFromProtocol();
    const row = shootListData().filter((r) => r.prId === 'pr:prot-t1')[0];
    const shared = row ? shootAssignees(row).slice() : null;
    if (row) toggleShootAssignee(row, 'r1');   // 촬영 리스트에서 해제
    return { made: !!row, title: row && row.title, shared, protAfter: (protById('prot-t1').assignees || []).slice(), placed: protAssignedTo('r2').length };
  });
  chk('촬영 리스트: 담당 지정된 의전만 행 생성', pr3.made && /개영식 참석/.test(pr3.title || ''), pr3.title || '(없음)');
  chk('촬영 리스트에서 해제 → 의전에도 반영(쌍방)', JSON.stringify(pr3.shared) === '["r1","r2"]' && JSON.stringify(pr3.protAfter) === '["r2"]', JSON.stringify(pr3.shared) + ' → ' + JSON.stringify(pr3.protAfter));
  chk('현장 배치: 의전 촬영도 그 인원 배치로 파생', pr3.placed === 1, pr3.placed + '건');
  const pr4 = await page.evaluate(() => {
    state.offtimes = { r2: { '2026-08-05': { eve: true } } };   // 19–22 오프 → 20:00 의전과 겹침
    setView('protocol'); renderProtocol();
    document.querySelector('#pr-body .pr-asgbtn').click();
    const b = document.querySelector('#pra-chips .pr-asg[data-pid="r2"]');
    const flagged = b ? (b.classList.contains('offdis') || b.classList.contains('offwarn')) : null;
    const before = (protById('prot-t1').assignees || []).length;
    const fresh = b && !b.classList.contains('offwarn');          // 미배정 + 오프 = 클릭해도 배정되면 안 됨
    if (fresh) b.click();
    const after = (protById('prot-t1').assignees || []).length;
    closeProtAssign();
    return { flagged, blocked: !fresh || after === before, txt: b ? b.textContent.trim() : '' };
  });
  chk('오프타임과 겹치면 배정 차단/경고', pr4.flagged === true && pr4.blocked, pr4.txt + ' · 차단=' + pr4.blocked);
  const arr = await page.evaluate(() => {
    // 입영 시점 = 현장 도착 일시. 그 이전 업무엔 담당 배정 불가(오프타임과 같은 가드).
    const m = rosterById('r2'); m.arrive = '2026-08-06T09:00';   // r2 는 8/6 09:00 입영
    state.offtimes = {};                                          // 오프타임과 분리 — 입영만 검증
    // 순수 판정: 입영 이전(8/5 20:00)=차단 · 입영 이후(8/6 10:00)=허용 · 같은 날 더 이른 시각(8/6 08:00)=차단
    const beforeArrive = assignBlock('r2', '2026-08-05', 20, 21.5);
    const afterArrive = assignBlock('r2', '2026-08-06', 10, 11);
    const sameDayEarly = assignBlock('r2', '2026-08-06', 8, 9);
    // UI: 8/5 20:00 의전 담당 칩에서 r2 는 입영 전이라 클릭해도 배정되면 안 됨
    protById('prot-t1').assignees = [];
    setView('protocol'); renderProtocol();
    document.querySelector('#pr-body .pr-asgbtn').click();
    const b = document.querySelector('#pra-chips .pr-asg[data-pid="r2"]');
    const dis = b ? b.classList.contains('offdis') : null;
    const before = (protById('prot-t1').assignees || []).length;
    if (b && !b.classList.contains('offwarn')) b.click();
    const after = (protById('prot-t1').assignees || []).length;
    closeProtAssign();
    m.arrive = '';   // 정리 — 이후 테스트에 영향 없게
    return { bTag: beforeArrive && beforeArrive.tag, aNull: afterArrive === null, seBlocked: sameDayEarly !== null, dis, blocked: after === before, txt: b ? b.textContent.trim() : '' };
  });
  chk('입영 이전=차단 · 이후=허용 (판정)', arr.bTag === '입영 전' && arr.aNull === true && arr.seBlocked === true, '이전=' + arr.bTag + ' · 이후허용=' + arr.aNull + ' · 같은날이른차단=' + arr.seBlocked);
  chk('입영 전 담당 칩 배정 차단 (UI)', arr.dis === true && arr.blocked === true, arr.txt + ' · 차단=' + arr.blocked);
  const enf = await page.evaluate(() => {
    const r1 = rosterById('r1'); r1.arrive = ''; state.offtimes = {};
    // 결정론: r1 을 모든 담당에서 제거 후 의전 prot-t1(8/5 20:00) 한 곳에만 배정
    ttList().forEach((t) => { const a = t.assignees || []; const i = a.indexOf('r1'); if (i >= 0) a.splice(i, 1); });
    protocolList().forEach((p) => { const a = p.assignees || []; const i = a.indexOf('r1'); if (i >= 0) a.splice(i, 1); });
    shootListData().forEach((m) => { if (m.ttId || m.prId) return; const a = m.assignees || []; const i = a.indexOf('r1'); if (i >= 0) a.splice(i, 1); });
    protById('prot-t1').assignees = ['r1'];
    window.confirm = () => true;                        // 확인 다이얼로그 자동 수락
    r1.arrive = '2026-08-06T09:00';                     // 입영을 8/6 로 늦게 설정 → 8/5 담당은 입영 전
    const removed = enforceAvailability('r1');
    const after = (protById('prot-t1').assignees || []).slice();
    // 취소 시나리오 — confirm=false → 유지
    protById('prot-t1').assignees = ['r1']; window.confirm = () => false;
    const kept0 = enforceAvailability('r1');
    const kept = (protById('prot-t1').assignees || []).slice();
    r1.arrive = ''; protById('prot-t1').assignees = [];  // 정리
    // 독립 촬영행: 자유 텍스트 sched 파싱 + 배정 가드
    const parse = shootSchedWhen({ sched: '8/6 14:00~15:00' });
    const r2 = rosterById('r2'); r2.arrive = '2026-08-06T18:00';
    const shBlk = assignBlock('r2', parse.date, parse.sH, parse.eH);   // 8/6 14:00 < 입영 18:00 → 차단
    r2.arrive = '';
    return { removed, after, kept0, kept, pd: parse.date, ph: parse.sH, shTag: shBlk && shBlk.tag };
  });
  chk('입영 늦게 설정 → 기존 담당 해제(확인 수락)', enf.removed === 1 && enf.after.length === 0, '해제=' + enf.removed + ' · 남음=' + JSON.stringify(enf.after));
  chk('확인 취소 시 배정 유지', enf.kept0 === 0 && JSON.stringify(enf.kept) === '["r1"]', '유지=' + JSON.stringify(enf.kept));
  chk('촬영 sched 파싱 + 독립행 배정 가드', enf.pd === '2026-08-06' && enf.ph === 14 && enf.shTag === '입영 전', enf.pd + ' ' + enf.ph + ' · ' + enf.shTag);
  const offlink = await page.evaluate(() => {
    const r2 = rosterById('r2'); r2.arrive = '2026-08-06T09:00';   // 8/6 09:00 입영 → 그 이전 시간대 자동 오프
    setView('staff'); renderStaff();
    const arr = document.querySelectorAll('#offtimes .offtog.arr');
    const noToggle = [].every.call(arr, (e) => !e.hasAttribute('data-pid'));   // 자동 오프는 토글 아님
    const oneBtn = document.querySelector('#offtimes .offtog[data-pid]');
    const stacked = oneBtn ? getComputedStyle(oneBtn).display === 'block' : false;   // 셀 3블록 세로 스택
    r2.arrive = '';
    return { n: arr.length, noToggle, stacked };
  });
  chk('입영 전 시간대가 오프타임 그리드에 자동표시(연계)', offlink.n > 0 && offlink.noToggle === true, offlink.n + '칸 · 토글아님=' + offlink.noToggle);
  chk('오프타임 셀 3블록 세로 스택(좁은 화면 깨짐 방지)', offlink.stacked === true, 'display=' + (offlink.stacked ? 'block' : 'other'));
  const arrchip = await page.evaluate(() => {
    window.confirm = () => true;
    rosterById('r1').arrive = ''; rosterById('r2').arrive = '';
    setView('staff'); renderStaff();
    const daySel = document.querySelectorAll('#rostertbl tr.member-row')[0].querySelector('.arr-day');   // r1
    daySel.value = '2026-08-06'; daySel.dispatchEvent(new Event('change'));
    const afterDay = rosterById('r1').arrive;                          // 날짜 선택 → 오전 기본(09:00)
    document.querySelectorAll('#rostertbl tr.member-row')[0].querySelector('.arrblk[data-blk="eve"]').click();
    const afterEve = rosterById('r1').arrive;                          // 저녁 칩 → 19:00
    rosterById('r1').arrive = '';
    return { afterDay, afterEve };
  });
  chk('입영 칩: 날짜→오전 기본, 저녁 칩→19:00 저장', arrchip.afterDay === '2026-08-06T09:00' && arrchip.afterEve === '2026-08-06T19:00', arrchip.afterDay + ' → ' + arrchip.afterEve);
  const prune = await page.evaluate(() => {
    window.confirm = () => true;
    rosterById('r2').arrive = '';
    const r1 = rosterById('r1'); r1.arrive = '';
    offMap().r1 = { '2026-08-02': { am: true, pm: true }, '2026-08-05': { eve: true } };   // 8/2 오전·오후 수동오프 + 8/5 저녁
    r1.arrive = '2026-08-02T19:00';                       // 8/2 저녁 입영 → 8/2 오전·오후는 입영 전
    const removed = pruneOffBeforeArrival('r1');          // 입영 전 수동오프 정리
    const m = offMap().r1 || {};
    setView('staff'); renderStaff();
    const heads = [].map.call(document.querySelectorAll('#offtimes thead th'), (t) => t.textContent);
    const arrCells = document.querySelectorAll('#offtimes .offtog.arr').length;   // r1 8/2 오전·오후 = 앰버 2칸
    r1.arrive = ''; offMap().r1 = {};
    return { removed, gone0802: !m['2026-08-02'], kept0805: !!(m['2026-08-05'] && m['2026-08-05'].eve), has0802col: heads.some((h) => /8\/2/.test(h)), arrCells };
  });
  chk('입영 전 수동오프 정리(입영 후는 유지)', prune.removed === 2 && prune.gone0802 === true && prune.kept0805 === true, '지움=' + prune.removed + ' · 8/2삭제=' + prune.gone0802 + ' · 8/5유지=' + prune.kept0805);
  chk('오프타임 그리드 8/2부터 포함 + 입영 전 회색 음영', prune.has0802col === true && prune.arrCells >= 2, '8/2열=' + prune.has0802col + ' · 음영칸=' + prune.arrCells);
  const goff = await page.evaluate(() => {
    rosterById('r1').arrive = ''; rosterById('r2').arrive = '';
    const pm = assignBlock('r2', '2026-08-09', 14, 15);    // 8/9 오후 → 전체 오프
    const eve = assignBlock('r2', '2026-08-09', 19, 20);   // 8/9 저녁 → 전체 오프
    const am = assignBlock('r2', '2026-08-09', 9, 10);     // 8/9 오전 → 배정 가능
    const other = assignBlock('r2', '2026-08-05', 14, 15); // 다른 날 오후 → 배정 가능
    setView('staff'); renderStaff();
    const goffCells = document.querySelectorAll('#offtimes .offtog.goff').length;
    return { pmTag: pm && pm.tag, eveTag: eve && eve.tag, amNull: am === null, otherNull: other === null, goffCells };
  });
  chk('8/9 오후·저녁 = 전체 오프(배정 불가) · 오전·타일 가능', goff.pmTag === '전체 오프' && goff.eveTag === '전체 오프' && goff.amNull === true && goff.otherNull === true, 'pm=' + goff.pmTag + ' eve=' + goff.eveTag + ' am가능=' + goff.amNull);
  chk('오프타임 그리드에 전체 오프(빨강 빗금) 셀 표시', goff.goffCells > 0, goff.goffCells + '칸');
  const flush = await page.evaluate(async () => {
    window.__put.length = 0;
    rosterById('r1').name = '변경중';
    saveRoster();                                        // 디바운스(500ms) — 아직 서버 전송 전
    const beforeFlush = window.__put.filter((x) => x.roster).length;
    await window.flushPendingSaves();                    // 새 버전 감지 시 호출되는 flush → 즉시 발사
    const afterFlush = window.__put.filter((x) => x.roster).length;
    return { beforeFlush, afterFlush, hook: typeof window.flushPendingSaves };
  });
  chk('새 버전 flush: 대기 저장 즉시 발사(작업 유실 방지)', flush.hook === 'function' && flush.beforeFlush === 0 && flush.afterFlush >= 1, '훅=' + flush.hook + ' · 전=' + flush.beforeFlush + ' 후=' + flush.afterFlush);
  const ssj = await page.evaluate(() => {
    mergeSuperstarJ(); mergeSuperstarJ();   // 멱등 — 두 번 병합해도 5건
    const L = ttList().filter((t) => /^ssj-/.test(t.id));
    mergeShootlistFromTimetable();
    const rows = shootListData().filter((r) => /^tt:ssj-/.test(r.ttId || ''));
    return { n: L.length, cat: L[0] && L[0].cat, place: L[0] && L[0].place, shoot: rows.length, pt: (rows[0] || {}).point };
  });
  chk('슈퍼스타J 5회차 일정표 병합(멱등)', ssj.n === 5 && ssj.place === '소무대' && ssj.cat === '행사', ssj.n + '건 @' + ssj.place);
  chk('슈퍼스타J → 촬영 리스트 + 촬영 포인트 시드', ssj.shoot === 5 && /첫 참가팀/.test(ssj.pt || ''), ssj.shoot + '행 · ' + (ssj.pt || ''));

  /* ===== 시드 재주입 금지 (v0.9.232) =====
   * 로드 때 도는 시드/복원 로직이 "그 id 가 없다"를 "아직 안 들어왔다"로만 읽어, 사용자가 **지운** 것을
   * 매 로드마다 되살리고 서버에 다시 PUT 했다. 최악은 의전 — 시드를 다 지우고 직접 짠 일정이
   * 통째로 시드 41건으로 덮어써졌다(공유 KV·복구 불가). 양방향(저장된 보드 / 새 보드) 모두 고정한다. */
  console.log('\n[시드 재주입 금지]');
  const guard = bootSnap;   // 부팅 직후 스냅샷(위에서 채집) — 이후 테스트의 픽스처 덮어쓰기와 무관
  chk('저장된 보드 판정(versions 에 도메인 존재)', guard.stored === true && guard.fresh === false, '저장됨=' + guard.stored + ' · 미저장=' + guard.fresh);
  chk('지운 회의 시드가 되살아나지 않음', guard.events === 0, guard.events + '건');
  chk('사용자 의전 행이 시드 41건으로 교체되지 않음(데이터 소실 방지)', guard.protoUser === 1 && guard.protoSeed === 0, '사용자행=' + guard.protoUser + ' · 시드행=' + guard.protoSeed);
  const freshSeed = await page.evaluate(() => {
    const bv = window.boardVer, ev = state.events, pr = state.protocol, ml = state.meals;
    window.boardVer = {};                                   // 저장본이 없는 새 보드
    state.events = []; state.protocol = []; state.meals = {};
    mergeSeedMeetings(); upgradeProtocol(); upgradeMeals();
    const out = { ev: (state.events || []).length, pr: (state.protocol || []).length, ml: Object.keys((state.meals || {}).crew_n || {}).length };
    window.boardVer = bv; state.events = ev; state.protocol = pr; state.meals = ml;
    return out;
  });
  chk('새 보드에는 시드가 정상 주입(회의·의전·식사)', freshSeed.ev > 0 && freshSeed.pr === 41 && freshSeed.ml > 0, '회의 ' + freshSeed.ev + ' · 의전 ' + freshSeed.pr + ' · 식사 ' + freshSeed.ml + '일');
  const nocov = await page.evaluate(() => {
    const t = ttById('t1'), key = 'tt:t1';                  // 개영식 = 촬영 리스트 연동 대상
    state.shootlist = shootListData().filter((r) => r.ttId !== key);   // 그 행을 지운 상태
    t.noCover = true; mergeShootlistFromTimetable();
    const back = shootListData().some((r) => r.ttId === key);
    t.noCover = false; mergeShootlistFromTimetable();
    const restored = shootListData().some((r) => r.ttId === key);
    return { back, restored };
  });
  chk("'취재 불필요' 일정은 지운 촬영행을 되살리지 않음", nocov.back === false && nocov.restored === true, '불필요=' + nocov.back + ' · 되돌리면 복구=' + nocov.restored);

  /* ===== 나중에 생긴 규칙에 걸린 기존 배정 점검 (v0.9.232) =====
   * enforceAvailability 는 '그 사람의 입영/오프타임을 바꾼 순간'에만 돈다. v0.9.230 이 8/9 오후·저녁을
   * 전체 오프로 만들기 전에 잡아 둔 배정은 아무도 건드리지 않아 화면과 데이터가 어긋난 채 남았다. */
  console.log('\n[배정 불가 잔여 담당 점검]');
  const avail = await page.evaluate(() => {
    rosterById('r1').arrive = ''; rosterById('r2').arrive = '';
    ttList().push({ id: 'gof-1', day: '2026-08-09', start: '15:00', end: '16:00', title: '폐영 준비 취재', place: '대집회장', zone: 'stage', cat: '행사', assignees: ['r1'], contacts: [], rundown: [], noCover: false });
    setView('timetable'); renderTimetable();
    const box = document.getElementById('tt-avail');
    const shown = !!box && box.style.display !== 'none' && /배정 불가 시간에 남은 담당/.test(box.textContent);
    const groups = box ? box.querySelectorAll('[data-avclear]').length : 0;
    window.confirm = () => true;
    const btn = box && box.querySelector('[data-avclear]'); if (btn) btn.click();
    const cleared = ((ttById('gof-1') || {}).assignees || []).length === 0;
    const after = document.getElementById('tt-avail');
    const hidden = !!after && after.style.display === 'none';
    removeTt('gof-1'); renderTimetable();
    return { shown, groups, cleared, hidden };
  });
  chk('배정 불가 시간에 남은 기존 담당 → 점검 배너', avail.shown === true && avail.groups === 1, '배너=' + avail.shown + ' · 인원 ' + avail.groups);
  chk('배너에서 해제 → 담당 제거 + 배너 사라짐(자동 삭제는 안 함)', avail.cleared === true && avail.hidden === true, '해제=' + avail.cleared + ' · 배너숨김=' + avail.hidden);
  const cli = await page.evaluate(async () => {
    window.__put.length = 0;
    rosterById('r1').name = '김기자'; saveRoster();
    await window.flushPendingSaves();
    const p = window.__put.filter((x) => x.roster).slice(-1)[0];
    return { client: (p && p.client) || '', author: (p && p.author) || '' };
  });
  chk('저장 시 편집 창 id(client) 동봉 — 같은 계정 다기기 병합 판정용', cli.client.length > 0 && cli.author.length > 0, 'client=' + cli.client.slice(0, 8) + '… · author=' + cli.author);
  // ⚠️ v0.9.210 의 @container 규칙이 폭 58px 레인의 제목을 통째로 숨겨 "일정이 추가 안 된" 것처럼 보이게 했다.
  // 데이터가 있는데 화면에서 사라지는 실패는 사용자가 발견하기 전에 여기서 걸려야 한다(기본 = 전체 기간 뷰).
  await go('timetable');   // ⚠️ 숨겨진 섹션에서 재면 전부 0px 라 "안 보임"으로 잡힌다 — 반드시 일정표를 띄운 뒤 측정
  const vis = await page.evaluate(() => {
    ttMode = 'period'; renderTimetable();
    const out = { total: 0, blank: [] };
    document.querySelectorAll('.ttg-ev[data-id]').forEach((e) => {
      const t = e.querySelector('.ttg-evt'); if (!t || !t.textContent.trim()) return;
      out.total++;
      const r = t.getBoundingClientRect();
      if (getComputedStyle(t).display === 'none' || r.width < 1 || r.height < 1)
        out.blank.push(e.getAttribute('data-id') + ' "' + t.textContent.trim().slice(0, 12) + '"');
    });
    return out;
  });
  chk('전체 기간 뷰: 제목 있는 블록은 글자가 보인다(숨김 0)', vis.blank.length === 0,
    vis.blank.length ? vis.blank.slice(0, 3).join(' | ') : vis.total + '블록 검사');
  const zn = await page.evaluate(() => ({ so: zoneForPlace('소무대'), main: zoneForPlace('메인무대'), stadium: zoneForPlace('메인 스타디움') }));
  chk('소무대는 메인무대로 잘못 매칭되지 않는다(구역 없음)', zn.so === null && zn.main === 'stage' && zn.stadium === 'stage',
    '소무대→' + zn.so + ' · 메인무대→' + zn.main);

  // ===== 컵 참관단 데이터 복구 · 중복 점검 · 열 너비 (v0.9.213) =====
  console.log('\n[컵 트랙 복구 · 중복 · 열 너비]');
  await go('timetable');
  const cub = await page.evaluate(() => {
    // v0.9.195 이전 buildCleanTT 가 track/batch 를 빠뜨려 저장한 상태를 재현
    // (⚠️ concat 으로 넣으면 같은 id 가 둘이 되어 "복구"가 아니라 "중복"을 만든다 — 기존 항목을 망가뜨려야 정확한 재현)
    state.timetable = ttList().map((t) => {
      if (t.id === 'cub-1-0806-0900') { const c = Object.assign({}, t); delete c.track; delete c.batch; return c; }
      if (t.id === 'cub-1-0806-1400') return Object.assign({}, t, { batch: 0 });
      return t;
    });
    mergeCubObservers(); mergeCubObservers();   // 멱등
    const a = ttById('cub-1-0806-0900'), b = ttById('cub-1-0806-1400');
    return { aTrack: a && a.track, aBatch: a && a.batch, bBatch: b && b.batch };
  });
  chk('컵 track 유실 복구(잼버리 열로 새던 항목)', cub.aTrack === 'cub' && cub.aBatch === 1, 'track=' + cub.aTrack + ' batch=' + cub.aBatch);
  chk('컵 batch 오값도 id 기준 교정(멱등)', cub.bBatch === 1, 'batch=' + cub.bBatch);
  const dup = await page.evaluate(() => {
    const before = ttDupGroups().length;
    state.timetable = ttList().concat([{ id: 'dup-x', day: '2026-08-06', start: '20:00', end: '22:00', title: 'K-POP 콘서트', track: 'cub', batch: 1, cat: '컵 참관단', assignees: [], contacts: [], rundown: [] }]);
    renderTimetable();
    const shown = document.getElementById('tt-dupes').style.display !== 'none';
    const g = ttDupGroups().length;
    // 1기/2기가 같은 시각·제목인 것은 정상 — 중복이 아니다
    state.timetable = ttList().concat([{ id: 'ok-2gi', day: '2026-08-06', start: '20:00', end: '22:00', title: 'K-POP 콘서트', track: 'cub', batch: 2, cat: '컵 참관단', assignees: [], contacts: [], rundown: [] }]);
    const g2 = ttDupGroups().length;
    return { before, shown, g, g2 };
  });
  chk('중복 없으면 배너 없음 → 생기면 표시', dup.before === 0 && dup.shown && dup.g === 1, '전 ' + dup.before + ' · 후 ' + dup.g);
  // 같은 id 가 둘이면 ttById 가 첫 번째만 잡아 편집·삭제가 엉뚱한 쪽에 걸린다 → 내용 많은 쪽만 남긴다
  const ded = await page.evaluate(() => {
    const base = ttById('cub-1-0806-0900');
    state.timetable = ttList().concat([Object.assign({}, base, { assignees: ['r1'], memo: '내용 있는 쪽' })]);
    const n0 = ttList().filter((t) => t.id === 'cub-1-0806-0900').length;
    const dropped = dedupeTimetableById();
    const left = ttList().filter((t) => t.id === 'cub-1-0806-0900');
    return { n0, dropped, n1: left.length, kept: left[0] && left[0].memo, again: dedupeTimetableById() };
  });
  chk('같은 id 중복 정리 — 내용 많은 쪽 보존(멱등)',
    ded.n0 === 2 && ded.dropped === 1 && ded.n1 === 1 && ded.kept === '내용 있는 쪽' && ded.again === 0,
    ded.n0 + '개 → ' + ded.n1 + '개 · 남은 쪽 "' + (ded.kept || '') + '" · 재실행 ' + ded.again);
  chk('컵 1기/2기 같은 시각·제목은 중복 아님', dup.g2 === 1, '그룹 ' + dup.g2);
  const split = await page.evaluate(() => {
    ttMode = 'day'; ttDay = '2026-08-06'; ttColW = { jam: 1, pr: 1, cub: 1 }; renderTimetable();
    const sp = document.querySelector('.ttg-vsplit[data-sp]'); if (!sp) return { no: 1 };
    const r = sp.getBoundingClientRect(), w0 = ttColW.jam;
    sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 50 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + 185, clientY: r.top + 50 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const saved = JSON.parse(localStorage.getItem('jamboree-plan:ttcolw') || '{}');
    return { n: document.querySelectorAll('.ttg-vsplit[data-sp]').length, w0, w1: ttColW.jam, saved: saved.jam };
  });
  chk('트랙 구분선 = 드래그 손잡이', split.n >= 1, split.n + '개');
  chk('구분선을 끌면 열 너비가 바뀌고 저장된다', split.w1 > split.w0 && Math.abs(split.saved - split.w1) < 0.01,
    split.w0 + ' → ' + (split.w1 || 0).toFixed(2) + ' (저장 ' + (split.saved || 0).toFixed(2) + ')');
  await page.evaluate(() => { ttColW = { jam: 1, pr: 1, cub: 1 }; saveTtColW(); state.timetable = ttList().filter((t) => !/^(dup-x|ok-2gi)$/.test(t.id)); renderTimetable(); });

  // 가이드 ④(CLAUDE.md 최우선 규칙): 최소 13px · 버튼 ≥40px · 카드 중첩 금지 · 음수 자간 -3% 이내.
  // v0.9.205 는 "밀집 그리드가 깨진다"며 10.5~11px 에서 멈췄고, 그 후퇴를 잡아줄 테스트가 없어 그대로 남았다.
  // 눈으로 보면 놓치므로 렌더된 값으로 전 뷰를 훑는다. 실패 시 어느 요소인지까지 찍는다.
  /* ===== 저장 신뢰성 (v0.9.233) =====
   * 도메인 저장에는 실패 재시도가 없어, 네트워크가 한 번 흔들리면 '저장 실패' 한 줄만 남기고 편집이 사라졌다
   * (새로고침 시 applyServer 가 서버 값으로 화면과 localStorage 백업까지 덮어씀). 그 경로를 전부 고정한다. */
  console.log('\n[저장 신뢰성]');
  const savefail = await page.evaluate(async () => {
    window.__failPut = true;
    rosterById('r1').name = '현장 취재팀장';
    saveRoster();
    await window.flushPendingSaves();
    await new Promise((r) => setTimeout(r, 200));
    return {
      pending: pendingCount(),
      unsaved: unsavedDomains(),
      st: (document.getElementById('syncst') || {}).textContent || '',
      marker: localStorage.getItem('jamboree-plan:unsaved') || '',
      guard: (document.getElementById('save-guard') || {}).style ? document.getElementById('save-guard').style.display !== 'none' : false,
      hasHook: typeof window.hasUnsavedWork === 'function' && window.hasUnsavedWork() > 0,
    };
  });
  // flush 는 그때까지 밀려 있던 다른 도메인도 함께 발사하므로 대기 건수는 1건 이상이면 된다(roster 는 반드시 포함).
  chk('저장 실패 → 대기 큐 등록 + 상태 표시', savefail.pending >= 1 && savefail.unsaved.indexOf('roster') >= 0 && /저장 대기 \d+건/.test(savefail.st),
    savefail.pending + '건 [' + savefail.unsaved.join(',') + '] · ' + savefail.st);
  chk('대기 도메인을 localStorage 에 표식(새로고침해도 살아남게)', /roster/.test(savefail.marker), savefail.marker);
  // 카드 저장이 늦게 끝나며 "저장 대기 N건" 을 덮으면, 안 저장된 작업이 저장된 듯 보인다(회귀 2건 목격).
  const cardOver = await page.evaluate(async () => {
    doSaveCard('2026-08-05#x1', { title: 'x' });
    await new Promise((r) => setTimeout(r, 250));
    return { st: (document.getElementById('syncst') || {}).textContent || '', pending: pendingCount() };
  });
  chk('카드 저장 실패가 대기 건수 표시를 덮지 않음', cardOver.pending >= 1 && /저장 대기 \d+건/.test(cardOver.st), cardOver.st);
  chk('저장 가드 바 노출 + version-watch 훅 노출', savefail.guard === true && savefail.hasHook === true, '바=' + savefail.guard + ' · 훅=' + savefail.hasHook);
  const noOverwrite = await page.evaluate(() => {
    // 대기 중인 도메인은 서버 응답이 와도 덮이지 않아야 한다(예전엔 여기서 작업분이 사라졌다)
    applyServer({ roster: [{ id: 'r1', name: '김기자', role: '취재', team: 't1' }], versions: { roster: 'V9' } });
    return { name: rosterById('r1').name };
  });
  chk('대기 중인 도메인은 서버 값으로 덮이지 않음', noOverwrite.name === '현장 취재팀장', noOverwrite.name);
  const recovered = await page.evaluate(async () => {
    window.__failPut = false;
    await retryPendingSaves();
    await new Promise((r) => setTimeout(r, 150));
    const last = window.__put.filter((p) => p.roster).slice(-1)[0];
    return { pending: pendingCount(), marker: localStorage.getItem('jamboree-plan:unsaved'), sent: last && last.roster[0] && last.roster[0].name };
  });
  chk('재시도 성공 → 큐 비움 + 표식 제거 + 최신 값 전송', recovered.pending === 0 && !recovered.marker && recovered.sent === '현장 취재팀장',
    '대기 ' + recovered.pending + ' · 표식=' + (recovered.marker || '없음') + ' · 보냄=' + recovered.sent);
  const backup = await page.evaluate(() => {
    const d = boardBackupData();
    return { app: d._meta && d._meta.app, doms: DOMAIN_KEYS.filter((k) => d[k] !== undefined).length, hasTeams: !!d.teams };
  });
  chk('보드 백업에 운영 도메인 전체 포함', backup.app === 'krjam-planning-board' && backup.doms >= 10 && backup.hasTeams, backup.doms + '개 영역');
  const clip = await page.evaluate(() => ({
    memo: clipField('protocol', 'memo', 'x'.repeat(600)).length,     // 서버 cleanProtocol memo 400
    ttmemo: clipField('timetable', 'memo', 'x'.repeat(900)).length,  // cleanTT memo 500
    short: clipField('protocol', 'memo', '짧은 메모').length,
    unknown: clipField('protocol', 'nosuch', 'x'.repeat(900)).length,
  }));
  chk('긴 텍스트는 서버 상한으로 자르고 알림', clip.memo === 400 && clip.ttmemo === 500 && clip.short === 5 && clip.unknown === 900,
    '의전메모 ' + clip.memo + ' · 일정메모 ' + clip.ttmemo);
  const capwarn = await page.evaluate(() => {
    const keep = state.divisions;
    state.divisions = Array.from({ length: 55 }, (_, i) => ({ id: 'd' + i, name: 'x' }));   // cap 60 → 90% 이상
    const near = domainsNearCap().filter((c) => c.dom === 'divisions').length;
    renderSaveGuard();
    const shown = /분단 명단 55\/60/.test((document.getElementById('save-guard') || {}).textContent || '');
    state.divisions = keep; renderSaveGuard();
    const gone = /분단 명단/.test((document.getElementById('save-guard') || {}).textContent || '');
    return { near, shown, gone };
  });
  chk('항목 수 상한 90% 도달 → 경고 배너', capwarn.near === 1 && capwarn.shown === true && capwarn.gone === false, '감지=' + capwarn.near + ' · 표시=' + capwarn.shown);

  console.log('\n[디자인 — 타이포·컨트롤]');
  const SWEEP = ['dashboard', 'calendar', 'list', 'timetable', 'staff', 'protocol', 'library', 'tips', 'meals', 'contacts', 'news', 'press'];
  const viol = { small: [], btn: [], track: [], nest: [] };
  for (const v of SWEEP) {
    await go(v);
    const r = await page.evaluate(() => {
      const vis = (el) => { const b = el.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return false;
        const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1; };
      const ownsText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
      const out = { small: [], btn: [], track: [], nest: [] };
      // 40px 예외: 블록/칩 위에 겹쳐 뜨는 micro 컨트롤(--h-ctl-mini). 40px 를 주면 대상 자체를 덮는다.
      const MINI = ['ttg-del', 'ttg-cov', 'fedx', 'smpop-x', 'news-slot-x', 'press-attx'];
      document.querySelectorAll('*').forEach((el) => {
        if (!vis(el)) return;
        const s = getComputedStyle(el);
        if (ownsText(el)) {
          const fs = parseFloat(s.fontSize);
          if (fs < 13) out.small.push(fs + 'px ' + (el.className || el.tagName));
          if (s.letterSpacing && s.letterSpacing !== 'normal' && parseFloat(s.letterSpacing) / fs < -0.03)
            out.track.push(s.letterSpacing + ' ' + (el.className || el.tagName));
        }
        if ((el.tagName === 'BUTTON' || el.classList.contains('btn')) && !MINI.some((m) => el.classList.contains(m))
            && el.getBoundingClientRect().height < 40) out.btn.push(Math.round(el.getBoundingClientRect().height) + 'px ' + (el.className || el.tagName));
      });
      const CARD = '.card,.tipcard,.libcard,.pcard,.statcard,.dashpanel,.shootcard,.news-card';
      document.querySelectorAll(CARD).forEach((c) => { if (!vis(c)) return; const i = c.querySelector(CARD);
        if (i && vis(i)) out.nest.push(c.className.split(' ')[0] + ' > ' + i.className.split(' ')[0]); });
      return out;
    });
    for (const k of Object.keys(viol)) r[k].forEach((x) => viol[k].push(v + ': ' + x));
  }
  const uniq = (a) => [...new Set(a)];
  chk('본문·라벨 전부 13px 이상 (12px 이하 금지)', viol.small.length === 0, viol.small.length ? uniq(viol.small).slice(0, 4).join(' | ') : SWEEP.length + '개 뷰 검사');
  chk('조작 요소 전부 40px 이상 (겹침 micro 예외 제외)', viol.btn.length === 0, viol.btn.length ? uniq(viol.btn).slice(0, 4).join(' | ') : SWEEP.length + '개 뷰 검사');
  chk('음수 자간 -3% 이내', viol.track.length === 0, uniq(viol.track).slice(0, 3).join(' | ') || 'ok');
  chk('카드 중첩 없음 (카드 안에 카드 금지)', viol.nest.length === 0, uniq(viol.nest).slice(0, 3).join(' | ') || 'ok');
  await page.setViewport({ width: 1440, height: 1000 });

  console.log('\n[디자인 — 레이아웃]');
  for (const W of [390, 430]) {
    await page.setViewport({ width: W, height: 900 });
    await new Promise((r) => setTimeout(r, 350));
    const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      orgH: Math.round((document.querySelector('.orgtag') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }));
    chk(W + 'px 가로 넘침 없음', ov.sw <= ov.iw, 'scrollW=' + ov.sw);
    chk(W + 'px 상단 라벨 안 무너짐', ov.orgH <= 40, ov.orgH + 'px');
  }
  await page.setViewport({ width: 1440, height: 1000 });

  console.log('\n[콘솔]');
  chk('콘솔/페이지 에러 0', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

  await browser.close(); server.close();
  const f = R.filter((x) => !x.p);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' PASS ===');
  if (f.length) console.log('FAILED: ' + f.map((x) => x.n).join(' | '));
  process.exit(f.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); server.close(); process.exit(2); });
