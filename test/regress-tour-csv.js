/* /tour/admin CSV 가져오기 + 지도 데이터 보호 회귀 (v0.9.277)
   엑셀에서 만든 표를 그대로 올릴 수 있어야 한다. 여기서 지키는 것:
     · 필수 열(name·lat·lng)이 없으면 **올리지 않고 이유를 말한다**
     · 잘못된 줄은 건너뛰되 **몇 줄을 왜 건너뛰었는지 알린다**(조용히 버리면 "올렸는데 없다"가 된다)
     · 합치기는 같은 이름을 갱신(주소·좌표), 전체 교체는 말 그대로 교체
     · 따옴표 안의 쉼표·줄바꿈·이중 따옴표를 처리한다(엑셀이 그렇게 내보낸다)
     · 한글 머리글(이름·위도·경도…)도 받는다
     · 내보내기는 UTF-8 BOM 을 붙인다(없으면 엑셀에서 한글이 깨진다)
   실행: NODE_PATH=<scratch>/node_modules node test/regress-tour-csv.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8909;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
let saved = null;
let failUnitsGet = false;   // 불러오기가 실패한 상황을 만들기 위한 스위치
const UNITS = [{ id: 'u1', kind: 'unit', name: '서울 1대', subtitle: '', country: 'Korea', nso: 'KSAK', region: 'APR',
  lang: 'ko', lat: 37.5, lng: 127.0, address: '서울', sections: [], tags: [], events: [], desc: '', instagram: '',
  homepage: '', phone: '', email: '', status: 'published' }];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/hit') { res.writeHead(204); return res.end(); }
  if (p === '/api/units') {
    if (req.method === 'PUT') { let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { saved = JSON.parse(b).units; } catch {} res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); }); return; }
    if (failUnitsGet) { res.writeHead(500); return res.end('down'); }
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ units: UNITS, updatedAt: null }));
  }
  if (p === '/api/me') { res.writeHead(/Bearer T/.test(req.headers.authorization || '') ? 200 : 401, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true,"items":[],"comments":[]}'); }
  if (p === '/tour/admin') p = '/tour/admin.html';
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
  // 관리자 화면은 TOTP 로 잠겨 있고, 로그인해야 이벤트가 붙는다 — 저장된 세션이 있는 상태로 연다
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('scoutfinder:admin-session', JSON.stringify({ token: 'T', exp: Date.now() + 9e6 }));
  });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  /* 전체 교체는 되돌릴 수 없는 삭제다 — 확인창이 떠야 한다. 그 확인창을 여기서 조종한다. */
  let acceptDialog = true, lastDialog = '';
  p.on('dialog', async (d) => { lastDialog = d.message(); if (acceptDialog) await d.accept(); else await d.dismiss(); });
  await p.goto(base + '/tour/admin', { waitUntil: 'networkidle2' }); await wait(2000);

  const feed = (csv) => p.evaluate((text) => {
    const el = document.getElementById('csv-file');
    const dt = new DataTransfer();
    dt.items.add(new File([text], 'x.csv', { type: 'text/csv' }));
    el.files = dt.files;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, csv);
  const report = () => p.evaluate(() => document.getElementById('csv-report').textContent);
  const names = () => p.evaluate(() => (window.__units || []).map((u) => u.name));

  console.log('\n[화면]');
  chk('CSV 올리기 · 양식 받기 · 내보내기 버튼', await p.evaluate(() =>
    !!document.getElementById('csv-file') && !!document.getElementById('csv-template') && !!document.getElementById('csv-export')));
  chk('합치기 / 전체 교체 선택', await p.evaluate(() => document.querySelectorAll('input[name="csv-mode"]').length) === 2);

  console.log('\n[가져오기]');
  await p.evaluate(() => document.getElementById('import-btn').click()); await wait(200);
  await feed('name,lat,lng\n"부산 2대",35.1,129.0\n'); await wait(400);
  chk('한 줄 가져오면 목록에 들어간다', /1곳을 반영/.test(await report()), await report());

  await feed('nope,lat\nx,1\n'); await wait(300);
  chk('필수 열이 없으면 이유를 말하고 넣지 않는다', /필수 열이 없습니다/.test(await report()), await report());

  await feed('name,lat,lng\n"좌표없음",없음,없음\n,35.9,128.9\n"정상",35.2,129.1\n'); await wait(400);
  const rep = await report();
  chk('잘못된 줄은 건너뛰고 몇 줄인지 알린다', /1곳을 반영/.test(rep) && /건너뛴 줄 2개/.test(rep), rep);
  chk('건너뛴 이유를 적는다', /위도·경도|이름이 비어/.test(rep), rep);

  await feed('이름,위도,경도,주소\n"대구 3대",35.8,128.6,"대구광역시"\n'); await wait(400);
  chk('한글 머리글도 받는다', /1곳을 반영/.test(await report()), await report());

  await feed('name,lat,lng,desc,tags\n"인용 ""테스트""",35.3,129.2,"쉼표, 포함\n줄바꿈까지","도심;주간"\n'); await wait(400);
  chk('따옴표·쉼표·줄바꿈이 든 셀을 처리한다', await p.evaluate(() => {
    const u = (window.__units || []).filter((x) => /인용/.test(x.name))[0];
    return !!u && u.name === '인용 "테스트"' && /쉼표, 포함/.test(u.desc) && u.tags.length === 2;
  }));

  console.log('\n[합치기 · 교체]');
  chk('같은 이름은 갱신된다(중복 생기지 않음)', await p.evaluate(async () => {
    const before = (window.__units || []).filter((u) => u.name === '서울 1대').length;
    const el = document.getElementById('csv-file');
    const dt = new DataTransfer();
    dt.items.add(new File(['name,lat,lng,address\n"서울 1대",37.6,127.1,"바뀐 주소"\n'], 'x.csv', { type: 'text/csv' }));
    el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const after = (window.__units || []).filter((u) => u.name === '서울 1대');
    return before === 1 && after.length === 1 && after[0].address === '바뀐 주소' && after[0].lat === 37.6;
  }));
  // ① 확인창에서 취소하면 기존 데이터가 그대로여야 한다(되돌릴 수 없는 삭제이므로)
  acceptDialog = false; lastDialog = '';
  const beforeCancel = await p.evaluate(() => (window.__units || []).length);
  await p.evaluate(async () => {
    document.querySelector('input[name="csv-mode"][value="replace"]').click();
    const el = document.getElementById('csv-file');
    const dt = new DataTransfer();
    dt.items.add(new File(['name,lat,lng\n"취소될 곳",36.0,128.0\n'], 'x.csv', { type: 'text/csv' }));
    el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
  });
  chk('전체 교체 전에 몇 곳이 지워지는지 묻는다', /덮어쓰기/.test(lastDialog) && new RegExp(beforeCancel + '곳').test(lastDialog), lastDialog);
  chk('확인을 취소하면 기존 데이터가 그대로다',
    (await p.evaluate(() => (window.__units || []).length)) === beforeCancel &&
    /취소/.test(await report()), await report());
  acceptDialog = true;

  chk('전체 교체는 말 그대로 교체', await p.evaluate(async () => {
    document.querySelector('input[name="csv-mode"][value="replace"]').click();
    const el = document.getElementById('csv-file');
    const dt = new DataTransfer();
    dt.items.add(new File(['name,lat,lng\n"유일한 곳",36.0,128.0\n'], 'x.csv', { type: 'text/csv' }));
    el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const u = window.__units || [];
    return u.length === 1 && u[0].name === '유일한 곳';
  }));

  console.log('\n[내보내기]');
  chk('내보낸 CSV 는 엑셀용 BOM 으로 시작한다(엑셀에서 한글이 깨지지 않게)', await p.evaluate(async () => {
    window.__lastCsv = '';
    document.getElementById('csv-export').click();
    await new Promise((r) => setTimeout(r, 250));
    const t = window.__lastCsv || '';
    return t.charCodeAt(0) === 0xFEFF && /name,kind/.test(t) && /유일한 곳/.test(t);
  }));
  chk('양식 CSV 도 같은 열 구성으로 내려간다', await p.evaluate(async () => {
    window.__lastCsv = '';
    document.getElementById('csv-template').click();
    await new Promise((r) => setTimeout(r, 250));
    const t = window.__lastCsv || '';
    return /name,kind,subtitle/.test(t) && /서울 1대/.test(t);
  }));

  /* 불러오기가 실패했는데 저장이 되면 지도 전체가 빈 목록으로 덮인다 — 실제로 그런 길이 있었다. */
  console.log('\n[불러오기 실패 — 저장 잠금]');
  {
    failUnitsGet = true;
    const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 1000 });
    await p2.evaluateOnNewDocument(() => {
      localStorage.setItem('scoutfinder:admin-session', JSON.stringify({ token: 'T', exp: Date.now() + 9e6 }));
    });
    await p2.goto(base + '/tour/admin', { waitUntil: 'networkidle2' }); await wait(1800);
    const label = await p2.evaluate(() => (document.getElementById('saved-label') || {}).textContent || '');
    chk('못 불러왔으면 "저장됨" 이라고 적지 않는다', !/All changes saved/.test(label) && /load|disabled/i.test(label), label);
    saved = null;
    await p2.evaluate(() => { const btn = document.querySelector('[data-act="save"]'); if (btn) btn.click(); });
    await wait(600);
    chk('못 불러온 상태에서는 저장 자체를 하지 않는다', saved === null);
    await p2.close();
    failUnitsGet = false;
  }

  /* ── 서버 안전장치 ── 화면이 실수해도 서버가 마지막으로 막아야 한다.
     배포되는 모듈을 가짜 KV(Map)로 그대로 돌린다 — 운영 KV 는 건드리지 않는다. */
  console.log('\n[서버 — 지도 데이터 보호]');
  {
    const KV = new Map();
    const fenv = { TOTP_SECRET: 'JBSWY3DPEHPK3PXP', SCOUT_KV: {
      get: async (k) => (KV.has(k) ? KV.get(k) : null), put: async (k, v) => { KV.set(k, v); }, delete: async (k) => { KV.delete(k); } } };
    const lib = await import('../functions/api/_lib.js');
    const um = await import('../functions/api/units.js');
    const sess = await lib.issueSession(fenv);
    const H = { 'content-type': 'application/json', Authorization: 'Bearer ' + (sess.token || sess) };
    const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'u' + i, name: '단위대 ' + i, lat: 37, lng: 127 }));
    const PUT = (body) => um.onRequestPut({ request: new Request('https://x/api/units', { method: 'PUT', headers: H, body: JSON.stringify(body) }), env: fenv });
    let r = await PUT({ units: mk(20) });
    chk('정상 저장은 통과한다', r.status === 200 && (await r.json()).count === 20);
    r = await PUT({ units: [] });
    chk('빈 목록으로 전체가 지워지지 않는다', r.status === 409 && (await r.json()).error === 'empty_guard');
    r = await PUT({ units: mk(3) });
    chk('대량 감소(20→3)는 확인 없이 저장되지 않는다', r.status === 409 && (await r.json()).error === 'shrink_guard');
    r = await PUT({ units: mk(3), confirmShrink: true });
    chk('의도한 감소는 확인 표시로 저장된다', r.status === 200 && (await r.json()).count === 3);
    r = await um.onRequestGet({ request: new Request('https://x/api/units?snapshots=1', { headers: H }), env: fenv });
    const snaps = (await r.json()).snapshots || [];
    chk('덮어쓰기 전 스냅샷이 남는다', snaps.length >= 1 && snaps[0].count === 20);
    r = await um.onRequestGet({ request: new Request('https://x/api/units?snapshots=1'), env: fenv });
    chk('스냅샷은 관리자만 본다', r.status === 401);
    r = await PUT({ restore: snaps[0].at });
    chk('스냅샷으로 되돌릴 수 있다', r.status === 200 && (await r.json()).count === 20);
    chk('누가 언제 바꿨는지 기록이 남는다', (JSON.parse(KV.get('log') || '[]')).some((x) => x.action === 'units.restore'));
  }

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 2).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
