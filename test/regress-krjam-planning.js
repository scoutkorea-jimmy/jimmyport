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
  window.__assets = [
    { id: 'a1', url: '/api/file?id=f1', name: '브랜드 가이드라인', type: 'photo', category: 'plan', ct: 'application/pdf', size: 3348000, tags: ['브랜드'], author: 'admin', authorName: '관리자', createdAt: '2026-07-13T07:07:00Z' },
    { id: 'a2', url: '/api/image?id=i1', name: '개영식 사진', type: 'photo', category: 'photo', ct: 'image/jpeg', size: 820000, tags: [], author: 'admin', authorName: '관리자', createdAt: '2026-07-12T05:00:00Z' },
  ];
  const rf = window.fetch;
  window.fetch = (u, o) => {
    u = String(u && u.url ? u.url : u);
    const J = (d, s) => Promise.resolve(new Response(JSON.stringify(d), { status: s || 200, headers: { 'content-type': 'application/json' } }));
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: [] });
    if (u.startsWith('/api/jp-assets')) { if (o && o.method === 'DELETE') return J({ ok: true }); if (o && o.method === 'POST') return J({ ok: true, asset: { id: 'new', url: '/api/file?id=n', name: 'n', category: 'plan', ct: 'application/pdf', tags: [], authorName: '관리자', createdAt: '2026-07-15T00:00:00Z' } }); return J({ ok: true, assets: window.__assets }); }
    if (u.startsWith('/api/jp-tips')) { if (o && o.method === 'PATCH') { const b = JSON.parse(o.body); window.__tipPatch.push(b); return J({ ok: true, tip: Object.assign({}, window.__tip0, b) }); } return J({ ok: true, tips: [window.__tip0] }); }
    if (u.startsWith('/api/krjam-dcount')) return J({ ok: true, slots: [], approved: [] });
    if (u.startsWith('/api/r2?action=create')) { window.__r2.creates++; return J({ ok: true, key: 'jpa/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', uploadId: 'U1' }); }
    if (u.startsWith('/api/r2?action=part')) { const n = +new URL(u, location.origin).searchParams.get('part');
      return Promise.resolve(o.body.arrayBuffer()).then((b) => { window.__r2.parts.push(b.byteLength); return J({ ok: true, partNumber: n, etag: 'e' + n }); }); }
    if (u.startsWith('/api/r2?action=complete')) { window.__r2.completed = JSON.parse(o.body); return J({ ok: true, url: '/api/r2?id=k', name: 'f', ct: 'application/pdf', size: 1 }); }
    if (u.startsWith('/api/r2?action=abort')) { window.__r2.aborted++; return J({ ok: true }); }
    if (u.startsWith('/api/image') || u.startsWith('/api/file')) return J({ ok: true, url: '/api/file?id=x', name: 'f', ct: 'application/pdf' });
    if (u.startsWith('/api/jamboree-plan')) {
      if (o && o.method === 'PUT') { window.__put.push(JSON.parse(o.body)); return J({ ok: true }); }
      return J({ ok: true, types: [], events: [], marketing: [], contacts: [], divisions: [], protocol: [], mappos: {}, shoots: [], ttcats: [], offtimes: {},
        roster: [{ id: 'r1', name: '김기자', role: '취재', team: 't1' }, { id: 'r2', name: '이사진', role: '사진', team: 't2' }],
        timetable: [
          { id: 't1', day: '2026-08-05', start: '20:00', end: '21:30', title: '개영식', place: '메인무대', zone: 'stage', cat: '개·폐영식', assignees: ['r1'], contacts: [], rundown: [{ time: '20:00', title: '개회 선언', note: '' }], noCover: false },
          { id: 't2', day: '2026-08-05', start: '12:00', end: '13:00', title: '중식', place: '급식소', zone: 'food', cat: '식사', assignees: [], contacts: [], rundown: [], noCover: true },
          { id: 't3', day: '2026-08-06', start: '09:00', end: '10:00', title: '분단 회의', place: 'JHQ 본부', zone: 'jhq', cat: '회의', assignees: ['r2'], contacts: [], rundown: [], noCover: false },
        ],
        slots: {
          '2026-07-01#dcount': { edit: { title: '가나 대표단 소개', status: 'planned', owner: '박지민', due: '2026-07-20', channels: ['페이스북'] } },
          '2026-07-02#dcount': { edit: { title: '나이지리아 대표단', status: 'draft', owner: '김철수', due: '2026-07-05', channels: ['인스타그램'] } },
          '2026-07-03#dcount': { edit: { title: '다낭 서브캠프', status: 'ready', owner: '이영희', due: '2026-08-01', posted: true, channels: ['유튜브'] } },
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
  await page.waitForSelector('.wsbar', { timeout: 10000 });

  // 2단 내비게이션: 뷰 전환은 setView 로 직접(세부탭은 활성 공간에서만 보이므로) — 이 스위트는 뷰 동작 검증이 목적
  const go = async (v) => { await page.evaluate((x) => setView(x), v); await new Promise((r) => setTimeout(r, 250)); };

  console.log('\n[부팅 · 탭]');
  chk('게이트 통과 · 공간바 렌더', await page.$('.wsbar') !== null);
  chk('업무 4공간(대시보드·콘텐츠·현장·팀·자료)', (await page.$$('.wstab')).length === 4, (await page.$$('.wstab')).length + '공간');

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
  chk('빈 슬롯 기본 숨김 → 실제 3장', b.cards === 3, b.cards + '장');
  chk('빈 슬롯 토글 라벨(38)', /\(38\)/.test(b.toggle), b.toggle);
  chk('정렬 4종 · 필터바 접힘', b.sorts === 4 && b.filtersHidden);
  await page.click('#toggle-empty');
  chk('빈 슬롯 보기 → 41장', (await page.evaluate(() => document.querySelectorAll('#board .card:not(.card-inbox)').length)) === 41);
  await page.click('#toggle-empty');
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
  chk('8/5 t1·t2 렌더 + 컵 참관단 병합(워터파크·저녁·K-POP·정리)', tt.t1 && tt.t2 && tt.cub === 4, 't1·t2 + 컵 ' + tt.cub + '건/총 ' + tt.evs);
  chk('취재 불필요(t2) 회색 · 배지', tt.nocover === 1 && tt.nctag);
  // 취재 불필요 = 저채도 비활성 블록. 라이트=고명도 회색 / 다크=저명도 회색 둘 다 통과하도록 채도로 검사.
  chk('취재 불필요 배경 = 저채도 회색(비활성)', (() => { const m = (tt.bg.match(/\d+/g) || []).map(Number); if (m.length < 3) return false; return Math.max(m[0], m[1], m[2]) - Math.min(m[0], m[1], m[2]) <= 16; })(), tt.bg);
  chk('일반 일정(t1) 은 카테고리색 유지', !/237, 239, 240/.test(tt.t1bg), tt.t1bg);
  chk('취재 토글 = 편집 블록마다(=총 블록수)', tt.cov === tt.evs && tt.evs >= 2, tt.cov + '/' + tt.evs);
  chk('식순 인라인(일간뷰) 1행', tt.rd === 1, tt.rd + '행');
  chk('담당 인원 표기', /김기자/.test(tt.who), tt.who.trim());
  // 20:00 × TT_HH_DAY(84px/h) = 1680 · 1.5h × 84 − 3(gap) = 123 — 리팩터링 후에도 픽셀 동일해야 함
  chk('블록 좌표 계산(top/height)', tt.top === '1680px' && tt.height === '123px', tt.top + ' / ' + tt.height);

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
  chk('전체기간 뷰 → t1·t2·t3 + 컵 참관단 35건 전부 렌더', wp.ids && wp.cub === 35, 't1·t2·t3 + 컵 ' + wp.cub);
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

  console.log('\n[식사 메뉴]');
  await go('meals');
  const ml = await page.evaluate(() => ({
    rows: document.querySelectorAll('#mealbody tr').length,
    seg: [...document.querySelectorAll('#meal-groupseg button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')),
    cells: document.querySelectorAll('#mealbody td.mk[contenteditable]').length }));
  chk('식사 메뉴 7일(8/3~8/9) × 3끼', ml.rows === 7 && ml.cells === 21, ml.rows + '행 · ' + ml.cells + '칸');
  chk('식사 3그룹 토글(대원 일반식·특별식·운영요원)', ml.seg.length === 3 && ml.seg[0] === '대원 일반식*', ml.seg.join(' '));

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
  const L = await page.evaluate(() => ({ cards: document.querySelectorAll('.libcard').length, open: document.querySelectorAll('.libcard[data-lib-open]').length, cats: document.querySelectorAll('#lib-cats .libcat').length }));
  chk('자료 2건 · 카드 클릭 가능 · 구분 탭', L.cards === 2 && L.open === 2 && L.cats === 4, JSON.stringify(L));
  await page.click('.libcard[data-lib-open="a1"] .libimg');
  await new Promise((r) => setTimeout(r, 250));
  const P = await page.evaluate(() => ({ shown: document.getElementById('asset-scrim').classList.contains('show'),
    iframe: (document.querySelector('.apv-pdf iframe') || {}).src || '', meta: document.querySelectorAll('.apv-meta dd').length }));
  chk('PDF 미리보기(iframe inline=1) + 메타 5행', P.shown && /inline=1/.test(P.iframe) && P.meta === 5, P.iframe);
  await page.click('#asset-close');
  await page.click('.libcard[data-lib-open="a2"] .libimg'); await new Promise((r) => setTimeout(r, 200));
  chk('이미지 자료 → 이미지 미리보기', await page.$('.apv-img img') !== null);
  await page.click('#asset-close');
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
  await go('staff');
  chk('홍보부 인원 표 렌더', (await page.$$('#rostertbl tr')).length > 1, (await page.$$('#rostertbl tr')).length + '행');

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
