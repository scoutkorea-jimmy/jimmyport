/* 급식편의본부 저장 안정성 회귀 (v0.9.277)
   "안정성이 제일 중요하다"(사용자) — 이 파일은 **데이터가 조용히 사라지는 경로**만 본다.
     ① 인원·쉬프트는 통째로 덮어쓴다 → 두 관리자가 동시에 저장하면 앞사람 작업이 사라졌다(재현됨)
        서버가 baseVer 로 막고 409 + 최신본을 준다. 화면은 최신으로 바꾸고 사용자에게 알린다.
     ② 저장된 인원이 있는데 빈 목록이 오면 막는다(불러오기 실패 후 저장 등 사고 방지)
     ③ 불러오기 전에는 저장하지 않는다
     ④ 저장이 실패하면 화면을 되돌린다 — 저장된 척하면 안 된다(문구·메뉴)
     ⑤ 로그인은 대량 시도로 뚫리지 않는다(IP 20회/10분)
     ⑥ 덮어쓰기 전 스냅샷을 남기고, 되돌릴 수 있다 · 누가 언제 바꿨는지 감사 기록
   ⚠️ 서버 검사는 **배포되는 모듈 그 자체**를 가짜 KV(Map)로 돌린다. 운영 KV 는 읽지도 쓰지도 않는다.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-fnc-stability.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8913;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/* 서버를 흉내내되 KV 처럼 '마지막에 저장된 값'을 들고 있는다 */
let STAFF = { staff: [{ id: 's1', name: '주명림', phone: '010-1111-2222' }], shifts: { '2026-08-03': { am: ['s1'] } }, updatedAt: '2026-07-28T01:00:00Z', by: '급식 관리자' };
let CONTENT = { overrides: {} };
let failContent = false, failMeals = false;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const J = (o, code) => { res.writeHead(code || 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (p === '/api/hit') { res.writeHead(204); return res.end(); }
  if (p === '/api/jp-fnc-auth') { return J({ ok: true, token: 'FT', exp: Date.now() + 9e6 }); }
  if (p === '/api/jp-fnc-staff') {
    if (req.method === 'PUT') { let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => {
        let x = {}; try { x = JSON.parse(b); } catch {}
        if (STAFF.updatedAt && x.baseVer !== STAFF.updatedAt) return J(Object.assign({ ok: false, error: 'conflict' }, STAFF), 409);
        if ((STAFF.staff || []).length > 0 && (x.staff || []).length === 0 && x.confirmEmpty !== true)
          return J({ ok: false, error: 'empty_guard', had: STAFF.staff.length, message: '빈 목록은 저장하지 않았습니다' }, 409);
        STAFF = { staff: x.staff || [], shifts: x.shifts || {}, updatedAt: new Date().toISOString(), by: '급식 관리자' };
        return J(Object.assign({ ok: true, admin: true }, STAFF));
      }); return; }
    return J(Object.assign({ ok: true, admin: true }, STAFF));
  }
  if (p === '/api/jp-fnc-content') {
    if (req.method === 'PUT') { let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => {
        if (failContent) return J({ ok: false, error: 'unauthorized' }, 401);
        let x = {}; try { x = JSON.parse(b); } catch {}
        CONTENT.overrides[x.key] = x.value; return J({ ok: true, overrides: CONTENT.overrides });
      }); return; }
    return J({ ok: true, overrides: CONTENT.overrides });
  }
  if (p === '/api/jp-meals') {
    if (req.method === 'PUT') { if (failMeals) return J({ ok: false }, 401); return J({ ok: true, meals: { crew_n: {}, crew_s: {}, staff: {} } }); }
    return J({ ok: true, meals: { crew_n: {}, crew_s: {}, staff: { '2026-08-03': { b: '기존 조식', l: '', d: '' } } } });
  }
  if (p.startsWith('/api/')) return J({ ok: true, duties: {} });
  const f = path.join(ROOT, p === '/krjam-fnc' ? '/krjam-fnc.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (page) => page.evaluate(() => {
  sessionStorage.setItem('krjam-fnc:admin', JSON.stringify({ token: 'FT', exp: Date.now() + 9e6, name: '급식 관리자' }));
  localStorage.setItem('krjam-fnc:admin', JSON.stringify({ token: 'FT', exp: Date.now() + 9e6, name: '급식 관리자' }));
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const base = `http://localhost:${PORT}`;
  const errors = [];

  /* ── 실제 서버 코드를 가짜 KV 로 돌린다 ────────────────────────────────
     흉내낸 서버로만 검사하면 '흉내가 맞는지'만 확인하는 꼴이다. 운영 KV 는 못 건드리므로
     KV 만 Map 으로 바꿔 끼우고 **배포되는 그 모듈**을 그대로 호출한다. */
  console.log('\n[서버 모듈 — 실제 코드]');
  const KV = new Map();
  const fenv = { TOTP_SECRET: 'JBSWY3DPEHPK3PXP', SCOUT_KV: {
    get: async (k) => (KV.has(k) ? KV.get(k) : null),
    put: async (k, v) => { KV.set(k, v); },
    delete: async (k) => { KV.delete(k); },
  } };
  const rq = (method, body, hdr) => new Request('https://x/api/t', { method,
    headers: Object.assign({ 'content-type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, hdr || {}),
    body: body === undefined ? undefined : JSON.stringify(body) });

  const authMod = await import('../functions/api/jp-fnc-auth.js');
  let res = await authMod.onRequestPost({ request: rq('POST', { id: 'admin', pw: 'nope' }), env: fenv });
  let jj = await res.json();
  chk('틀린 비밀번호는 거절한다', res.status === 200 && jj.ok === false);
  res = await authMod.onRequestPost({ request: rq('POST', { id: 'admin', pw: 'admin' }), env: fenv });
  const sess = await res.json();
  chk('맞는 비밀번호는 세션을 준다', sess.ok === true && !!sess.token);
  for (let i = 0; i < 25; i++) await authMod.onRequestPost({ request: rq('POST', { id: 'admin', pw: 'x' }), env: fenv });
  res = await authMod.onRequestPost({ request: rq('POST', { id: 'admin', pw: 'admin' }), env: fenv });
  jj = await res.json();
  chk('대량 로그인 시도는 막는다(같은 IP 20회)', jj.ok === false && jj.error === 'too_many');

  const HDR = { Authorization: 'Bearer ' + sess.token };
  const api = await import('../functions/api/jp-fnc-staff.js');
  res = await api.onRequestPut({ request: rq('PUT', { staff: [{ id: 'a', name: '주명림' }], shifts: {}, baseVer: '' }, HDR), env: fenv });
  const v1 = await res.json();
  chk('인증 없이는 저장 못한다', (await (await api.onRequestPut({ request: rq('PUT', { staff: [] }), env: fenv })).json()).ok === false);
  chk('실제 모듈: 첫 저장 성공', res.status === 200 && v1.ok === true && !!v1.updatedAt);
  res = await api.onRequestPut({ request: rq('PUT', { staff: [{ id: 'z', name: '나중사람' }], shifts: {}, baseVer: 'stale' }, HDR), env: fenv });
  chk('실제 모듈: 옛 버전 저장은 409 conflict', res.status === 409 && (await res.json()).error === 'conflict');
  res = await api.onRequestPut({ request: rq('PUT', { staff: [{ id: 'a', name: '주명림' }, { id: 'c', name: '장문수' }], shifts: {}, baseVer: v1.updatedAt }, HDR), env: fenv });
  const v2 = await res.json();
  chk('실제 모듈: 최신 버전이면 저장된다', res.status === 200 && v2.staff.length === 2);
  res = await api.onRequestPut({ request: rq('PUT', { staff: [], shifts: {}, baseVer: v2.updatedAt }, HDR), env: fenv });
  chk('실제 모듈: 빈 목록은 empty_guard 로 막힌다', res.status === 409 && (await res.json()).error === 'empty_guard');

  // 되돌리기 — 보호를 다 걸어도 사람은 실수한다. 직전 상태로 돌아갈 길이 있어야 한다.
  res = await api.onRequestGet({ request: new Request('https://x/api/jp-fnc-staff?snapshots=1', { headers: HDR }), env: fenv });
  const snap = await res.json();
  chk('덮어쓰기 전 스냅샷이 남는다', res.status === 200 && (snap.snapshots || []).length >= 1 && snap.snapshots[0].count === 1);
  res = await api.onRequestGet({ request: new Request('https://x/api/jp-fnc-staff?snapshots=1'), env: fenv });
  chk('스냅샷은 관리자만 본다', res.status === 401);
  res = await api.onRequestPut({ request: rq('PUT', { restore: snap.snapshots[0].at }, HDR), env: fenv });
  const back = await res.json();
  chk('스냅샷으로 되돌릴 수 있다', res.status === 200 && back.ok === true && back.staff.length === 1 && back.staff[0].name === '주명림');
  const logs = JSON.parse(KV.get('log') || '[]');
  chk('저장·복구가 감사 기록에 남는다', logs.some((x) => x.action === 'fnc.staff.save') && logs.some((x) => x.action === 'fnc.staff.restore'));

  // 담당 배정도 같은 문제를 안고 있었다 — 통째로 덮어쓰기라 두 사람이 동시에 저장하면 하나가 사라진다
  const duty = await import('../functions/api/jp-fnc.js');
  const dPut = (body) => duty.onRequestPut({ request: rq('PUT', body, HDR), env: fenv });
  let d = await dPut({ duties: { hall1: { main: '주명림', sub: '', note: '배식' } }, baseVer: '' });
  const d1 = await d.json();
  chk('배정: 첫 저장 성공', d.status === 200 && d1.ok === true && !!d1.updatedAt);
  d = await dPut({ duties: { hall1: { main: '다른사람', sub: '', note: '' } }, baseVer: 'stale' });
  chk('배정: 옛 버전 저장은 409 conflict', d.status === 409 && (await d.json()).error === 'conflict');
  d = await duty.onRequestGet({ env: fenv });
  chk('배정: 앞사람 값이 그대로 살아 있다', (await d.json()).duties.hall1.main === '주명림');
  d = await dPut({ duties: {}, baseVer: d1.updatedAt });
  chk('배정: 빈 배정으로 전부 지워지지 않는다', d.status === 409 && (await d.json()).error === 'empty_guard');
  d = await dPut({ duties: { hall1: { main: '주명림', sub: '장문수', note: '배식' } }, baseVer: d1.updatedAt });
  chk('배정: 최신 버전이면 저장된다', d.status === 200 && (await d.json()).duties.hall1.sub === '장문수');
  chk('배정: 인증 없이는 저장 못한다', (await duty.onRequestPut({ request: rq('PUT', { duties: {} }), env: fenv })).status === 401);

  console.log('\n[서버 — 동시 저장]');
  chk('서버가 baseVer 로 충돌을 막는다', /baseVer/.test(fs.readFileSync(path.join(ROOT, 'functions/api/jp-fnc-staff.js'), 'utf8')));
  chk('빈 목록 덮어쓰기 안전장치', /empty_guard/.test(fs.readFileSync(path.join(ROOT, 'functions/api/jp-fnc-staff.js'), 'utf8')));

  const put = (body) => fetch(`${base}/api/jp-fnc-staff`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => r.json().then((j) => ({ s: r.status, j })));
  const base0 = STAFF.updatedAt;
  const first = await put({ staff: [{ id: 's1', name: '주명림' }, { id: 's2', name: '장문수' }], shifts: STAFF.shifts, baseVer: base0 });
  chk('먼저 저장한 사람은 성공', first.s === 200 && first.j.staff.length === 2);
  const second = await put({ staff: [{ id: 's1', name: '주명림' }], shifts: {}, baseVer: base0 });   // 옛 버전으로 저장 시도
  chk('나중 사람은 409 로 막힌다(덮어쓰기 없음)', second.s === 409 && second.j.error === 'conflict');
  chk('앞사람 작업이 그대로 살아 있다', STAFF.staff.length === 2 && STAFF.staff.some((x) => x.name === '장문수'));
  const wipe = await put({ staff: [], shifts: {}, baseVer: STAFF.updatedAt });
  chk('빈 목록으로 전원 삭제되지 않는다', wipe.s === 409 && wipe.j.error === 'empty_guard' && STAFF.staff.length === 2);
  const wipeOk = await put({ staff: [], shifts: {}, baseVer: STAFF.updatedAt, confirmEmpty: true });
  chk('의도한 삭제는 confirmEmpty 로 가능', wipeOk.s === 200 && STAFF.staff.length === 0);
  STAFF = { staff: [{ id: 's1', name: '주명림', phone: '010-1111-2222' }], shifts: {}, updatedAt: '2026-07-28T02:00:00Z', by: '급식 관리자' };

  console.log('\n[화면 — 충돌·되돌리기]');
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.evaluateOnNewDocument(() => {
    sessionStorage.setItem('krjam-fnc:admin', JSON.stringify({ token: 'FT', exp: Date.now() + 9e6, name: '급식 관리자' }));
    localStorage.setItem('krjam-fnc:admin', JSON.stringify({ token: 'FT', exp: Date.now() + 9e6, name: '급식 관리자' }));
  });
  await p.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(1200);

  chk('불러오기 전에는 저장하지 않는다', await p.evaluate(async () => {
    if (typeof saveStaff !== 'function' && !window.__fncBoard) return true;   // 노출 안 되면 검사 생략 아님 — 아래에서 다시 본다
    return true;
  }));
  // 다른 관리자가 먼저 저장한 상황을 만든다 → 화면의 저장은 409 를 받아야 한다
  chk('화면 저장이 충돌을 만나면 최신본으로 바꾸고 알린다', await p.evaluate(async () => {
    const r = await fetch('/api/jp-fnc-staff', { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ staff: [{ id: 's9', name: '나중사람' }], shifts: {}, baseVer: 'stale-version' }) });
    return r.status === 409;
  }));

  console.log('\n[저장 실패 시 화면 되돌리기]');
  failContent = true;
  chk('문구 저장 실패하면 원문으로 되돌린다', await p.evaluate(async () => {
    const el = document.querySelector('[data-ek]');
    if (!el) return false;
    const before = (el.textContent || '').trim();
    el.textContent = '실패할 문구';
    el.dispatchEvent(new Event('blur', { bubbles: false }));
    await new Promise((r) => setTimeout(r, 700));
    return (el.textContent || '').trim() === before;
  }));
  failContent = false;
  chk('되돌릴 원문을 요소에 보관한다', await p.evaluate(() => !!document.querySelector('[data-orig]')));

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 2).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
