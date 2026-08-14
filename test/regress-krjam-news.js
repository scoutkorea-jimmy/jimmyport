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
    images: ['/jamboree/assets/logo.png'], tags: ['개영식', '현장'], stage: 'published', cardnewsDone: true, photographer: '김사진', reporter: '박취재', depts: ['기획조정본부', '운영본부'], priority: 3.5, en: 'need',
    author: 'jimmy', authorName: '박지민', createdAt: '2026-07-01T10:00:00Z',
    version: 3,
    history: [
      { v: 1, title: '개영식', subtitle: '', body: '<p>첫 판</p>', images: [], tags: [], at: '2026-07-01T10:00:00Z', by: 'jimmy', byName: '박지민' },
      { v: 2, title: '개영식 현장(수정)', subtitle: '', body: '<p>둘째 판</p>', images: [], tags: ['개영식'], at: '2026-07-02T10:00:00Z', by: 'jimmy', byName: '박지민' },
      { v: 3, title: '개영식 현장', subtitle: '첫날 밤의 기록', body: '<p>본문 <b>서식</b></p>', images: ['/jamboree/assets/logo.png'], tags: ['개영식', '현장'], at: '2026-07-03T10:00:00Z', by: 'jimmy', byName: '박지민' },
    ],
    comments: [{ id: 'c1', username: 'jimmy', author: '박지민', text: '사진 교체 바랍니다', ts: '2026-07-02T01:00:00Z', v: 1 },
               { id: 'c2', username: 'kim', author: '김검수', text: '제목 확정 바랍니다', ts: '2026-07-03T20:00:00Z', v: 3 }] },
  { id: 'n2', title: '과정활동 스케치', subtitle: '', body: '두 번째', images: [], tags: [], stage: 'draft',
    author: 'jimmy', authorName: '박지민', createdAt: '2026-07-02T10:00:00Z',
    comments: [{ id: 'c3', username: 'kim', author: '김검수', text: '내 기사에 달린 의견', ts: '2026-07-10T10:00:00Z', v: 1 }] },
  { id: 'n3', title: '남이 쓴 기사', subtitle: '', body: '세 번째', images: [], tags: ['분단'], stage: 'reviewed',
    author: 'other', authorName: '남', createdAt: '2026-07-03T10:00:00Z',
    comments: [{ id: 'c4', username: 'jimmy', author: '박지민', text: '내가 단 의견', ts: '2026-07-11T10:00:00Z', v: 1 },
               { id: 'c5', username: 'kim', author: '김검수', text: '참여한 기사에 달린 의견', ts: '2026-07-12T10:00:00Z', v: 1 }] },
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
      if (bb.action === 'comment') { window.__cmt = bb; return J({ ok: true, article: news[0] }); }
      if (bb.action === 'flags') {
        const what = bb.reporter !== undefined ? 'reporter=' + bb.reporter
          : bb.photographer !== undefined ? 'photog=' + bb.photographer
          : bb.priority !== undefined ? 'pri=' + bb.priority
          : bb.en !== undefined ? 'en=' + bb.en : bb.stage;
        window.__flag.push(bb.id + ':' + what); return J({ ok: true });
      }
      window.__save = bb; return J({ ok: true, item: bb });
    }
    /* 서버와 같은 모양으로 흉내낸다 (v0.9.287): 목록의 history 에는 본문이 없고,
       ?id= 로 한 건을 받을 때만 옛 판 본문까지 온다. 목록이 무거워 화면이 느리던 것을 고친 것. */
    if (u.startsWith('/api/jp-news?id=')) {
      const wantId = decodeURIComponent(u.split('id=')[1]);
      const full = news.filter((x) => x.id === wantId)[0];
      window.__detailFetched = (window.__detailFetched || 0) + 1;
      return full ? J({ ok: true, article: full }) : J({ ok: false, error: 'not_found' });
    }
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: news.map((a) => Object.assign({}, a,
      a.history ? { history: a.history.map((h) => ({ v: h.v, at: h.at, by: h.by, byName: h.byName, title: h.title })) } : {})) });
    if (u.startsWith('/api/jp-noti')) { if (window.__notiFail) return Promise.resolve(new Response('err', { status: 500 }));
      if (o && o.method === 'POST') { window.__notiRead = true; return J({ ok: true, items: window.__notiSrv || [], readAt: new Date().toISOString() }); }
      return J({ ok: true, items: window.__notiSrv || [], readAt: '' }); }
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-press')) return J({ ok: true, press: [] });
    if (u.startsWith('/api/jp-tips')) return J({ ok: true, tips: [] });
    if (u.startsWith('/api/jp-assets')) return J({ ok: true, assets: [] });
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
  const vsrc = src;
  chk('부제목·태그가 서버 저장 경로에 있음', /rec\.subtitle\s*=/.test(src) && /rec\.tags\s*=/.test(src) && /subtitle:\s*String/.test(src));
  // 안 보낸 필드를 지우면, 다른 화면의 저장 한 번에 부제목·태그가 통째로 날아간다
  chk('PUT 은 안 보낸 부제목·태그를 지우지 않음', /if \(body\.subtitle !== undefined\)/.test(src) && /if \(body\.tags !== undefined\)/.test(src));

  console.log('\n[서버 — 버전]');
  /* 기사를 고칠 때마다 V가 1씩 오르고 그 판이 통째로 history 에 쌓인다.
     ⚠️ 단계만 바꾼 저장으로 V가 오르면 기록이 의미를 잃는다 → 내용 비교로 막는다. */
  const rec0 = { title: 'A', subtitle: 's', body: '<p>x</p>', images: ['/i.png'], tags: ['t'], updatedAt: '2026-07-01T00:00:00Z', author: 'u', authorName: 'U' };
  const snap = api.snapOf(rec0, 1, null);
  chk('스냅샷은 그 판의 내용을 통째로 담는다', snap.v === 1 && snap.title === 'A' && snap.subtitle === 's'
    && snap.body === '<p>x</p>' && snap.images[0] === '/i.png' && snap.tags[0] === 't' && snap.at === '2026-07-01T00:00:00Z');
  chk('스냅샷 배열은 복사본(원본과 얽히지 않음)', (() => { snap.tags.push('z'); return rec0.tags.length === 1; })());
  chk('내용이 같으면 같다고 본다(단계만 바뀐 저장)', api.sameContent(api.snapOf(rec0, 1, null), rec0));
  chk('제목·본문·사진·태그 중 하나만 달라도 다르다', [{ title: 'B' }, { body: '<p>y</p>' }, { images: [] }, { tags: [] }, { subtitle: '' }]
    .every((d) => !api.sameContent(rec0, Object.assign({}, rec0, d))));
  chk('코멘트 시각으로 당시 버전을 역산(v 없는 옛 코멘트)', (() => {
    const h = [{ v: 1, at: '2026-07-01T00:00:00Z' }, { v: 2, at: '2026-07-05T00:00:00Z' }, { v: 3, at: '2026-07-09T00:00:00Z' }];
    return api.versionAt(h, '2026-07-03T00:00:00Z') === 1 && api.versionAt(h, '2026-07-06T00:00:00Z') === 2
      && api.versionAt(h, '2026-07-30T00:00:00Z') === 3 && api.versionAt([], 'x') === 1;
  })());
  chk('생성은 V1 · 수정은 내용이 달라졌을 때만 +1', /rec\.history = \[snapOf\(rec, 1, who\)\]/.test(vsrc)
    && /if \(!sameContent\(before, rec\)\)/.test(vsrc) && /rec\.version = \(rec\.version \|\| 1\) \+ 1/.test(vsrc));
  chk('코멘트에 달릴 당시 버전을 찍는다', /rec\.comments\.push\(\{ id: newId\(\), text: ctext, v: rec\.version/.test(vsrc));
  chk('버전을 올려도 코멘트를 건드리지 않는다', !/comments\s*=\s*\[\]/.test(vsrc.split('onRequestPut')[1] || ''));
  chk('오래된 판을 버리면 몇 판인지 남긴다(조용히 줄이지 않음)', /historyTrimmed/.test(vsrc));

  console.log('\n[서버 — 사진 담당자 · 장문 코멘트]');
  chk('담당자 이름 정리(공백 접기 · 40자)', api.cleanPerson('  김  사진  ') === '김 사진' && api.cleanPerson('가'.repeat(60)).length === 40);
  chk('빈 값은 빈 문자열(폭발 안 함)', api.cleanPerson(undefined) === '' && api.cleanPerson(null) === '');
  chk('담당자는 생성·수정·flags 세 경로 모두에서 저장', (vsrc.match(/photographer = cleanPerson|photographer: cleanPerson/g) || []).length >= 3);
  chk('담당자 배정은 버전을 올리지 않음(내용 비교 대상 아님)', !/photographer/.test(vsrc.split('export const sameContent')[1].split(';')[0]));
  chk('검수 코멘트는 장문 허용(4000자) · 줄바꿈 보존', /slice\(0, 4000\)/.test(vsrc) && /replace\(\/\\r\\n\/g, "\\n"\)/.test(vsrc));

  console.log('\n[서버 — 우선순위 · 영문 검토 · 알림함]');
  chk('별점은 0~5, 0.5 단위로 스냅', [[0, 0], [0.4, 0.5], [0.75, 1], [2.5, 2.5], [4.9, 5], [7, 5], [-1, 0], ['3.5', 3.5], ['x', 0], [null, 0]]
    .every(([i, o]) => api.cleanPriority(i) === o));
  chk('영문 상태는 4종만 통과(모르는 값은 미검토)', JSON.stringify(api.EN_STATES) === '["","need","done","skip"]'
    && api.cleanEn('need') === 'need' && api.cleanEn('hack') === '' && api.cleanEn(undefined) === '');
  chk('우선순위·영문은 버전을 올리지 않음(내용 비교 대상 아님)', (() => {
    const cmp = vsrc.split('export const sameContent')[1].split('};')[0];
    return !/priority/.test(cmp) && !/\ben\b/.test(cmp);
  })());
  const notiApi = await import('../functions/api/jp-noti.js');
  const art = { id: 'n1', title: '개영식', author: 'jimmy', comments: [{ id: 'c1', username: 'kim' }, { id: 'c2', username: 'lee' }, { id: 'c3', username: 'kim' }] };
  chk('알림 수신자 = 작성자 + 코멘트 단 사람들 (본인 제외·중복 제거)',
    notiApi.recipientsOf(art, 'kim').join(',') === 'jimmy,lee' && notiApi.recipientsOf(art, 'park').join(',') === 'jimmy,kim,lee');
  chk('내 기사에 내가 코멘트하면 나에게는 안 간다', notiApi.recipientsOf({ id: 'x', author: 'kim', comments: [] }, 'kim').length === 0);
  chk('알림 항목은 본문을 줄여 담는다(원문 저장소가 아니다)', (() => {
    const it = notiApi.notiOf(art, { id: 'c9', username: 'kim', author: '김검수', text: '여러  줄\n의견', ts: 't', v: 2 });
    return it.articleId === 'n1' && it.text === '여러 줄 의견' && it.v === 2;
  })());
  const nsrc = fs.readFileSync(path.join(ROOT, 'functions/api/jp-noti.js'), 'utf8');
  chk('알림 쓰기 실패가 코멘트 저장을 막지 않음(try/catch)', /try \{ await fanoutComment/.test(vsrc) && /catch \{ return false; \}/.test(nsrc));
  chk('사람당 보관 상한 + 같은 코멘트 중복 방지', notiApi.NOTI_MAX === 100 && /items\.some\(\(x\) => x\.id === item\.id\)/.test(nsrc));

  console.log('\n[서버 — 취재 담당자 · 협조부서]');
  chk('협조부서는 이름 배열(공백 접기·중복 제거·10개)', (() => {
    const r = api.cleanDepts(['기획조정본부', '  운영본부 ', '기획조정본부', 'x'.repeat(60)]);
    return r.length === 3 && r[1] === '운영본부' && r[2].length === 40;
  })());
  chk('취재 담당자·협조부서가 세 저장 경로에 있다',
    (vsrc.match(/reporter = cleanPerson|reporter: cleanPerson/g) || []).length >= 3
    && (vsrc.match(/depts = cleanDepts|depts: cleanDepts/g) || []).length >= 3);
  chk('취재 담당자·협조부서도 버전을 올리지 않는다', (() => {
    const cmp = vsrc.split('export const sameContent')[1].split('};')[0];
    return !/reporter/.test(cmp) && !/depts/.test(cmp);
  })());

  console.log('\n[목록 — 게시판]');
  const p = await boardPage(b, base, 'admin');
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  chk('행 3개 + 선택 체크박스', await p.evaluate(() =>
    document.querySelectorAll('#news-list tbody tr').length === 3 && document.querySelectorAll('[data-news-ck]').length === 3 && !!document.getElementById('news-ckall')));
  chk('단계 칩 3종', await p.evaluate(() =>
    [...document.querySelectorAll('#news-list td.nr-pub .pst')].map((e) => e.textContent).sort().join('|')) === '초안|최종검수 완료|퍼블리싱 완료');
  chk('본문을 목록에 끼워 넣지 않음', await p.evaluate(() =>
    !document.querySelector('.news-detailrow') && !document.querySelector('[data-news-expand]')));
  chk('목록에 부제목·태그 표기', await p.evaluate(() => {
    const row = document.querySelector('#news-list tbody tr');
    return !!row.querySelector('.nr-sub') && !!row.querySelector('.nr-tags');
  }));

  chk('목록에 별점(반개 표시) + 숫자', await p.evaluate(() => {
    const row = document.querySelector('#news-list tbody tr td.nr-pri');
    const full = row.querySelectorAll('.star.full').length, half = row.querySelectorAll('.star.half').length;
    return full === 3 && half === 1 && /3\.5/.test(row.textContent);
  }));
  chk('별의 왼쪽 절반을 누르면 반개', await p.evaluate(async () => {
    window.__flag = [];
    const st = document.querySelectorAll('#news-list tbody tr td.nr-pri .star')[4];
    const r = st.getBoundingClientRect();
    st.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.25, clientY: r.top + r.height / 2 }));
    await new Promise((x) => setTimeout(x, 300));
    return window.__flag.join(',') === 'n1:pri=4.5';
  }));
  chk('오른쪽 절반은 온개', await p.evaluate(async () => {
    window.__flag = [];
    const st = document.querySelectorAll('#news-list tbody tr td.nr-pri .star')[1];
    const r = st.getBoundingClientRect();
    st.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.8, clientY: r.top + r.height / 2 }));
    await new Promise((x) => setTimeout(x, 300));
    return window.__flag.join(',') === 'n1:pri=2';
  }));
  chk('같은 값을 다시 누르면 0(미지정)으로 지운다', await p.evaluate(async () => {
    newsItems[0].priority = 2; renderNews(); window.__flag = [];
    const st = document.querySelectorAll('#news-list tbody tr td.nr-pri .star')[1];
    const r = st.getBoundingClientRect();
    st.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.8, clientY: r.top + r.height / 2 }));
    await new Promise((x) => setTimeout(x, 300));
    return window.__flag.join(',') === 'n1:pri=0';
  }));
  chk('영문 검토 칩 + 눌러서 상태 순환', await p.evaluate(async () => {
    newsItems[0].en = 'need'; renderNews(); window.__flag = [];
    // 정렬 기준에 따라 첫 행이 달라진다 — 대상 기사(n1)의 행을 직접 찾는다
    const row = [...document.querySelectorAll('#news-list tbody tr')].find((r) => /개영식 현장/.test(r.textContent));
    const chip = row.querySelector('td.nr-en .enchip');
    const label = chip.textContent;
    chip.click(); await new Promise((x) => setTimeout(x, 300));
    return label === '영문 필요' && window.__flag.join(',') === 'n1:en=done';
  }));
  chk('영문 필요 건수를 통계바에 알린다', await p.evaluate(() => {
    newsItems[0].en = 'need'; renderNews();
    return /영문 필요/.test(document.getElementById('news-bar').textContent);
  }));

  console.log('\n[목록 — 정렬 · 거르기]');
  /* 기본은 우선순위 높은 순 — 오늘 뭘 먼저 챙길지가 맨 위에 있어야 한다(사용자 지정). */
  chk('기본 정렬 = 우선순위 높은 순', await p.evaluate(() => {
    newsItems[0].priority = 1; newsItems[1].priority = 5; newsItems[2].priority = 3;
    renderNews();
    return [...document.querySelectorAll('#news-list tbody tr td.nr-no')].map((e) => e.textContent).join(',');
  }) === '2,3,1');
  chk('같은 우선순위면 최신이 위', await p.evaluate(() => {
    newsItems.forEach((a) => { a.priority = 0; }); renderNews();
    return [...document.querySelectorAll('#news-list tbody tr td.nr-no')].map((e) => e.textContent).join(',');
  }) === '3,2,1');
  chk('머리글을 누르면 그 열로 정렬 · 다시 누르면 반대로', await p.evaluate(async () => {
    document.querySelector('[data-news-sort="no"]').click();
    const asc = [...document.querySelectorAll('#news-list tbody tr td.nr-no')].map((e) => e.textContent).join(',');
    document.querySelector('[data-news-sort="no"]').click();
    const desc = [...document.querySelectorAll('#news-list tbody tr td.nr-no')].map((e) => e.textContent).join(',');
    return asc === '1,2,3' && desc === '3,2,1';
  }));
  chk('단계로 거르기', await p.evaluate(() => {
    const sel = document.querySelector('[data-nf="stage"]');
    sel.value = 'draft'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelectorAll('#news-list tbody tr').length === 1;
  }));
  chk('담당자로 거르기', await p.evaluate(() => {
    document.querySelector('[data-news-nfclear]').click();
    const sel = document.querySelector('[data-nf="person"]');
    sel.value = '박취재'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = document.querySelectorAll('#news-list tbody tr');
    return rows.length === 1 && /박취재/.test(rows[0].textContent);
  }));
  chk('협조부서로 거르기', await p.evaluate(() => {
    document.querySelector('[data-news-nfclear]').click();
    const sel = document.querySelector('[data-nf="dept"]');
    sel.value = '운영본부'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelectorAll('#news-list tbody tr').length === 1;
  }));
  chk('검색어로 거르기 · 없으면 안내', await p.evaluate(async () => {
    document.querySelector('[data-news-nfclear]').click();
    const q = document.querySelector('[data-nf="q"]');
    q.value = '없는말'; q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    const empty = /조건에 맞는 기사가 없습니다/.test(document.getElementById('news-list').textContent);
    document.querySelector('[data-news-nfclear]').click();
    return empty && document.querySelectorAll('#news-list tbody tr').length === 3;
  }));
  chk('거르는 중에는 보이는 건수를 알린다', await p.evaluate(() => {
    const sel = document.querySelector('[data-nf="stage"]');
    sel.value = 'draft'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const bar = /보이는/.test(document.getElementById('news-bar').textContent);
    document.querySelector('[data-news-nfclear]').click();
    return bar;
  }));
  chk('목록에 협조부서와 취재 담당자가 보인다', await p.evaluate(() => {
    const row = [...document.querySelectorAll('#news-list tbody tr')].find((r) => /개영식 현장/.test(r.textContent));
    return /기획조정본부/.test(row.querySelector('td.nr-dept').textContent)
      && /취재 박취재/.test(row.querySelector('td.nr-author').textContent);
  }));

  await p.evaluate(() => {   // 뒤 검사들이 기본 순서를 전제하므로 픽스처 상태로 되돌린다
    newsItems[0].priority = 3.5; newsItems[1].priority = 0; newsItems[2].priority = 0;
    newsSort = { key: 'pri', dir: 'desc' }; newsFilter = { stage: '', en: '', person: '', dept: '', q: '' };
    renderNews();
  });

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
  chk('협조부서 칩 입력(Enter 커밋 · 중복 차단)', await p.evaluate(() => {
    const ip = document.getElementById('news-deptinput');
    ip.value = '급식편의본부'; ip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const one = document.querySelectorAll('#news-deptsec .news-tag').length;
    const ip2 = document.getElementById('news-deptinput');
    ip2.value = '급식편의본부'; ip2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return one === 1 && document.querySelectorAll('#news-deptsec .news-tag').length === 1;
  }));
  chk('부서 후보(datalist)가 붙는다', await p.evaluate(() => {
    const dl = document.getElementById('news-dept-list');
    return !!dl && dl.querySelectorAll('option').length >= 5;
  }));
  chk('저장 payload 에 부제목·태그·단계·협조부서가 실린다', await p.evaluate(async () => {
    document.getElementById('news-title').value = '새 기사';
    document.getElementById('news-title').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('news-subtitle').value = '부제 테스트';
    document.getElementById('news-subtitle').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#news-stage [data-nst="reviewed"]').click();
    newsEdit.body = '<p>본문</p>';
    commitNews(); await new Promise((r) => setTimeout(r, 250));
    const s = window.__save;
    return !!s && s.title === '새 기사' && s.subtitle === '부제 테스트' && s.stage === 'reviewed'
      && Array.isArray(s.tags) && s.tags[0] === '개영식' && Array.isArray(s.depts) && s.depts[0] === '급식편의본부';
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
    return /검수 코멘트 2/.test(body.textContent) && /사진 교체 바랍니다/.test(body.textContent)
      && !!body.querySelector('[data-ac-input]') && !!body.querySelector('[data-ac-send]');
  }));
  // 검수 의견은 한 줄로 끝나지 않는다(사용자 요청) — 줄바꿈이 되는 칸이어야 하고 Enter 로 전송돼선 안 된다
  chk('코멘트 칸이 여러 줄 입력(textarea)', await p.evaluate(() => {
    const el = document.querySelector('#nv-body [data-ac-input]');
    return el.tagName === 'TEXTAREA' && +el.getAttribute('maxlength') >= 4000;
  }));
  chk('Enter 는 줄바꿈 · 전송되지 않음', await p.evaluate(async () => {
    window.__save = null; const el = document.querySelector('#nv-body [data-ac-input]');
    el.focus(); el.value = '첫 줄';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    return !window.__cmt;
  }));
  chk('여러 줄 입력이 커지고 ⌘/Ctrl+Enter 로 등록', await p.evaluate(async () => {
    const el = document.querySelector('#nv-body [data-ac-input]');
    const h0 = el.getBoundingClientRect().height;
    el.value = '한 줄\n두 줄\n세 줄\n네 줄\n다섯 줄';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    const h1 = el.getBoundingClientRect().height;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    return h1 > h0 && window.__cmt && window.__cmt.text.split('\n').length === 5;
  }));
  chk('여러 줄 코멘트가 줄바꿈 그대로 보인다', await p.evaluate(() => {
    const t = document.querySelector('#nv-body .ac-t');
    return getComputedStyle(t).whiteSpace === 'pre-wrap';
  }));
  // v0.9.295 — 카드뉴스 제작기 종료로 '카드뉴스 만들기'(기사 → 제작기) 버튼을 뺐다.
  //  되살아나면 죽은 주소로 새 창이 열린다.
  chk('카드뉴스 만들기 버튼이 없다(제작기 종료)', await p.evaluate(() => !document.querySelector('[data-news-tocard]')));
  // ⚠️ 다만 '카드뉴스 가공됨' 업무 플래그는 제작기와 무관하다 — 같이 지우면 진행 상태를 잃는다.
  chk('카드뉴스 가공 여부 플래그는 남아 있다', await p.evaluate(() => !!document.querySelector('#nv-tools [data-news-flag$="cardnewsDone"]')));
  chk('모달에 영문 4단계 버튼 · 현재 상태 강조', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#nv-tools [data-nv-en]')];
    return bs.length === 4 && bs.map((x) => x.getAttribute('data-nv-en').split('~')[1]).join(',') === ',need,done,skip'
      && bs[1].className.includes('solid');
  }));
  chk('사진 담당자가 목록·모달에 보인다', await p.evaluate(() =>
    /김사진/.test(document.querySelector('#news-list td.nr-author').textContent)
    && /사진 김사진/.test(document.querySelector('#nv-body .pv-meta').textContent)));
  chk('취재 담당자가 목록·모달에 보인다', await p.evaluate(() =>
    /취재 박취재/.test(document.querySelector('#news-list td.nr-author').textContent)
    && /취재 박취재/.test(document.querySelector('#nv-body .pv-meta').textContent)));
  chk('협조부서가 모달에 칩으로 보인다', await p.evaluate(() => {
    const el = document.querySelector('#nv-body .nv-depts');
    return !!el && /기획조정본부/.test(el.textContent) && /운영본부/.test(el.textContent)
      && el.querySelectorAll('.news-tag.dept').length === 2;
  }));
  chk('취재 담당자도 모달에서 배정된다', await p.evaluate(async () => {
    window.__flag = [];
    document.getElementById('nv-reporter-in').value = '최기자';
    document.querySelector('[data-nv-reporter]').click();
    await new Promise((r) => setTimeout(r, 400));
    return window.__flag.join(',') === 'n1:reporter=최기자';
  }));
  chk('담당자 배정칸 + 명단 후보(datalist)', await p.evaluate(() => {
    const ip = document.getElementById('nv-photog-in');
    return !!ip && ip.value === '김사진' && !!document.getElementById('nv-photog-list') && !!document.querySelector('[data-nv-photog]');
  }));
  chk('배정하면 서버로(버전 경로가 아니라 flags)', await p.evaluate(async () => {
    window.__flag = [];
    document.getElementById('nv-photog-in').value = '이촬영';
    document.querySelector('[data-nv-photog]').click();
    await new Promise((r) => setTimeout(r, 400));
    return window.__flag.join(',') === 'n1:photog=이촬영';
  }));
  chk('현재 버전 배지 V3', await p.evaluate(() => (document.querySelector('#nv-body .nv-ver') || {}).textContent) === 'V3');
  chk('검수 코멘트마다 기준 버전 배지', await p.evaluate(() =>
    [...document.querySelectorAll('#nv-body .ac-v')].map((e) => e.textContent).join(',')) === 'V1,V3');
  chk('버전 기록 3판(접혀 있음)', await p.evaluate(() => {
    const h = document.querySelector('[data-nv-hist]');
    return !!h && /버전 기록 3판/.test(h.textContent) && !document.querySelector('.nvh-list');
  }));
  /* v0.9.287 — 목록 응답이 판마다 본문을 싣고 있어 기사가 쌓일수록 화면이 느려졌다.
     목록에는 v·제목·작성자·시각만, 본문은 옛 판을 실제로 열 때만 받아 온다. */
  chk('기록을 펴면 최신 판이 위 · 현재 판 표시', await p.evaluate(async () => {
    document.querySelector('[data-nv-hist]').click(); await new Promise((r) => setTimeout(r, 250));
    const rows = [...document.querySelectorAll('.nvh-row')];
    return rows.length === 3 && rows[0].querySelector('.nvh-v').textContent === 'V3'
      && /현재/.test(rows[0].textContent) && rows[2].querySelector('.nvh-v').textContent === 'V1';
  }));
  chk('기록을 펴면 그때 본문을 받아 온다(한 번만)', await p.evaluate(() => (window.__detailFetched || 0) >= 1));
  chk('옛 판을 고르면 그 판의 내용을 읽는다', await p.evaluate(async () => {
    document.querySelector('[data-nv-ver="1"]').click(); await new Promise((r) => setTimeout(r, 250));
    const w = document.getElementById('nv-verview');
    return !w.hidden && /V1/.test(w.textContent) && /첫 판/.test(w.textContent) && /개영식/.test(w.querySelector('.nvv-t').textContent);
  }));
  chk('현재 판으로 돌아오면 옛 판 영역이 닫힌다', await p.evaluate(async () => {
    document.querySelector('[data-nv-vclose]').click(); await new Promise((r) => setTimeout(r, 250));
    const w = document.getElementById('nv-verview');
    return w.hidden && /본문/.test(document.querySelector('#nv-body .pv-text').textContent);
  }));
  chk('단계 버튼 3개 · 현재 단계 강조', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#nv-tools [data-nv-st]')];
    return bs.length === 3 && bs.find((x) => x.dataset.nvSt === 'published').className.includes('solid');
  }));
  await p.evaluate(() => { window.__flag = []; document.querySelector('[data-nv-st="draft"]').click(); }); await wait(400);
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

  console.log('\n[알림 — 내 기사 검수 코멘트]');
  /* 서버에 알림 저장소를 새로 두지 않고 기사 레코드의 코멘트에서 뽑는다.
     내 기사 + 내가 참여한 기사의 **남의** 코멘트만 알린다 — 내 코멘트가 나에게 알림으로 오면 소음이다. */
  const p6 = await boardPage(b, base, 'admin');
  p6.on('pageerror', (e) => errors.push(e.message));
  p6.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const srvNoti = await p6.evaluate(async () => {
    window.__notiSrv = [{ id: 'c9', articleId: 'n1', title: '개영식 현장', whoName: '김검수', text: '서버 알림함 항목', ts: '2026-07-20T10:00:00Z', v: 3 }];
    await loadNoti(); await new Promise((r) => setTimeout(r, 200));
    return { n: notiItems().length, first: notiItems()[0].text, unread: notiUnread().length };
  });
  chk('서버 알림함이 있으면 그것이 사실', srvNoti.n === 1 && srvNoti.first === '서버 알림함 항목' && srvNoti.unread === 1, JSON.stringify(srvNoti));
  chk('모두 읽음이 서버에도 전달된다', await p6.evaluate(async () => {
    window.__notiRead = false; notiMarkAll(); await new Promise((r) => setTimeout(r, 350));
    return window.__notiRead === true && notiUnread().length === 0;
  }));
  await p6.close();

  // 서버 알림함이 안 될 때 — 화면에서 뽑는 방식(v0.9.251)으로 되돌아가야 한다. 알림 하나로 보드가 멈추면 안 된다.
  const p6b = await b.newPage(); await p6b.setViewport({ width: 1440, height: 1000 });
  await p6b.evaluateOnNewDocument(SEED, NEWS, 'admin');
  // 같은 브라우저라 앞 페이지에서 찍은 '읽음' 표시(localStorage)가 남는다 — 되돌림 경로를 맨 처음 상태에서 본다
  await p6b.evaluateOnNewDocument(() => { window.__notiFail = true; try { localStorage.removeItem('jamboree-plan:noti-read'); } catch (e) {} });
  await p6b.goto(base + '/krjam-planning', { waitUntil: 'networkidle2' });
  await wait(700); await p6b.evaluate(() => setView('news')); await wait(600);
  p6b.on('pageerror', (e) => errors.push(e.message));
  p6b.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const noti = await p6b.evaluate(() => {
    const items = notiItems();
    return { n: items.length, ids: items.map((x) => x.id), mine: items.map((x) => x.mine),
      badge: (document.getElementById('noti-count') || {}).textContent,
      badgeHidden: (document.getElementById('noti-count') || {}).hidden,
      btnShown: getComputedStyle(document.getElementById('noti-btn')).display !== 'none' };
  });
  chk('서버가 안 되면 화면에서 뽑아 알린다(내 기사·참여한 기사)', noti.n === 3 && noti.ids.join(',') === 'n3,n2,n1' && noti.mine.join(',') === 'false,true,true',
    JSON.stringify(noti.ids) + ' mine=' + noti.mine.join(','));
  chk('내가 쓴 코멘트는 나에게 알리지 않음', await p6b.evaluate(() => notiItems().every((x) => x.text !== '내가 단 의견')));
  chk('로그인 상태에서 종 버튼 + 안 읽은 수 배지', noti.btnShown && noti.badgeHidden === false && noti.badge === '3', noti.badge);
  chk('종을 누르면 목록 · 최신이 위', await p6b.evaluate(async () => {
    document.getElementById('noti-btn').click(); await new Promise((r) => setTimeout(r, 200));
    const rows = [...document.querySelectorAll('.notiitem')];
    return !document.getElementById('noti-panel').hidden && rows.length === 3
      && /참여한 기사/.test(rows[0].textContent) && /김검수/.test(rows[0].textContent);
  }));
  chk('모두 읽음 → 배지 사라짐(목록은 남음)', await p6b.evaluate(async () => {
    document.getElementById('noti-readall').click(); await new Promise((r) => setTimeout(r, 250));
    return document.getElementById('noti-count').hidden && document.querySelectorAll('.notiitem').length === 3
      && document.querySelectorAll('.notiitem.new').length === 0;
  }));
  chk('읽음 표시가 다시 열어도 유지(localStorage)', await p6b.evaluate(async () => {
    toggleNoti(false); document.getElementById('noti-btn').click(); await new Promise((r) => setTimeout(r, 200));
    return notiUnread().length === 0;
  }));
  chk('알림을 누르면 그 기사가 모달로 열린다', await p6b.evaluate(async () => {
    document.querySelector('[data-noti]').click(); await new Promise((r) => setTimeout(r, 500));
    return document.getElementById('newsview-scrim').classList.contains('show')
      && /남이 쓴 기사/.test(document.getElementById('nv-title').textContent)
      && document.getElementById('noti-panel').hidden;
  }));
  await p6b.close();

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
        const LOW = 39.5;   // 40px 하한 + 서브픽셀 오차 여유
        if (el.tagName === 'BUTTON' && !MICRO.some((c) => el.classList.contains(c)) && r.height < LOW)
          tap.push(r.height.toFixed(2) + 'px ' + (el.className || el.tagName));
        if (el.tagName === 'INPUT' && el.type === 'text' && r.height < LOW) tap.push(r.height.toFixed(2) + 'px input');
        if (el.tagName === 'INPUT' && el.type === 'checkbox' && Math.min(r.height, r.width) < 18)
          tap.push(Math.round(r.height) + 'px checkbox');
      });
      return { small: [...new Set(small)], tap: [...new Set(tap)] };
    };
    const out = { list: scan(document.getElementById('news-list')) };
    document.querySelector('[data-news-view]').click(); await new Promise((r) => setTimeout(r, 700));
    out.view = scan(document.querySelector('#newsview-scrim .modal'));
    closeNewsView(); openNewsEditor(null); await new Promise((r) => setTimeout(r, 700));
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
