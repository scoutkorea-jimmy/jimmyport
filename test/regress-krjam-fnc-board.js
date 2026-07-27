/* 급식편의본부 안내 보드 회귀 (v0.9.253)
   PDF 플립북(/krjam-fnc-book)은 그대로 두고, /krjam-fnc 를 "찾아 쓰는 화면"으로 바꿨다.
   여기서 지키는 것:
     · 9개 화면이 모두 열리고 콘솔 에러가 없다(내용을 문자열로 조립하므로 한 곳만 깨져도 화면이 빈다)
     · 자료의 숫자·시간이 원문과 같다 — 잘못 옮기면 현장에서 사람이 헛걸음한다
     · **식사 메뉴는 홍보부 보드와 같은 자료**(/api/jp-meals)를 읽는다. 화면에 따로 적어 두면 반드시 어긋난다
     · 체크리스트가 저장되고, 카운트다운·식사 운영중 표시가 실제 시각으로 계산된다
     · 접근성 하한(글자 13px · 조작 40px)과 모바일 가로 넘침 없음
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-fnc-board.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8896;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const ROUTES = { '/krjam-fnc': '/krjam-fnc.html', '/krjam-fnc-book': '/krjam-fnc-book.html' };

// 홍보부 보드가 쓰는 메뉴 자료를 그대로 흉내낸다(crew_n · crew_s · staff × 날짜 × b/l/d)
const MEALS = { ok: true, updatedAt: '2026-07-20T00:00:00Z', meals: {
  crew_n: { '2026-08-05': { b: '시리얼·우유', l: '유닛 자율 조리', d: '불고기 세트' } },
  crew_s: {},
  staff: { '2026-08-05': { b: '그린샐러드·모닝빵', l: '간편식', d: '제육볶음' },
           '2026-08-06': { b: '죽·샐러드', l: '간편식', d: '닭갈비' } } } };
let mealHits = 0, mealFail = false, dutyPuts = 0, mealPuts = 0, staffPuts = 0;
const STAFF = { staff: [{ id: 'st1', name: '김운영', phone: '01012345678' }, { id: 'st2', name: '이배식', phone: '01099998888' }], shifts: { '2026-08-05': { am: ['st1'], pm: ['st2'] } } };
const DUTIES = { duties: { supply: { main: '주명림', sub: '장문수', note: '06:00 보급 준비' } }, updatedAt: '2026-07-25T10:00:00Z', by: '심호웅' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/jp-meals')) {
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (!/Bearer /.test(req.headers.authorization || '')) { res.writeHead(401); return res.end('{"ok":false}'); }
        try { var b = JSON.parse(body); MEALS.meals[b.group] = MEALS.meals[b.group] || {}; MEALS.meals[b.group][b.date] = MEALS.meals[b.group][b.date] || { b: '', l: '', d: '' }; MEALS.meals[b.group][b.date][b.meal] = b.value; mealPuts++; } catch (e) {}
        res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, meals: MEALS.meals, updatedAt: '2026-07-27T00:00:00Z' }));
      });
      return;
    }
    mealHits++;
    if (mealFail) { res.writeHead(500); return res.end('err'); }
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(MEALS));
  }
  if (p === '/api/jp-fnc-staff') {
    var admin = /Bearer FNCTOK/.test(req.headers.authorization || '');
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (!admin) { res.writeHead(401); return res.end('{"ok":false}'); }
        try { var b = JSON.parse(body); STAFF.staff = b.staff || []; STAFF.shifts = b.shifts || {}; staffPuts++; } catch (e) {}
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, staff: STAFF.staff, shifts: STAFF.shifts, updatedAt: 'x', by: '급식 관리자', admin: true }));
      });
      return;
    }
    var st = admin ? STAFF.staff.map((s) => ({ id: s.id, name: s.name, phone: s.phone }))
      : STAFF.staff.map((s) => ({ id: s.id, name: s.name, phone4: String(s.phone || '').slice(-4) }));
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, staff: st, shifts: STAFF.shifts, updatedAt: 'x', by: '', admin: admin }));
  }
  if (p === '/api/jp-fnc-auth') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let b = {}; try { b = JSON.parse(body); } catch (e) {}
      if (b.id === 'admin' && b.pw === 'admin') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, token: 'FNCTOK', exp: Date.now() + 9e6 })); }
      else { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":false}'); }
    });
    return;
  }
  if (p.startsWith('/api/jp-fnc')) {
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (!/Bearer /.test(req.headers.authorization || '')) { res.writeHead(401); return res.end('{"ok":false}'); }
        try { DUTIES.duties = JSON.parse(body).duties || {}; } catch (e) {}
        DUTIES.updatedAt = '2026-07-26T10:00:00Z'; DUTIES.by = '박지민'; dutyPuts++;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, duties: DUTIES.duties, updatedAt: DUTIES.updatedAt, by: DUTIES.by }));
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, duties: DUTIES.duties, updatedAt: DUTIES.updatedAt, by: DUTIES.by }));
  }
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (ROUTES[p]) p = ROUTES[p];
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});

const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const base = `http://localhost:${PORT}`;
  const errors = [], failed = [];

  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // 외부 CDN(Pretendard 웹폰트 등)은 우리 자원이 아니라 간헐적으로 실패할 수 있다 — 우리 보드 검증에서 제외한다.
  p.on('requestfailed', (r) => { const u = r.url(); if (!/^https?:\/\//.test(u) || /scoutingapp\.net|localhost/.test(u)) failed.push(u); });
  await p.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' });
  await wait(700);

  console.log('\n[화면 · 이동]');
  const views = await p.evaluate(() => window.__fncBoard.VIEWS.map((v) => v.id));
  chk('화면 12개 정의', views.length === 12 && views[0] === 'home', views.join(','));
  chk('좌측 내비 12개 · 모바일 탭 5개', await p.evaluate(() =>
    document.querySelectorAll('#sidenav .navitem').length === 12 && document.querySelectorAll('#tabbar .tabbtn').length === 5));
  const empties = [];
  for (const v of views) {
    await p.evaluate((x) => window.__fncBoard.setView(x), v);
    await wait(220);
    // 원문 보기는 글이 아니라 플립북 틀이 본체다 — 글자 수 대신 iframe 으로 확인한다
    const ok = await p.evaluate((view) => {
      const el = document.querySelector('.view');
      if (view === 'book') return !!el.querySelector('iframe');
      return el.textContent.replace(/\s+/g, '').length >= 120;
    }, v);
    if (!ok) empties.push(v);
  }
  chk('12개 화면 모두 내용이 채워진다', empties.length === 0, empties.join(' | '));
  chk('해시로 화면이 유지된다', await p.evaluate(async () => {
    location.hash = '#inout'; await new Promise((r) => setTimeout(r, 300));
    return document.getElementById('view-title').textContent === '입영 · 퇴영';
  }));

  console.log('\n[자료 정확도 — 원문과 같은 값]');
  await p.evaluate(() => window.__fncBoard.setView('food')); await wait(300);
  const food = await p.evaluate(() => document.querySelector('.view').textContent.replace(/\s+/g, ' '));
  const need = [
    ['식자재 보급 기간', '8. 5.(수) 석식 ~ 8. 9.(일) 조식'],
    ['보급소 운영시간', '06:00~07:00'], ['석식 보급', '16:00~17:00'],
    ['참가자 인원', '941명'], ['지도자 인원', '157명'],
    ['운영요원 인원', '494명'], ['CMT', '114명'],
    ['컵스카우트 1기', '299명'], ['컵스카우트 2기', '284명'],
    ['1식당 수용', '200명'], ['2식당 수용', '50명'],
    ['패스트트랙 30분', '30분간만'],
  ];
  const miss = need.filter(([, t]) => food.replace(/\s/g, '').indexOf(t.replace(/\s/g, '')) < 0).map(([k]) => k);
  chk('급식 화면 숫자 12종이 원문과 같다', miss.length === 0, miss.join(' | '));
  chk('식권 4종', await p.evaluate(() => {
    const t = document.querySelector('.view').textContent;
    return ['운영요원', '패스트 트랙', '컵스카우트 참관단', '일반식권'].every((x) => t.indexOf(x) >= 0);
  }));
  await p.evaluate(() => window.__fncBoard.setView('inout')); await wait(300);
  const io = await p.evaluate(() => document.querySelector('.view').textContent.replace(/\s+/g, ' '));
  chk('입영 8/3 14:00 · 퇴영 8/9 11:00', /2026\. 08\. 03\.\(월\) 14:00/.test(io) && /8\/9\(일\) 11:00/.test(io));
  chk('도착 절차 두 갈래(단체버스 7단계 · 개인이동 7단계)', await p.evaluate(() =>
    [...document.querySelectorAll('.flow')].map((f) => f.querySelectorAll('.st').length).join(',')) === '7,7');
  await p.evaluate(() => window.__fncBoard.setView('org')); await wait(300);
  chk('조직도 — 본부장 + 4개 부서', await p.evaluate(() => {
    const t = document.querySelector('.org').textContent;
    return /본부장 심호웅/.test(t) && document.querySelectorAll('.orgbox').length === 4
      && ['유학준', '김은철', '안재용', '김영희'].every((n) => t.indexOf(n) >= 0);
  }));

  console.log('\n[식사 메뉴 — 홍보부와 같은 자료]');
  const before = mealHits;
  await p.evaluate(() => window.__fncBoard.setView('menu')); await wait(600);
  chk('서버(/api/jp-meals)에서 메뉴를 읽는다', mealHits > 0, mealHits + '회 호출');
  chk('메뉴 화면에 서버 값이 그대로 나온다', await p.evaluate(() => {
    const t = document.getElementById('menubox').textContent;
    return t.indexOf('그린샐러드·모닝빵') >= 0 && t.indexOf('제육볶음') >= 0;
  }));
  chk('식사 표 반전(급식보드 한정 · 행=조/중/석, 열=날짜)', await p.evaluate(() => {
    var ths = [].map.call(document.querySelectorAll('#menubox thead th'), function (x) { return x.textContent; });
    var rowhs = [].map.call(document.querySelectorAll('#menubox tbody th'), function (x) { return x.textContent; });
    return ths[0] === '구분' && ths.length === 8 && rowhs.join(',') === '조식,중식,석식';
  }));
  chk('그룹 3종(대원 일반식·특별식·운영요원) 전환', await p.evaluate(async () => {
    const bs = [...document.querySelectorAll('[data-mg]')];
    if (bs.length !== 3) return false;
    bs.find((x) => x.getAttribute('data-mg') === 'crew_n').click();
    await new Promise((r) => setTimeout(r, 200));
    return document.getElementById('menubox').textContent.indexOf('불고기 세트') >= 0;
  }));
  chk('화면에 메뉴를 따로 적어 두지 않는다(자료 중복 금지)', (() => {
    const src = fs.readFileSync(path.join(ROOT, 'krjam-fnc/board.js'), 'utf8');
    return src.indexOf('제육볶음') < 0 && src.indexOf('불고기') < 0 && /api\/jp-meals/.test(src);
  })());
  const api = await import('../functions/api/jp-meals.js');
  chk('서버는 메뉴 텍스트만 내보낸다(그룹 3종 고정)', JSON.stringify(api.MEAL_GROUPS) === '["crew_n","crew_s","staff"]');
  chk('망가진 값이 와도 빈 표로 떨어진다', (() => {
    const r = api.pickMeals({ crew_n: { 'bad-date': { b: 'x' }, '2026-08-05': { b: '토스트' } }, junk: 1 });
    return Object.keys(r).length === 3 && Object.keys(r.crew_n).length === 1 && r.crew_n['2026-08-05'].b === '토스트';
  })());
  chk('빈 저장소여도 폭발하지 않는다', JSON.stringify(api.pickMeals(null)) === '{"crew_n":{},"crew_s":{},"staff":{}}');

  console.log('\n[담당 배정]');
  await p.evaluate(() => window.__fncBoard.setView('duty')); await wait(700);
  chk('배정 대상 10종 · 서버 값이 그대로 보인다', await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.dutytbl tbody tr')];
    return rows.length === 10 && /주명림/.test(rows[0].textContent) && /장문수/.test(rows[0].textContent)
      && /미배정/.test(rows[1].textContent);
  }));
  chk('배정 건수와 마지막 수정자를 알린다', await p.evaluate(() => {
    const t = document.querySelector('.dutybar').textContent;
    return /배정 1 \/ 10/.test(t) && /심호웅/.test(t);
  }));
  chk('로그인 안 하면 바꾸지 못한다(안내만)', await p.evaluate(() =>
    !document.getElementById('duty-edit') && /로그인/.test(document.querySelector('.dutybar').textContent)));
  chk('서버 화이트리스트 키 10종이 화면과 같다', await (async () => {
    const api = await import('../functions/api/jp-fnc.js');
    const ui = await p.evaluate(() => window.__fncBoard.DUTIES.map((d) => d[0]));
    return JSON.stringify(api.DUTY_KEYS) === JSON.stringify(ui);
  })());
  chk('서버는 모르는 키를 버리고 공백을 접는다', await (async () => {
    const api = await import('../functions/api/jp-fnc.js');
    const r = api.cleanDuties({ supply: { main: '  김  철수 ', sub: '', note: 'x' }, hack: { main: 'a' }, hall1: { main: '', sub: '', note: '' } });
    return Object.keys(r).length === 1 && r.supply.main === '김 철수';
  })());
  // 홍보부 보드 세션이 있으면 같은 화면에서 바로 배정할 수 있어야 한다
  const p4 = await b.newPage(); await p4.setViewport({ width: 1440, height: 1000 });
  const err4 = [];
  p4.on('pageerror', (e) => err4.push(e.message));
  p4.on('console', (m) => { if (m.type() === 'error') err4.push(m.text()); });
  await p4.evaluateOnNewDocument(() => {
    localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: 'admin', exp: Date.now() + 9e6 }));
  });
  await p4.goto(base + '/krjam-fnc#duty', { waitUntil: 'networkidle2' }); await wait(900);
  chk('로그인 상태면 배정 버튼이 보인다', await p4.evaluate(() => !!document.getElementById('duty-edit')));
  chk('배정을 바꿔 저장하면 서버로 간다', await p4.evaluate(async () => {
    document.getElementById('duty-edit').click(); await new Promise((r) => setTimeout(r, 250));
    const el = document.querySelector('[data-duty="hall1~main"]');
    if (!el) return false;
    el.value = '이훈혁';
    document.querySelector('[data-duty="hall1~note"]').value = '배식 총괄';
    document.getElementById('duty-save').click(); await new Promise((r) => setTimeout(r, 600));
    const t = document.querySelector('.dutytbl tbody').textContent;
    return /이훈혁/.test(t) && /배식 총괄/.test(t) && !document.getElementById('duty-save');
  }));
  chk('저장이 서버에 실제로 도달했다', dutyPuts === 1, dutyPuts + '회');
  chk('저장 뒤 배정 건수가 늘어난다', await p4.evaluate(() => /배정 2 \/ 10/.test(document.querySelector('.dutybar').textContent)));
  chk('배정 화면 콘솔 에러 0', err4.length === 0, err4.slice(0, 2).join(' | '));
  await p4.close();

  console.log('\n[살아 있는 부분]');
  await p.evaluate(() => window.__fncBoard.setView('home')); await wait(500);
  chk('카운트다운 3종이 초 단위로 흐른다', await p.evaluate(async () => {
    const t0 = document.querySelector('#hero .dv').textContent;
    await new Promise((r) => setTimeout(r, 2200));   // 1초 tick + CPU 경합 여유(플레이키 방지)
    const t1 = document.querySelector('#hero .dv').textContent;
    return document.querySelectorAll('#hero .dcard').length === 3 && t0 !== t1;
  }));
  chk('식사 운영 상태를 지금 시각으로 계산한다', await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#mealnow .meal')];
    const h = new Date().getHours() * 60 + new Date().getMinutes();
    const want = [[420, 540], [720, 840], [1020, 1200]].map(([a, z]) => h < a ? '예정' : (h >= z ? '종료' : '운영 중'));
    return rows.length === 3 && rows.map((r) => r.querySelector('.chip').textContent).join(',') === want.join(',');
  }));
  await p.evaluate(() => window.__fncBoard.setView('ist')); await wait(400);
  chk('체크박스는 두지 않는다(읽는 화면)', await p.evaluate(() =>
    !document.querySelector('[data-ck]') && !document.querySelector('input[type=checkbox]')));
  chk('지급품·숙박에 원문 도표가 함께 놓인다', await p.evaluate(() =>
    document.querySelectorAll('.fig').length >= 3));

  console.log('\n[원문 도표]');
  await p.evaluate(() => window.__fncBoard.setView('gallery')); await wait(500);
  chk('도표 모음 20종 이상', await p.evaluate(() => document.querySelectorAll('.figgrid .fig').length >= 20));
  chk('썸네일로 먼저 보여 준다', await p.evaluate(() =>
    /\/krjam-fnc\/thumbs\/t\d\d\.webp$/.test(document.querySelector('.figbtn img').getAttribute('src'))));
  chk('도표를 누르면 원본 쪽이 크게 열린다', await p.evaluate(async () => {
    document.querySelector('[data-fig="5"]').click(); await new Promise((r) => setTimeout(r, 300));
    const lb = document.getElementById('lightbox');
    const img = lb.querySelector('.lb-img img');
    return !lb.hidden && /\/krjam-fnc\/pages\/p05\.webp$/.test(img.getAttribute('src')) && /조직도/.test(lb.textContent);
  }));
  chk('다음 쪽 · 닫기가 동작한다', await p.evaluate(async () => {
    document.getElementById('lb-next').click(); await new Promise((r) => setTimeout(r, 250));
    const moved = /\/krjam-fnc\/pages\/p07\.webp$/.test(document.querySelector('#lightbox .lb-img img').getAttribute('src'));
    document.getElementById('lb-x').click(); await new Promise((r) => setTimeout(r, 200));
    return moved && document.getElementById('lightbox').hidden;
  }));
  chk('원본 원문으로도 나갈 수 있다', await p.evaluate(async () => {
    document.querySelector('[data-fig="7"]').click(); await new Promise((r) => setTimeout(r, 250));
    const a = document.querySelector('#lightbox a[href^="/krjam-fnc-book#p"]');
    const ok = !!a && a.getAttribute('href') === '/krjam-fnc-book#p7';
    document.getElementById('lb-x').click();
    return ok;
  }));

  console.log('\n[검색]');
  chk('검색이 화면을 가로질러 찾는다', await p.evaluate(async () => {
    const s = document.getElementById('search');
    s.value = '패스트트랙'; s.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    return document.querySelectorAll('#searchres .sr').length > 0;
  }));
  chk('결과를 누르면 그 화면으로 간다', await p.evaluate(async () => {
    document.querySelector('#searchres .sr').click(); await new Promise((r) => setTimeout(r, 300));
    return document.getElementById('searchres').hidden === true && !!document.querySelector('.view');
  }));

  console.log('\n[원문 연결]');
  await p.evaluate(() => window.__fncBoard.setView('book')); await wait(400);
  chk('원문 보기에 플립북이 붙어 있다', await p.evaluate(() =>
    (document.getElementById('bookframe') || {}).getAttribute('src') === '/krjam-fnc-book'));
  chk('PDF 내려받기 링크', await p.evaluate(() =>
    !!document.querySelector('a[href$="KNJ16-FnC-Orientation.pdf"][download]')));
  const srcs = await p.evaluate(() => {
    const out = [];
    window.__fncBoard.setView('food');
    document.querySelectorAll('.src').forEach((a) => out.push(a.getAttribute('href')));
    return out;
  });
  chk('원문 쪽 링크는 플립북 딥링크', srcs.every((h) => !h || /^\/krjam-fnc-book#p\d+$/.test(h) || h === '/krjam-planning'), srcs.join(','));

  console.log('\n[운영요원 · 쉬프트]');
  await p.evaluate(() => window.__fncBoard.setView('staff')); await wait(500);
  chk('운영요원 명단 칩 렌더', await p.evaluate(() => document.querySelectorAll('#staffbox .staffchip').length >= 2));
  chk('비관리자: 전화 끝 4자리만(전체번호 노출 안 함)', await p.evaluate(() => {
    var t = document.getElementById('staffbox').textContent;
    return t.indexOf('김운영') >= 0 && t.indexOf('5678') >= 0 && t.indexOf('01012345678') < 0;
  }));
  chk('비관리자: 배정 편집 UI 없음', await p.evaluate(() => document.querySelectorAll('#staffbox .shift-add').length === 0 && !document.getElementById('staff-add-go')));
  chk('쉬프트 시간 계산(오전05–10·오후11–15·저녁16–21)', await p.evaluate(() => {
    var am = window.__fncBoard.currentShift(new Date('2026-08-05T06:00:00'));
    var pm = window.__fncBoard.currentShift(new Date('2026-08-05T12:00:00'));
    var eve = window.__fncBoard.currentShift(new Date('2026-08-05T17:00:00'));
    var none = window.__fncBoard.currentShift(new Date('2026-08-05T23:30:00'));
    return am[0] === 'am' && pm[0] === 'pm' && eve[0] === 'eve' && none === null;
  }));

  console.log('\n[급식 관리자 로그인]');
  const beforeLogin = await p.evaluate(() => ({ admin: window.__fncBoard.isAdmin(), btn: document.getElementById('fnc-admin-btn').textContent.trim(), modalHidden: document.getElementById('fnc-login').hidden }));
  chk('초기 비로그인(관리자 아님 · 모달 숨김)', beforeLogin.admin === false && beforeLogin.btn === '관리자' && beforeLogin.modalHidden === true, JSON.stringify(beforeLogin));
  await p.click('#fnc-admin-btn'); await wait(80);
  chk('관리자 버튼 → 로그인 모달 열림', await p.evaluate(() => document.getElementById('fnc-login').hidden === false));
  await p.evaluate(() => { document.getElementById('fl-id').value = 'admin'; document.getElementById('fl-pw').value = 'nope'; });
  await p.click('#fl-go'); await wait(400);
  chk('틀린 비번 → 오류 표시 · 비로그인 유지', await p.evaluate(() => document.getElementById('fl-err').hidden === false && window.__fncBoard.isAdmin() === false));
  await p.evaluate(() => { document.getElementById('fl-id').value = 'admin'; document.getElementById('fl-pw').value = 'admin'; });
  await p.click('#fl-go'); await wait(500);
  const afterLogin = await p.evaluate(() => ({ admin: window.__fncBoard.isAdmin(), btn: document.getElementById('fnc-admin-btn').textContent.trim(), modalHidden: document.getElementById('fnc-login').hidden, tok: !!JSON.parse(localStorage.getItem('krjam-fnc:admin') || 'null') }));
  chk('admin/admin 로그인 성공(관리자 · 모달 닫힘 · 토큰 저장)', afterLogin.admin === true && /관리자 ✓/.test(afterLogin.btn) && afterLogin.modalHidden === true && afterLogin.tok === true, JSON.stringify(afterLogin));
  // 로그인 상태 → 식사 메뉴 인라인 편집 + 서버 저장(양방향)
  await p.evaluate(() => window.__fncBoard.setView('menu')); await wait(400);
  const editable = await p.evaluate(() => document.querySelectorAll('#menubox td.mcell[contenteditable]').length);
  chk('관리자 로그인 시 메뉴 셀 편집 가능', editable > 0, editable + '칸');
  const putsBefore = mealPuts;
  await p.evaluate(async () => { var c = document.querySelector('#menubox td.mcell[data-meal="b"]'); c.focus(); c.textContent = '테스트조식'; c.dispatchEvent(new Event('blur', { bubbles: true })); await new Promise((r) => setTimeout(r, 500)); });
  await wait(300);
  chk('메뉴 셀 수정 → 서버(jp-meals) 저장(양방향)', mealPuts > putsBefore, 'PUT ' + (mealPuts - putsBefore));
  // 관리자 상태의 운영요원 뷰: 전화 전체 + 편집 UI + 추가 저장
  await p.evaluate(() => window.__fncBoard.setView('staff')); await wait(500);
  chk('관리자: 전화 전체 표시', await p.evaluate(() => document.getElementById('staffbox').textContent.indexOf('01012345678') >= 0));
  chk('관리자: 운영요원 추가/배정 UI', await p.evaluate(() => !!document.getElementById('staff-add-go') && document.querySelectorAll('#staffbox .shift-add').length > 0));
  const spBefore = staffPuts;
  await p.evaluate(async () => { document.getElementById('staff-name').value = '박신규'; document.getElementById('staff-phone').value = '01055551234'; document.getElementById('staff-add-go').click(); await new Promise((r) => setTimeout(r, 500)); });
  await wait(300);
  chk('관리자: 운영요원 추가 → 서버 저장(PUT)', staffPuts > spBefore, 'PUT ' + (staffPuts - spBefore));
  await p.evaluate(() => { localStorage.removeItem('krjam-fnc:admin'); window.__fncBoard.renderAdminBtn(); });

  console.log('\n[서버가 없을 때]');
  mealFail = true;
  const p3 = await b.newPage(); await p3.setViewport({ width: 1440, height: 1000 });
  const err3 = [];
  p3.on('pageerror', (e) => err3.push(e.message));
  await p3.goto(base + '/krjam-fnc#menu', { waitUntil: 'networkidle2' });
  await wait(900);
  chk('메뉴 API 가 죽어도 화면은 살아 있다', await p3.evaluate(() =>
    document.querySelectorAll('.navitem').length === 12 && /불러오지 못했습니다|다시 불러오기/.test(document.body.textContent)));
  chk('그때도 콘솔 에러 0', err3.length === 0, err3.slice(0, 2).join(' | '));
  await p3.close();
  mealFail = false;

  console.log('\n[접근성 · 모바일 실측]');
  for (const [name, vp] of [['PC', { width: 1440, height: 1000 }], ['모바일', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const pa = await b.newPage(); await pa.setViewport(vp);
    await pa.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(600);
    const bad = { small: [], tap: [], over: 0 };
    for (const v of ['home', 'food', 'menu', 'inout', 'ist', 'sched', 'org', 'fac']) {
      await pa.evaluate((x) => window.__fncBoard.setView(x), v);
      await wait(260);
      const r = await pa.evaluate(() => {
        const vis = (el) => { const b = el.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return false;
          const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1; };
        const small = [], tap = [];
        document.querySelectorAll('*').forEach((el) => {
          if (!vis(el)) return;
          const cs = getComputedStyle(el);
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
          if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
          const rect = el.getBoundingClientRect();
          const ctl = el.tagName === 'BUTTON' || (el.tagName === 'A' && cs.display !== 'inline') || el.tagName === 'INPUT';
          if (ctl && rect.height < 39.5) tap.push(rect.height.toFixed(1) + 'px ' + (el.className || el.tagName));
        });
        return { small: [...new Set(small)], tap: [...new Set(tap)],
          over: document.documentElement.scrollWidth - window.innerWidth };
      });
      bad.small.push(...r.small); bad.tap.push(...r.tap); bad.over = Math.max(bad.over, r.over);
    }
    chk(name + ' 글자 13px 이상', bad.small.length === 0, [...new Set(bad.small)].slice(0, 4).join(' | '));
    chk(name + ' 조작 요소 40px 이상', bad.tap.length === 0, [...new Set(bad.tap)].slice(0, 4).join(' | '));
    chk(name + ' 가로 넘침 없음', bad.over <= 0, bad.over + 'px');
    await pa.close();
  }

  console.log('\n[넓은 화면 — 폭 활용]');
  const pw = await b.newPage(); await pw.setViewport({ width: 2000, height: 1100 });
  await pw.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(700);
  const wide = await pw.evaluate(async () => {
    const out = {};
    const m = document.querySelector('.main');
    out.mainRatio = m.getBoundingClientRect().width / (window.innerWidth - document.querySelector('.side').getBoundingClientRect().width);
    window.__fncBoard.setView('menu'); await new Promise((r) => setTimeout(r, 600));
    const t = document.querySelector('#menubox table');
    out.tableRatio = t ? t.getBoundingClientRect().width / m.getBoundingClientRect().width : 0;
    out.over = document.documentElement.scrollWidth - window.innerWidth;
    return out;
  });
  chk('본문이 화면 폭을 채운다(90% 이상)', wide.mainRatio >= 0.9, (wide.mainRatio * 100).toFixed(0) + '%');
  chk('표가 본문 폭을 채운다(90% 이상)', wide.tableRatio >= 0.9, (wide.tableRatio * 100).toFixed(0) + '%');
  chk('넓은 화면에서도 가로 넘침 없음', wide.over <= 0, wide.over + 'px');
  await pw.close();

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));
  chk('요청 실패 0', failed.length === 0, failed.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
