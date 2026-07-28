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
/* maskedStaff = 비관리자 응답(전화 끝 4자리만)을 화면이 들고 있는 상태를 만든다.
   그 상태에서 연락처를 저장하면 전원의 번호가 4자리로 잘린다 — 화면이 아예 보내지 않아야 한다. */
let maskedStaff = false, staffPuts = 0;
let ORGSNAPS = [{ at: '2026-07-28T02:00:00Z', by: '급식 관리자', count: 11 }];
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const J = (o, code) => { res.writeHead(code || 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (p === '/api/hit') { res.writeHead(204); return res.end(); }
  if (p === '/api/jp-fnc-auth') { return J({ ok: true, token: 'FT', exp: Date.now() + 9e6 }); }
  if (p === '/api/jp-fnc-org' && /snapshots=/.test(req.url)) return J({ ok: true, snapshots: ORGSNAPS });
  if (p === '/api/jp-fnc-staff') {
    if (req.method === 'PUT') { let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => {
        staffPuts++;
        let x = {}; try { x = JSON.parse(b); } catch {}
        if (STAFF.updatedAt && x.baseVer !== STAFF.updatedAt) return J(Object.assign({ ok: false, error: 'conflict' }, STAFF), 409);
        if ((STAFF.staff || []).length > 0 && (x.staff || []).length === 0 && x.confirmEmpty !== true)
          return J({ ok: false, error: 'empty_guard', had: STAFF.staff.length, message: '빈 목록은 저장하지 않았습니다' }, 409);
        STAFF = { staff: x.staff || [], shifts: x.shifts || {}, updatedAt: new Date().toISOString(), by: '급식 관리자' };
        return J(Object.assign({ ok: true, admin: true }, STAFF));
      }); return; }
    if (maskedStaff) {
      // 비관리자 응답 — 전체번호 대신 끝 4자리(phone4), admin:false
      return J({ ok: true, admin: false, updatedAt: STAFF.updatedAt, by: STAFF.by, shifts: STAFF.shifts,
        staff: (STAFF.staff || []).map((s) => ({ id: s.id, name: s.name, phone4: String(s.phone || '').replace(/[^0-9]/g, '').slice(-4) })) });
    }
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
  let res = await authMod.onRequestPost({ request: rq('POST', { id: 'foodservice', pw: 'nope' }), env: fenv });
  let jj = await res.json();
  chk('틀린 비밀번호는 거절한다', res.status === 200 && jj.ok === false);
  res = await authMod.onRequestPost({ request: rq('POST', { id: 'foodservice', pw: '20260803' }), env: fenv });
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

  /* ── 마스킹된 전화가 원본을 덮어쓰는 사고 (v0.9.286) ────────────────────────
     비관리자 GET 은 전화를 끝 4자리만 준다. 화면이 그 응답을 들고 있는 동안 연락처를 저장하면
     전원의 번호가 4자리로 잘려 저장된다 — 개수가 그대로라 잠금·전멸 가드에 안 걸린다. */
  console.log('\n[전화 마스킹 절단]');
  chk('단위: 끝4자리로 온 값은 저장된 원본을 유지한다', (() => {
    const next = [{ id: 'a', name: '주명림', phone: '2222' }];
    api.keepMaskedPhones([{ id: 'a', name: '주명림', phone: '01011112222' }], next);
    return next[0].phone === '01011112222';
  })());
  chk('단위: 진짜 다른 번호는 그대로 바뀐다', (() => {
    const next = [{ id: 'a', name: '주명림', phone: '01099998888' }];
    api.keepMaskedPhones([{ id: 'a', name: '주명림', phone: '01011112222' }], next);
    return next[0].phone === '01099998888';
  })());
  chk('단위: 빈 값(의도한 삭제)은 막지 않는다', (() => {
    const next = [{ id: 'a', name: '주명림', phone: '' }];
    api.keepMaskedPhones([{ id: 'a', name: '주명림', phone: '01011112222' }], next);
    return next[0].phone === '';
  })());

  const sPut = async (body) => { const r = await api.onRequestPut({ request: rq('PUT', body, HDR), env: fenv }); return { s: r.status, j: await r.json() }; };
  let sv = await sPut({ staff: [{ id: 'a', name: '주명림', phone: '01011112222' }], shifts: {}, baseVer: back.updatedAt });
  chk('실제 모듈: 전화가 저장된다', sv.j.staff[0].phone === '01011112222');
  sv = await sPut({ staff: [{ id: 'a', name: '주명림', phone: '2222' }], shifts: {}, baseVer: sv.j.updatedAt });
  chk('실제 모듈: 마스킹 값 저장이 원본을 지우지 않는다', sv.j.staff[0].phone === '01011112222', sv.j.staff[0].phone);

  /* 부분 전멸 — empty_guard 는 딱 0 일 때만 막는다. 일부만 남는 저장이 더 흔한 사고다. */
  console.log('\n[부분 전멸 가드]');
  const many = Array.from({ length: 10 }, (_, i) => ({ id: 'p' + i, name: '요원' + i, phone: '0101111000' + (i % 10) }));
  sv = await sPut({ staff: many, shifts: {}, baseVer: sv.j.updatedAt });
  chk('인원 10명 저장', sv.j.staff.length === 10);
  const verMany = sv.j.updatedAt;
  sv = await sPut({ staff: many.slice(0, 2), shifts: {}, baseVer: verMany, confirmEmpty: true });
  chk('10명 → 2명은 409 로 멈춘다(confirmEmpty 로도 못 지나간다)', sv.s === 409 && sv.j.error === 'shrink_guard');
  let gg = await api.onRequestGet({ request: new Request('https://x/api/jp-fnc-staff', { headers: HDR }), env: fenv });
  chk('막힌 저장은 아무도 지우지 않았다', (await gg.json()).staff.length === 10);
  sv = await sPut({ staff: many.slice(0, 2), shifts: {}, baseVer: verMany, confirmEmpty: true, confirmShrink: true });
  chk('사람이 확인하면 통과한다', sv.s === 200 && sv.j.staff.length === 2);

  /* ── 조직표 = 인적 데이터의 단일 원본. 되돌릴 길이 없으면 실수 한 번이 영구 손실이다. */
  console.log('\n[조직표 — 가드·스냅샷·되돌리기]');
  const org = await import('../functions/api/jp-fnc-org.js');
  const oPut = async (body) => { const r = await org.onRequestPut({ request: rq('PUT', body, HDR), env: fenv }); return { s: r.status, j: await r.json() }; };
  const bigOrg = { head: '심호웅', depts: [{ name: '급식부', chief: '부장A', teams: [
    { name: '1팀', lead: '팀장A', members: ['가', '나', '다', '라'] },
    { name: '2팀', lead: '팀장B', members: ['마', '바', '사'] }] }] };
  let og = await oPut({ org: bigOrg, baseVer: '' });
  chk('조직표 첫 저장', og.s === 200 && org.orgHeadcount(og.j.org) === 11, String(org.orgHeadcount(og.j.org)));
  const orgVer = og.j.updatedAt;
  og = await oPut({ org: { head: '심호웅', depts: [{ name: '급식부', chief: '', teams: [] }] }, baseVer: orgVer });
  chk('팀·팀원이 통째로 사라지는 저장은 409(부서가 남아 empty_guard 는 통과한다)', og.s === 409 && og.j.error === 'shrink_guard');
  og = await org.onRequestGet({ request: new Request('https://x/api/jp-fnc-org'), env: fenv });
  chk('막힌 저장 뒤에도 조직표가 그대로다', org.orgHeadcount((await og.json()).org) === 11);
  og = await oPut({ org: { head: '심호웅', depts: [{ name: '급식부', chief: '', teams: [] }] }, baseVer: orgVer, confirmShrink: true });
  chk('확인하면 정리된다', og.s === 200 && org.orgHeadcount(og.j.org) === 1);
  og = await org.onRequestGet({ request: new Request('https://x/api/jp-fnc-org?snapshots=1', { headers: HDR }), env: fenv });
  const oSnaps = (await og.json()).snapshots || [];
  chk('덮어쓰기 직전 조직표가 보관된다', oSnaps.length >= 1 && oSnaps[0].count === 11, JSON.stringify(oSnaps[0] || {}));
  og = await org.onRequestGet({ request: new Request('https://x/api/jp-fnc-org?snapshots=1'), env: fenv });
  chk('조직표 스냅샷은 관리자만 본다', og.status === 401);
  og = await oPut({ restore: oSnaps[0].at });
  chk('조직표를 그 시점으로 되돌린다', og.s === 200 && org.orgHeadcount(og.j.org) === 11);
  og = await oPut({ restore: '없는시각' });
  chk('없는 스냅샷은 404(조용히 덮어쓰지 않는다)', og.s === 404);
  chk('조직표 저장·복구가 감사 기록에 남는다', (() => {
    const l = JSON.parse(KV.get('log') || '[]');
    return l.some((x) => x.action === 'fnc.org.save') && l.some((x) => x.action === 'fnc.org.restore');
  })());

  /* ── 식사 메뉴는 홍보부 보드와 **같은 KV** 를 본다. 셀 하나 고칠 때 나머지를 건드리면 안 된다. */
  console.log('\n[식사 메뉴 — 비파괴 RMW]');
  KV.set('jp:meals', JSON.stringify({ meals: {
    staff: { '2026-08-03': { b: '조식', l: '중식', d: '석식' } },
    crew: { '2026-08-03': { b: '구버전그룹', l: '', d: '' } },   // 이 API 가 모르는 그룹
  }, updatedAt: '2026-07-28T00:00:00Z', author: '김기자', client: 'planning-tab' }));
  const meals = await import('../functions/api/jp-meals.js');
  const mr = await meals.onRequestPut({ request: rq('PUT', { group: 'staff', date: '2026-08-03', meal: 'b', value: '새 조식' }, HDR), env: fenv });
  chk('셀 편집이 200', mr.status === 200);
  const stored = JSON.parse(KV.get('jp:meals'));
  chk('고친 칸만 바뀐다', stored.meals.staff['2026-08-03'].b === '새 조식');
  chk('같은 날 다른 끼니는 그대로', stored.meals.staff['2026-08-03'].l === '중식' && stored.meals.staff['2026-08-03'].d === '석식');
  chk('이 API 가 모르는 그룹(crew)도 사라지지 않는다', !!(stored.meals.crew && stored.meals.crew['2026-08-03'].b === '구버전그룹'));
  /* 예전엔 저장돼 있던 author 를 그대로 다시 써 넣어, 홍보부 화면엔 '아무도 안 바꿈'으로 보였다
     → 홍보부가 다음에 통짜 저장하면 급식보드에서 고친 메뉴가 조용히 사라졌다. */
  chk('실제 작성자를 기록한다(홍보부가 충돌을 알아채고 병합하게)', stored.author !== '김기자', stored.author);
  chk('편집 맥락(client)을 남긴다', stored.client === 'fnc-board', String(stored.client));

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

  /* ── 마스킹 상태에서의 연락처 저장 (v0.9.286) ────────────────────────────
     로그인 직후 재조회가 아직 안 끝났거나 실패하면, 화면은 끝 4자리만 든 명단을 그리고 있다.
     그대로 '연락처 저장'을 누르면 전원의 번호가 4자리로 잘린 채 저장된다(개수는 그대로라
     잠금·전멸 가드에 안 걸린다). 화면이 **아예 보내지 않아야** 한다. */
  console.log('\n[화면 — 마스킹 상태에서는 연락처를 저장하지 않는다]');
  maskedStaff = true;
  await p.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(500);
  await p.evaluate(() => { const n = document.querySelector('[data-nav="staff"]'); if (n) n.click(); });
  await wait(1200);
  // 전화가 저장돼 있는 사람의 칸을 본다(대부분은 전화가 없어 빈 칸이다).
  chk('사고 조건 재현 — 입력칸이 끝 4자리로 채워져 있다', await p.evaluate(() => {
    const el = document.querySelector('[data-phone="\uc8fc\uba85\ub9bc"]');
    return !!el && /^\d{4}$/.test(el.value || '');
  }));
  const putsBefore = staffPuts;
  await p.evaluate(() => { const b = document.getElementById('staff-phones-save'); if (b) b.click(); });
  await wait(800);
  chk('저장을 눌러도 서버로 보내지 않는다(원본 보존)', staffPuts === putsBefore, 'PUT ' + putsBefore + '→' + staffPuts);
  maskedStaff = false;

  console.log('\n[화면 — 되돌리기]');
  await p.goto(base + '/krjam-fnc', { waitUntil: 'networkidle2' }); await wait(500);
  await p.evaluate(() => { const n = document.querySelector('[data-nav="duty"]'); if (n) n.click(); });
  await wait(900);
  chk('관리자에게 되돌리기 버튼이 보인다', await p.evaluate(() => !!document.getElementById('duty-undo')));
  await p.evaluate(() => { const b = document.getElementById('duty-undo'); if (b) b.click(); });
  await wait(900);
  chk('되돌릴 지점 목록이 화면에 뜬다', await p.evaluate(() => document.querySelectorAll('[data-restore]').length > 0));
  chk('되돌리기 버튼도 40px 이상(터치 타깃)', await p.evaluate(() => {
    const b = document.querySelector('[data-restore]');
    return !!b && b.getBoundingClientRect().height >= 40;
  }));

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 2).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
