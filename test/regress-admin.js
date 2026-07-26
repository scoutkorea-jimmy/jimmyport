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
const STATS = {
  ok: true,
  days: ['2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27'],
  routes: [
    { route: '/krjam-planning', counts: [10, 20, 30, 40], total: 100 },
    { route: '/krjam-fnc', counts: [1, 2, 3, 4], total: 10 },
    { route: '/', counts: [0, 0, 1, 1], total: 2 },
  ],
  totals: [11, 22, 34, 45],
  status: { version: '0.9.257', commit: 'abc1234', commitSubject: 'test', deployedAt: '2026-07-27T00:00:00Z',
    verification: { at: '2026-07-27T00:00:00Z', green: true, checksPerRound: 587,
      rounds: [{ round: 1, checks: 587, fails: 0 }, { round: 2, checks: 587, fails: 0 }, { round: 3, checks: 587, fails: 0 }] } },
};
let logins = 0;
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
  chk('유입·라우팅·배포 내용이 화면에 없다', await p.evaluate(() =>
    !document.querySelector('#hittbl tbody') && !document.querySelector('#routetbl tbody')
    && document.body.innerText.indexOf('유입 현황') < 0));
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
  chk('요약 카드 4장 · 오늘 수치', await p.evaluate(() => {
    const cs = document.querySelectorAll('#sumcards .sumcard');
    return cs.length === 4 && /45/.test(cs[0].textContent);
  }));
  chk('막대 그래프가 날짜 수만큼', await p.evaluate(() => document.querySelectorAll('#chart .bar').length) === 4);
  chk('유입 표가 많이 열린 순', await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#hittbl tbody tr')];
    return rows.length === 3 && /krjam-planning/.test(rows[0].textContent) && /100/.test(rows[0].textContent);
  }));
  chk('라우팅 점검 표가 응답을 채운다', await p.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 1200));
    const rows = [...document.querySelectorAll('#routetbl tbody tr')];
    const filled = rows.filter((r) => !/확인 중/.test(r.querySelector('.st').textContent));
    return rows.length >= 10 && filled.length === rows.length;
  }));
  chk('보호된 API 는 "보호됨"으로 읽는다', await p.evaluate(() => {
    const tr = document.querySelector('[data-u="/api/jp-noti"]');
    return !!tr && /정상|보호됨/.test(tr.textContent);
  }));
  chk('배포·검증 기록 표시', await p.evaluate(() => {
    const t = document.getElementById('deploybox').textContent;
    return /0\.9\.257/.test(t) && /abc1234/.test(t) && /3라운드 전부 통과/.test(t);
  }));
  chk('기간 전환(7·14·30일)', await p.evaluate(() => document.querySelectorAll('#rangeseg button').length) === 3);

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
  chk('라우트 화이트리스트만 센다', hit.cleanRoute('/krjam-fnc/') === '/krjam-fnc'
    && hit.cleanRoute('/krjam-planning.html') === '/krjam-planning' && hit.cleanRoute('/nope') === null);
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
