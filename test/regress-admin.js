/* 운영 현황 /admin 회귀 (v0.9.257)
   TOTP 로 잠그고, 유입·라우팅·배포 상태를 보여 주는 화면의 계약을 지킨다.
     · 인증 전에는 대시보드가 **보이지 않는다**(잠금 화면만)
     · 코드가 틀리면 토큰을 저장하지 않는다 · 맞으면 들어가고, 401 을 받으면 다시 잠근다
     · 토큰은 sessionStorage 에만 둔다(탭을 닫으면 사라진다 — 공용 PC 대비)
     · 유입 표·그래프·라우팅 점검·배포 기록이 실제 값으로 그려진다
   실행: NODE_PATH=<scratch>/node_modules node test/regress-admin.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8906;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const GOOD = '123456';
const HISTORY = Array.from({ length: 22 }, (_, i) => ({
  startedAt: '2026-07-2' + (i % 7) + 'T01:00:00Z', finishedAt: '2026-07-2' + (i % 7) + 'T01:20:00Z',
  label: '전체 회귀', rounds: 3, roundTotal: 3, done: 42, total: 42, checks: 1180,
  fails: i === 0 ? 1 : 0, ok: i !== 0,
  suites: ['regress-krjam-news', 'regress-krjam-jebo', 'regress-landing'],
  failures: i === 0 ? [{ round: 2, file: 'regress-krjam-news', check: '콘솔 에러 0', detail: 'TypeError: x' }] : [],
})).slice(0, 20);
const RUN = { ok: true, configured: true, staleMs: 90000, now: new Date().toISOString(), history: HISTORY, run: {
  label: '전체 회귀', rounds: 1, roundTotal: 3, done: 17, total: 42, fails: 2, checks: 900,
  items: [{ round: 2, name: 'regress-krjam-news', pass: 111, total: 111, ok: true },
          { round: 2, name: 'regress-krjam-press', pass: 30, total: 31, ok: false }],
  failures: [{ round: 2, file: 'regress-krjam-press', check: '표가 가로로 넘치지 않음', detail: '48px 넘침' },
             { round: 2, file: 'regress-krjam-news', check: '콘솔 에러 0', detail: 'TypeError: x is not a function' }],
  running: 'test/regress-krjam-jebo.js', startedAt: new Date(Date.now() - 300000).toISOString(),
  updatedAt: new Date().toISOString(), finishedAt: '', ok: false } };
const CONTENT = { ok: true, counts: [{ key: 'news', label: '기사', n: 12 }, { key: 'press', label: '보도자료', n: 3 },
  { key: 'tips', label: '소식 제보', n: 5 }, { key: 'members', label: '회원', n: 9 }, { key: 'assets', label: '자료실', n: 21 }],
  latest: [{ title: '개영식 현장', stage: 'published', at: '2026-08-05T22:00:00Z' }] };
const STATS = {
  ok: true,
  days: ['2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27'],
  routes: [
    { route: '/krjam-planning', counts: [10, 20, 30, 40], total: 100 },
    { route: '/krjam-jebo', counts: [1, 2, 3, 4], total: 10 },
    { route: '/', counts: [0, 0, 1, 1], total: 2 },
  ],
  totals: [11, 22, 34, 45],
  status: { version: '0.9.257', commit: 'abc1234', commitSubject: 'test', deployedAt: '2026-07-27T00:00:00Z',
    verification: { at: '2026-07-27T00:00:00Z', green: false, checksPerRound: 587,
      rounds: [{ round: 1, checks: 587, fails: 0, failures: [] },
               { round: 2, checks: 587, fails: 1, failures: [{ round: 2, file: 'regress-krjam-news', check: '표가 가로로 넘치지 않음', detail: '48px 넘침' }] },
               { round: 3, checks: 587, fails: 0, failures: [] }] } },
};
let logins = 0;
let RUN_MODE = 'running';   // running | none | done — 화면이 상태를 구분해 말하는지 본다
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/login') {
    let body = ''; req.on('data', (c) => { body += c; });
    req.on('end', () => {
      logins++;
      let code = ''; try { code = JSON.parse(body).code; } catch {}
      res.writeHead(code === GOOD ? 200 : 401, { 'content-type': 'application/json' });
      res.end(JSON.stringify(code === GOOD ? { ok: true, token: 'T', exp: Date.now() + 9e6 } : { ok: false, error: 'invalid_code' }));
    });
    return;
  }
  const authed = /Bearer T/.test(req.headers.authorization || '');
  if (p === '/api/me') { res.writeHead(authed ? 200 : 401, { 'content-type': 'application/json' }); return res.end('{"ok":' + authed + '}'); }
  if (p === '/api/run-status') {
    res.writeHead(authed ? 200 : 401, { 'content-type': 'application/json' });
    if (!authed) return res.end(JSON.stringify({ ok: false }));
    if (RUN_MODE === 'none') return res.end(JSON.stringify({ ok: true, configured: true, staleMs: 90000, run: null }));
    if (RUN_MODE === 'done') {
      const done = JSON.parse(JSON.stringify(RUN));
      done.run.finishedAt = new Date().toISOString(); done.run.ok = true; done.run.fails = 0;
      done.run.failures = []; done.run.rounds = 3; done.run.done = 42; done.run.running = '';
      return res.end(JSON.stringify(done));
    }
    return res.end(JSON.stringify(RUN));
  }
  if (p === '/api/admin-content') {
    res.writeHead(authed ? 200 : 401, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(authed ? CONTENT : { ok: false }));
  }
  if (p === '/api/hit') { res.writeHead(204); return res.end(); }
  if (p === '/api/admin-stats') {
    res.writeHead(authed ? 200 : 401, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(authed ? STATS : { ok: false, error: 'unauthorized' }));
  }
  if (p === '/api/jp-noti') { res.writeHead(authed ? 200 : 401, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (p === '/admin') p = '/admin.html';
  if (p === '/VERSION') { res.writeHead(200); return res.end('0.9.257'); }
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
  const errors = [];
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  /* 이 화면은 일부러 401(틀린 코드·인증 전 통계)을 받고, 라우팅 점검은 없는 주소도 두드린다.
     그건 정상 동작이므로 '리소스 로드 실패' 로그는 세지 않는다 — JS 오류만 잡는다. */
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(500);

  console.log('\n[잠금]');
  chk('인증 전에는 대시보드가 안 보인다', await p.evaluate(() =>
    !document.getElementById('gate').hidden && document.getElementById('shell').hidden));
  chk('인증 전에는 데이터가 하나도 없다', await p.evaluate(() =>
    !document.querySelector('#views').innerHTML.trim() && !document.querySelector('.sumcard') && !document.querySelector('.rnd')));
  chk('짧은 코드는 서버로 보내지 않는다', await p.evaluate(async () => {
    document.getElementById('code').value = '123';
    document.getElementById('gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 250));
    return /6자리/.test(document.getElementById('gate-msg').textContent);
  }));
  chk('틀린 코드는 토큰을 저장하지 않는다', await p.evaluate(async () => {
    document.getElementById('code').value = '000000';
    document.getElementById('gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 500));
    return /맞지 않습니다/.test(document.getElementById('gate-msg').textContent)
      && !sessionStorage.getItem('scoutingapp:admin') && document.getElementById('shell').hidden;
  }));

  console.log('\n[인증 후]');
  chk('맞는 코드로 들어간다', await p.evaluate(async (code) => {
    document.getElementById('code').value = code;
    document.getElementById('gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 700));
    return document.getElementById('gate').hidden && !document.getElementById('shell').hidden;
  }, GOOD));
  chk('토큰은 sessionStorage 에만 둔다(localStorage 아님)', await p.evaluate(() =>
    !!sessionStorage.getItem('scoutingapp:admin') && !localStorage.getItem('scoutingapp:admin')));
  await wait(700);
  chk('개요 맨 위가 회귀 진행', await p.evaluate(() => {
    var secs = [...document.querySelectorAll('#views .sec-h')].map((e) => e.textContent.trim());
    return secs[0] === '회귀 진행' && !!document.querySelector('.rnd');
  }));
  chk('라운드 3칸 · 현재 라운드 표시', await p.evaluate(() => {
    var r = document.querySelectorAll('.rnd');
    return r.length === 3 && r[0].classList.contains('done') && r[1].classList.contains('cur');
  }));
  chk('진행률·검사 수·지금 도는 검사', await p.evaluate(() => {
    var t = document.querySelector('.runhead').textContent + document.querySelector('.runnow').textContent;
    return /40%/.test(t) && /17 \/ 42/.test(t) && /regress-krjam-jebo\.js/.test(t);
  }));
  chk('실패 사유가 비개발자 말로 항상 보인다', await p.evaluate(() => {
    var cards = [...document.querySelectorAll('#views .sec:first-child .failcard')];
    if (cards.length !== 2) return false;
    var plain = cards.map((c) => c.querySelector('.fc-plain').textContent).join(' | ');
    var where = cards.map((c) => c.querySelector('.fc-h b').textContent).join(' | ');
    return /좌우로 밀려/.test(plain) && /오류가 나서/.test(plain) && /홍보부 운영보드/.test(where);
  }));
  chk('개발자용 상세는 접혀 있다(펼치면 원문)', await p.evaluate(() => {
    var d = document.querySelector('#views .sec:first-child .failcard .fc-dev');
    if (!d || d.open) return false;
    var t = d.textContent;
    return /regress-krjam-press/.test(t) && /48px 넘침/.test(t);
  }));
  chk('접힌 상세를 펼칠 수 있다', await p.evaluate(async () => {
    var d = document.querySelector('#views .sec:first-child .failcard .fc-dev');
    d.open = true; await new Promise((r) => setTimeout(r, 100));
    return d.open && d.querySelector('dl');
  }));
  chk('요약 카드 4장', await p.evaluate(() => document.querySelectorAll('#views .sumcard').length) === 4);
  chk('좌측 메뉴 7개 · 묶음 구분', await p.evaluate(() =>
    document.querySelectorAll('#sidenav .navitem').length === 7 && document.querySelectorAll('#sidenav .sidegrp').length >= 2));
  chk('유입 화면으로 이동하면 표가 그려진다', await p.evaluate(async () => {
    window.__admin.setView('traffic'); await new Promise((r) => setTimeout(r, 300));
    var rows = document.querySelectorAll('#views table tbody tr');
    return rows.length >= 3 && /krjam-planning/.test(document.querySelector('#views').textContent);
  }));
  chk('콘텐츠 현황 집계', await p.evaluate(async () => {
    window.__admin.setView('content'); await new Promise((r) => setTimeout(r, 300));
    var t = document.querySelector('#views').textContent;
    return /기사/.test(t) && /12/.test(t) && /자료실/.test(t);
  }));
  chk('라우팅 점검이 응답을 채운다', await p.evaluate(async () => {
    window.__admin.setView('routes'); await new Promise((r) => setTimeout(r, 1500));
    var rows = [...document.querySelectorAll('#routetbl tbody tr')];
    return rows.length >= 10 && rows.every((r) => !/확인 중/.test(r.querySelector('.st').textContent));
  }));
  chk('배포 상태에도 실패 사유가 나온다', await p.evaluate(async () => {
    window.__admin.setView('deploy'); await new Promise((r) => setTimeout(r, 300));
    var cards = [...document.querySelectorAll('#views .failcard')];
    if (!cards.length) return false;
    var t = cards[0].textContent;
    return /통과하지 못한 검사/.test(document.querySelector('#views').textContent)
      && /좌우로 밀려/.test(cards[0].querySelector('.fc-plain').textContent)
      && !cards[0].querySelector('.fc-dev').open && /48px 넘침/.test(t);
  }));
  chk('배포·검증 기록', await p.evaluate(async () => {
    window.__admin.setView('deploy'); await new Promise((r) => setTimeout(r, 300));
    var t = document.querySelector('#views').textContent;
    return /0\.9\.257/.test(t) && /abc1234/.test(t) && /실패 있음/.test(t);
  }));
  chk('잼버리 로고를 쓰지 않는다(스카우팅앱 공용)', await p.evaluate(() =>
    !document.querySelector('img[src*="jamboree"]') && !!document.querySelector('.mark')));
  await p.evaluate(() => window.__admin.setView('home')); await wait(400);
  chk('진행 중이면 실시간 표시가 살아 있다', await p.evaluate(() =>
    !!document.querySelector('.livedot.on') && /실시간/.test(document.getElementById('livechip').textContent)));
  chk('경과 시간이 1초마다 스스로 바뀐다', await p.evaluate(async () => {
    var el = document.querySelector('[data-since]'); if (!el) return false;
    el.textContent = 'XX';
    await new Promise((r) => setTimeout(r, 1400));
    return el.textContent !== 'XX';
  }));
  await p.evaluate(() => window.__admin.setView('home'));

  console.log('\n[최근 검증 기록]');
  await p.evaluate(() => window.__admin.setView('run')); await wait(500);
  chk('기록은 최대 20건', await p.evaluate(() => document.querySelectorAll('.histrow').length) === 20);
  chk('무엇을 검증했는지 사람 말로 남는다', await p.evaluate(() => {
    var pills = [...document.querySelectorAll('.histrow .pill')].map((e) => e.textContent);
    return pills.length >= 3 && pills.some((t) => /홍보부 운영보드/.test(t)) && pills.some((t) => /첫 화면/.test(t));
  }));
  chk('문제 없던 실행은 "문제 없음"', await p.evaluate(() =>
    /문제 없음/.test(document.querySelectorAll('.histrow')[1].textContent)));
  chk('문제 있던 실행은 사유가 쉬운 말로 · 상세는 접힘', await p.evaluate(() => {
    var row = document.querySelectorAll('.histrow')[0];
    var card = row.querySelector('.failcard');
    return /문제 1건/.test(row.textContent) && !!card
      && /오류가 나서/.test(card.querySelector('.fc-plain').textContent)
      && !card.querySelector('.fc-dev').open;
  }));
  chk('개요에도 최근 기록이 요약된다', await p.evaluate(async () => {
    window.__admin.setView('home'); await new Promise((r) => setTimeout(r, 300));
    return document.querySelectorAll('.histrow').length === 5 && !!document.querySelector('[data-go="run"]');
  }));

  console.log('\n[진행 중인 회귀가 없을 때]');
  RUN_MODE = 'none';
  chk('없으면 "진행 중인 회귀 없음"이라고 말한다', await (async () => {
    const pn = await b.newPage(); await pn.setViewport({ width: 1440, height: 1000 });
    await pn.evaluateOnNewDocument(() => sessionStorage.setItem('scoutingapp:admin', 'T'));
    await pn.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(900);
    const t = await pn.evaluate(() => document.querySelector('#views').textContent);
    const noBars = await pn.evaluate(() => document.querySelectorAll('.rnd').length === 0);
    await pn.close();
    return /진행 중인 회귀 없음/.test(t) && noBars;
  })());
  RUN_MODE = 'done';
  chk('끝난 실행은 "진행 중 아님"으로 구분한다', await (async () => {
    const pd = await b.newPage(); await pd.setViewport({ width: 1440, height: 1000 });
    await pd.evaluateOnNewDocument(() => sessionStorage.setItem('scoutingapp:admin', 'T'));
    await pd.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(900);
    const t = await pd.evaluate(() => document.querySelector('#views').textContent);
    await pd.close();
    return /진행 중 아님/.test(t) && /마지막 실행 통과/.test(t);
  })());
  RUN_MODE = 'running';

  console.log('\n[다시 잠금]');
  chk('잠그기를 누르면 토큰이 사라지고 잠금 화면', await p.evaluate(async () => {
    document.getElementById('logout').click();
    await new Promise((r) => setTimeout(r, 300));
    return !sessionStorage.getItem('scoutingapp:admin')
      && !document.getElementById('gate').hidden && document.getElementById('shell').hidden;
  }));
  chk('만료된 토큰이면 다시 잠근다', await (async () => {
    const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 1000 });
    await p2.evaluateOnNewDocument(() => sessionStorage.setItem('scoutingapp:admin', 'STALE'));
    await p2.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(600);
    const locked = await p2.evaluate(() => !document.getElementById('gate').hidden && !sessionStorage.getItem('scoutingapp:admin'));
    await p2.close(); return locked;
  })());

  console.log('\n[디자인 규칙]');
  const pa = await b.newPage(); await pa.setViewport({ width: 1440, height: 1000 });
  await pa.evaluateOnNewDocument(() => sessionStorage.setItem('scoutingapp:admin', 'T'));
  await pa.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(1200);
  const bad = await pa.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
      const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .1; };
    const small = [], tap = [];
    document.querySelectorAll('*').forEach((el) => {
      if (!vis(el)) return;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
      if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
      const ctl = el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'INPUT'
        || (el.tagName === 'A' && cs.display !== 'inline');
      if (ctl && r.height < 39.5) tap.push(r.height.toFixed(1) + 'px ' + (el.className || el.tagName));
    });
    return { small: [...new Set(small)], tap: [...new Set(tap)],
      over: document.documentElement.scrollWidth - window.innerWidth,
      nest: [...document.querySelectorAll('.card')].filter((c) => c.querySelector('.card')).length };
  });
  chk('글자 13px 이상', bad.small.length === 0, bad.small.slice(0, 4).join(' | '));
  chk('조작 요소 40px 이상', bad.tap.length === 0, bad.tap.slice(0, 4).join(' | '));
  chk('가로 넘침 없음', bad.over <= 0, bad.over + 'px');
  chk('카드 중첩 없음', bad.nest === 0, bad.nest + '건');
  const mo = await b.newPage(); await mo.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await mo.evaluateOnNewDocument(() => sessionStorage.setItem('scoutingapp:admin', 'T'));
  await mo.goto(base + '/admin', { waitUntil: 'networkidle2' }); await wait(1000);
  chk('모바일 가로 넘침 없음', await mo.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0);
  await mo.close(); await pa.close();

  console.log('\n[서버 · 집계]');
  const hit = await import('../functions/api/hit.js');
  chk('라우트 화이트리스트만 센다', hit.cleanRoute('/krjam-jebo/') === '/krjam-jebo'
    && hit.cleanRoute('/krjam-planning.html') === '/krjam-planning' && hit.cleanRoute('/nope') === null);
  // v0.9.295 — 종료한 서비스 주소는 더 이상 세지 않는다(화이트리스트에서 뺐다).
  chk('종료한 서비스 주소는 집계에서 거부된다',
    hit.cleanRoute('/krjam-fnc') === null && hit.cleanRoute('/krjam-cardnews') === null
    && hit.cleanRoute('/krjam-dcount') === null);
  chk('집계 날짜는 한국 시간 기준', /^\d{4}-\d{2}-\d{2}$/.test(hit.dayKey(new Date())));
  const hsrc = fs.readFileSync(path.join(ROOT, 'functions/api/hit.js'), 'utf8');
  chk('IP·UA 를 저장하지 않는다', !/clientIp|user-agent|referer/i.test(hsrc));
  const asrc = fs.readFileSync(path.join(ROOT, 'functions/api/admin-stats.js'), 'utf8');
  chk('통계 API 는 관리자만 · 쓰기 없음', /isAdmin\(request, env\)/.test(asrc) && !/SCOUT_KV\.put|SCOUT_KV\.delete/.test(asrc));
  const wsrc = fs.readFileSync(path.join(ROOT, 'version-watch.js'), 'utf8');
  chk('비콘은 30분에 한 번만 · 실패해도 조용히', /1800000/.test(wsrc) && /catch\(function \(\) \{\}\)|catch\(function \(\) \{\}\);/.test(wsrc.replace(/\s/g, '')) === false || /\.catch\(function \(\) \{\}\)/.test(wsrc));

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
