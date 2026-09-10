/* K-TrainRadar24 (/ktrainrader24) 회귀 — 여객열차 레이더
 *
 * 왜 이 스위트가 따로 있나:
 *  ① 이 화면의 데이터는 **미리 구워 둔 정적 파일**이다. 서버가 없으니 잘못된
 *     값이 들어가도 런타임에 걸러 줄 곳이 없다. 파일 자체를 재야 한다.
 *  ② 경로 형상은 **날짜 파일들이 공유**한다. 경로 하나가 빠지면 그 경로를
 *     참조하는 열차 수십 편이 통째로 사라지는데 **화면은 멀쩡히 뜬다.**
 *  ③ 선로망이 끊기면 최단경로 탐색은 실패하지 않고 **말없이 전국을 한 바퀴
 *     도는 경로**를 내놓는다. 실제로 군산→익산(직선 18km)이 473km 로 나왔고,
 *     지도 위에서는 정상으로 보였다. 거리로 재지 않으면 못 잡는다.
 *  ④ 산출물은 별도 저장소(K-TrainRader24)에서 빌드해 복사해 온다. 복사가
 *     덜 되거나 낡아도 이 저장소에서는 티가 안 난다.
 *
 * 의존성 없음 — 헤드리스 Chrome 에 DevTools 프로토콜로 직접 붙는다(Node 내장 WebSocket).
 * 실행: node test/regress-ktrainrader24.js */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const APP = 'ktrainrader24';
/* Chrome 경로. 맥 기본값을 쓰되 CI(리눅스 러너)에서는 CHROME 환경변수로 바꾼다.
   경로를 하드코딩해 두면 이 스위트만 CI 에서 조용히 죽는다. */
const CHROME =
  process.env.CHROME ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
   '/usr/bin/google-chrome',
   '/usr/bin/chromium-browser',
   '/usr/bin/chromium'].find((p) => fs.existsSync(p)) ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8896;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

const R = [];
const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (f) => path.join(ROOT, APP, f);
const has = (f) => fs.existsSync(abs(f));
const readJson = (f) => JSON.parse(fs.readFileSync(abs(f), 'utf8'));

/* 남한을 넉넉히 감싸는 상자. 좌표가 여기를 벗어나면 위경도가 뒤바뀐 것이다
   — [lat,lng] 를 [lng,lat] 로 넣으면 지도에 아무것도 안 뜨는 게 아니라
   중국 앞바다에 뜬다. 화면만 봐서는 '비어 보인다'로만 보인다. */
const KOREA = { minLat: 33.0, maxLat: 38.9, minLng: 124.5, maxLng: 131.5 };

const R_EARTH = 6371008.8, DEG = Math.PI / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * DEG, dLng = (bLng - aLng) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ── 1. 파일 존재 ─────────────────────────────────────────────── */
console.log('\n[구조]');
chk('index.html 이 있다', has('index.html'));
chk('api/index.json 이 있다', has('api/index.json'));
chk('api/routes.json 이 있다', has('api/routes.json'));
chk('api/rail-lines.json 이 있다', has('api/rail-lines.json'));

/* .md 는 _middleware 가 404 로 막는다. 여기 섞이면 그 파일은 영영 안 나간다. */
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; };
const files = walk(path.join(ROOT, APP)).map((f) => f.slice(path.join(ROOT, APP).length));
chk('차단 대상(.md) 이 섞여 있지 않다', !files.some((f) => /\.md$/i.test(f)), files.filter((f) => /\.md$/i.test(f)).join(', '));
chk('중첩 _headers 를 두지 않았다 (루트 것이 우선한다)', !has('_headers'));

/* ── 2. 목록과 날짜 파일 ──────────────────────────────────────── */
console.log('\n[목록]');
const manifest = readJson('api/index.json');
chk('목록에 날짜가 있다', Array.isArray(manifest.dates) && manifest.dates.length > 0, `${manifest.dates?.length}일`);
chk('날짜가 오름차순이다', manifest.dates.every((d, i) => i === 0 || d > manifest.dates[i - 1]));
chk('날짜에 중복이 없다', new Set(manifest.dates).size === manifest.dates.length);
chk('날짜 형식이 YYYYMMDD 다', manifest.dates.every((d) => /^\d{8}$/.test(d)));
chk('배포 식별자가 있다', typeof manifest.build === 'string' && manifest.build.length > 0);
chk('날짜별 근거(bases)가 있다', manifest.bases && Object.keys(manifest.bases).length === manifest.dates.length,
  `${Object.keys(manifest.bases ?? {}).length}/${manifest.dates.length}`);
/* 오늘이 '공표 시각표 기준'이 아니면 화면이 추정만으로 돈다는 뜻이다.
   재빌드가 밀렸거나 TAGO 데이터가 아직 안 올라왔다는 신호. */
const todayBasis = manifest.bases?.[new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '')];
chk('오늘은 공표 시각표 기준이다', todayBasis === 'official' || todayBasis === 'fixture', `오늘 basis=${todayBasis}`);

const missingDays = manifest.dates.filter((d) => !has(`api/day-${d}.json`));
chk('목록의 모든 날짜에 파일이 있다', missingDays.length === 0, missingDays.join(', '));

const strayDays = files.filter((f) => /^\/api\/day-\d{8}\.json$/.test(f))
  .map((f) => f.slice('/api/day-'.length, -'.json'.length))
  .filter((d) => !manifest.dates.includes(d));
chk('목록에 없는 날짜 파일이 남아 있지 않다', strayDays.length === 0, strayDays.join(', '));

/* 오늘이 범위 안에 들어야 한다. 배포가 밀리면 화면이 옛 시각표로 돈다. */
const todayKST = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
chk('오늘 날짜가 준비돼 있다', manifest.dates.includes(todayKST), `오늘 ${todayKST}, 범위 ${manifest.dates[0]}~${manifest.dates.at(-1)}`);

/* ── 3. 경로와 구간 형상 ─────────────────────────────────────── */
console.log('\n[경로]');
const routesFile = readJson('api/routes.json');
const routes = routesFile.routes;
const segments = routesFile.segments;
const routeIds = Object.keys(routes);
chk('경로가 있다', routeIds.length > 0, `${routeIds.length}개`);
chk('구간 형상이 있다', Array.isArray(segments) && segments.length > 0, `${segments?.length}개`);

/* 구간 형상 자체를 먼저 잰다. 경로는 이걸 참조만 한다. */
let segOdd = 0, segShort = 0, segOutside = 0, segPts = 0;
for (const seg of segments) {
  if (!Array.isArray(seg) || seg.length % 2 !== 0) { segOdd++; continue; }
  if (seg.length < 4) { segShort++; continue; }
  segPts += seg.length / 2;
  for (let i = 0; i < seg.length; i += 2) {
    if (seg[i] < KOREA.minLat || seg[i] > KOREA.maxLat || seg[i + 1] < KOREA.minLng || seg[i + 1] > KOREA.maxLng) { segOutside++; break; }
  }
}
chk('구간 좌표가 쌍으로 들어 있다', segOdd === 0, `${segOdd}개 불량`);
chk('구간이 최소 두 점을 갖는다', segShort === 0, `${segShort}개 불량`);
chk('구간이 전부 한국 안에 있다', segOutside === 0, `${segOutside}개가 범위 밖`);
chk('구간 정점이 충분하다', segPts > 10000, `${segPts.toLocaleString()}점`);

/* 경로 → 구간 참조가 성립하는지. 하나만 끊겨도 그 경로의 열차가 통째로 사라진다. */
let dangling = 0, lenMismatch = 0, detour = 0, tooShort = 0;
const detours = [];
const routeLength = new Map(); // id -> 총 길이(m). 열차 검사에서 재사용한다.
const routeStopCount = new Map();

for (const id of routeIds) {
  const r = routes[id];
  if (!Array.isArray(r.segs) || !Array.isArray(r.stops)) { lenMismatch++; continue; }
  /* 정차역 N개면 구간은 N-1개다. 어긋나면 시각 배열과 정차역이 엇갈린다. */
  if (r.stops.length !== r.segs.length + 1) { lenMismatch++; continue; }
  routeStopCount.set(id, r.stops.length);

  let bad = false, total = 0, reach = 0;
  let firstLat = null, firstLng = null, lastLat = null, lastLng = null;
  for (const idx of r.segs) {
    const seg = segments[idx];
    if (!seg || seg.length < 4) { bad = true; break; }
    if (firstLat === null) { firstLat = seg[0]; firstLng = seg[1]; }
    lastLat = seg[seg.length - 2]; lastLng = seg[seg.length - 1];
    for (let i = 0; i < seg.length; i += 2) {
      if (i >= 2) total += haversine(seg[i - 2], seg[i - 1], seg[i], seg[i + 1]);
      /* 시발역에서 가장 멀리 간 거리. 순환 경로를 재는 잣대다. */
      const d = haversine(firstLat, firstLng, seg[i], seg[i + 1]);
      if (d > reach) reach = d;
    }
  }
  if (bad) { dangling++; continue; }
  if (total < 500) { tooShort++; continue; }
  routeLength.set(id, total);

  /* 우회 검사 -- 선로망 공백을 돌아간 경로는 지도에서 정상으로 보이므로
     숫자로만 잡힌다. 영동선 통리재(실측 3.4배)는 실제 지형이라 통과시키고,
     진짜 공백(군산→익산 26배)은 잡는다.

     기준을 시·종착 직선거리로만 잡으면 순환 열차에서 무너진다 -- 서해선·
     장항선을 도는 홍성→홍성 열차는 직선거리가 0 이라 비율이 무한대가 된다.
     그래서 시발역에서 가장 멀리 간 거리(reach)를 잣대로 쓴다. 왕복이면
     최소 2배는 나오므로 여유를 두고 8배를 넘을 때만 문제로 본다. */
  const straight = haversine(firstLat, firstLng, lastLat, lastLng);
  const isLoop = straight < Math.max(2000, reach * 0.05);
  const yardstick = isLoop ? reach : straight;
  const limit = isLoop ? 8.0 : 6.0;
  if (total > 6000 && yardstick > 0 && total / yardstick > limit) {
    detour++;
    if (detours.length < 3) {
      detours.push(
        `${r.stops[0]}→${r.stops[r.stops.length - 1]} ${(total / 1000).toFixed(0)}km/` +
        `${isLoop ? '최원거리' : '직선'} ${(yardstick / 1000).toFixed(0)}km`,
      );
    }
  }
}
chk('모든 경로의 구간 참조가 유효하다', dangling === 0, `${dangling}개 끊김`);
chk('정차역 수 = 구간 수 + 1', lenMismatch === 0, `${lenMismatch}개 불일치`);
chk('길이가 0에 가까운 경로가 없다', tooShort === 0, `${tooShort}개`);
chk('터무니없이 도는 경로가 없다', detour === 0, detours.join(' / '));

/* 중복 제거가 실제로 되고 있는지. 안 되면 용량이 8배로 튄다(실측 8.25MB → 1.15MB). */
let segRefs = 0;
for (const id of routeIds) segRefs += routes[id].segs?.length ?? 0;
const dedup = segRefs > 0 ? 1 - segments.length / segRefs : 0;
chk('구간 중복이 제거돼 있다', dedup > 0.5, `${(dedup * 100).toFixed(0)}% 감소 (${segRefs}회 참조 → ${segments.length}개)`);

const routesBytes = fs.statSync(abs('api/routes.json')).size;
chk('경로 파일이 과하게 크지 않다', routesBytes < 4 * 1024 * 1024, `${(routesBytes / 1024 / 1024).toFixed(2)} MB`);

/* ── 4. 날짜 파일과 열차 ──────────────────────────────────────── */
console.log('\n[열차]');
let danglingRoute = 0, badLen = 0, badOrder = 0, totalTrains = 0, badBasis = 0;
const danglingSample = [];
const BASES = new Set(['official', 'pattern', 'fixture']);
for (const date of manifest.dates) {
  const day = readJson(`api/day-${date}.json`);
  if (day.date !== date) chk(`day-${date} 의 date 필드가 파일명과 같다`, false, day.date);
  if (!BASES.has(day.basis)) badBasis++;
  if (day.basis !== manifest.bases?.[date]) badBasis++;
  totalTrains += day.trains.length;

  for (const t of day.trains) {
    const stops = routeStopCount.get(t.route);
    if (stops === undefined) { danglingRoute++; if (danglingSample.length < 3) danglingSample.push(`${date} ${t.no}`); continue; }
    if (t.arr.length !== stops || t.dep.length !== stops) { badLen++; continue; }
    /* 시각은 자정 기준 분이고 되돌아가면 안 된다(-1 은 '없음'). */
    let prev = -Infinity;
    for (let i = 0; i < stops; i++) {
      for (const v of [t.arr[i], t.dep[i]]) {
        if (v < 0) continue;
        if (v < prev) { badOrder++; i = stops; break; }
        prev = v;
      }
    }
  }
}
chk('모든 열차의 경로가 사전에 있다', danglingRoute === 0, danglingSample.join(', '));
chk('시각 배열 길이가 정차역 수와 같다', badLen === 0, `${badLen}편 불량`);
chk('시각이 거꾸로 가지 않는다', badOrder === 0, `${badOrder}편 불량`);
chk('열차가 실려 있다', totalTrains > 0, `${manifest.dates.length}일 합계 ${totalTrains}편`);
chk('근거(basis)가 목록과 일치한다', badBasis === 0, `${badBasis}건 불일치`);

/* ── 5. 배경 선로 ─────────────────────────────────────────────── */
console.log('\n[선로]');
const rail = readJson('api/rail-lines.json');
chk('선로 노선이 있다', Array.isArray(rail.lines) && rail.lines.length > 0, `${rail.lines?.length}개 노선`);
let railOutside = 0, railPts = 0, railOdd = 0;
for (const line of rail.lines) {
  for (const flat of line.paths) {
    if (flat.length % 2 !== 0) { railOdd++; continue; }
    railPts += flat.length / 2;
    for (let i = 0; i < flat.length; i += 2) {
      if (flat[i] < KOREA.minLat || flat[i] > KOREA.maxLat || flat[i + 1] < KOREA.minLng || flat[i + 1] > KOREA.maxLng) { railOutside++; break; }
    }
  }
}
chk('선로 좌표가 쌍으로 들어 있다', railOdd === 0, `${railOdd}개 불량`);
chk('선로가 전부 한국 안에 있다', railOutside === 0, `${railOutside}개 구간이 범위 밖`);
chk('선로 정점이 충분하다', railPts > 20000, `${railPts.toLocaleString()}점`);
const named = rail.lines.map((l) => l.name);
for (const must of ['경부선', '경부고속선', '호남선', '중앙선', '장항선']) {
  chk(`주요 노선 '${must}' 이 있다`, named.includes(must));
}

/* ── 6. 실제 화면 ─────────────────────────────────────────────── */
(async () => {
  console.log('\n[화면]');
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(PORT, r));

  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ktr-regress-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank']);
  chrome.stderr.on('data', () => {});

  let ws = null, sessionId = null, nextId = 1;
  const pending = new Map(); const errors = [];
  /* sessionId 는 붙기 전까지 null 이다. null 을 그대로 실어 보내면 CDP 가
     "Message may have string 'sessionId' property" 로 거부한다. 있을 때만 넣는다. */
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++; pending.set(id, { resolve, reject });
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
  });

  try {
    let wsUrl = null;
    for (let i = 0; i < 60 && !wsUrl; i++) {
      try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; }
      catch { await wait(250); }
    }
    if (!wsUrl) throw new Error('DevTools 가 뜨지 않았다');

    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params?.exceptionDetails?.exception?.description || '예외');
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push((m.params.args || []).map((a) => a.value || a.description).join(' '));
    });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    sessionId = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${APP}/` });
    await wait(9000);

    const evalIn = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    const state = JSON.parse(await evalIn(`JSON.stringify({
      boot: !document.getElementById('boot') || document.getElementById('boot').hidden,
      running: Number(document.getElementById('stat-running').textContent.replace(/,/g,'')),
      filterRunning: Number((document.getElementById('flt-running')?.textContent || '0').replace(/,/g,'')),
      hasTotal: !!document.getElementById('stat-total'),
      source: document.getElementById('source-text').textContent,
      detailHidden: document.getElementById('detail').hidden,
      canvases: document.querySelectorAll('canvas').length
    })`));

    chk('부팅 오버레이가 사라진다', state.boot === true);
    /* 하루 총편수는 화면에서 뺐다(사용자 요청) -- 지도에 12편이 떠 있는데
       807이라고 적히면 무엇을 세는 숫자인지 헷갈리기 때문이다.
       대신 상단과 필터의 '운행 중'이 서로 맞는지 잰다. */
    chk('상단과 필터의 운행 중 편수가 같다',
      Math.abs(state.running - state.filterRunning) <= 2,
      `상단 ${state.running} · 필터 ${state.filterRunning}`);
    chk('하루 총편수는 화면에 없다', state.hasTotal === false);
    chk('운행 중인 열차가 있다', state.running > 0, `${state.running}편`);
    chk('출처 배지가 채워져 있다', typeof state.source === 'string' && state.source.length > 0, state.source);
    chk('상세 패널은 처음에 닫혀 있다', state.detailHidden === true);
    chk('캔버스 두 층이 올라와 있다 (선로·열차)', state.canvases === 2, `${state.canvases}개`);

    /* 열차를 눌러 상세가 열리는지 — 클릭 판정이 깨지면 화면은 멀쩡한데 아무것도 안 눌린다. */
    const clicked = JSON.parse(await evalIn(`(() => {
      const r = window.__radar; if (!r) return JSON.stringify({ ok:false, why:'핸들 없음' });
      const size = r.map.getSize();
      for (let rad = 0; rad < Math.max(size.x,size.y); rad += 12) {
        for (let a = 0; a < 360; a += 15) {
          const x = size.x/2 + rad*Math.cos(a*Math.PI/180), y = size.y/2 + rad*Math.sin(a*Math.PI/180);
          const hit = r.trainLayer.hitTest(x, y, 10);
          if (hit) { r.showDetail(hit);
            return JSON.stringify({ ok:true, no:hit.train.no,
              open: !document.getElementById('detail').hidden,
              stops: document.querySelectorAll('#detail-stops li').length,
              kind: hit.train.kind,
              stockShown: !document.getElementById('detail-stock').hidden,
              stockRows: document.querySelectorAll('#detail-stock .stock__grid dt').length,
              stockText: (document.getElementById('detail-stock').textContent||'').replace(/\\s+/g,' '),
              routeStops: hit.route.stops.length }); }
        }
      }
      return JSON.stringify({ ok:false, why:'열차를 못 찾음' });
    })()`));
    chk('열차를 눌러 상세가 열린다', clicked.ok === true && clicked.open === true, clicked.why || `열차 ${clicked.no}`);
    chk('상세의 정차역 수가 경로와 같다', clicked.ok === true && clicked.stops === clicked.routeStops, `${clicked.stops}/${clicked.routeStops}`);

    /* ── 차량 제원 ──
       Flightradar24 의 기종 표시에 해당한다. 다만 공개 API 에 편성번호가
       없어 개체가 아니라 **형식**을 보여 준다. 그 한계를 적은 문장이
       화면에서 사라지면, 사용자는 이 값을 당일 실제 투입 차량으로 읽는다.
       제원표만 남고 단서가 빠지는 쪽이 제일 위험해서 둘을 같이 잰다. */
    chk('상세에 차량 제원이 나온다',
      clicked.stockShown === true && clicked.stockRows >= 3,
      `${clicked.kind} · ${clicked.stockRows}행`);
    chk('차량 제원이 형식 기준임을 밝힌다',
      /편성번호가 없어/.test(clicked.stockText || ''),
      (clicked.stockText || '').slice(-60));

    chk('콘솔 오류가 없다', errors.length === 0, errors.slice(0, 2).join(' | '));

    /* ── 고지 ──
       "민원을 제기하지 마십시오 / 맹신하지 마십시오"는 사용자가 직접 요구한
       문구다. 화면 어딘가에 조용히 사라지면 안 된다. 첫 방문 안내와 하단
       고지 양쪽에서 확인한다. */
    const notice = JSON.parse(await evalIn(`(() => {
      const box = document.getElementById('notice');
      const warnText = (document.querySelector('.notice__warn')?.textContent || '').replace(/\\s+/g,' ');
      const footText = (document.querySelector('.note__warn')?.textContent || '').replace(/\\s+/g,' ');
      return JSON.stringify({
        shown: box && !box.hidden,
        warnText, footText,
        hasOk: !!document.getElementById('notice-ok'),
      });
    })()`));
    chk('첫 방문에 안내가 뜬다', notice.shown === true);
    chk('안내에 민원 문구가 있다', /민원을 제기하지 마십시오/.test(notice.warnText), notice.warnText.slice(0, 40));
    chk('안내에 맹신 금지 문구가 있다', /맹신하지 마십시오/.test(notice.warnText));
    chk('하단 고지에도 같은 경고가 있다',
      /민원을 제기하지 마십시오/.test(notice.footText) && /맹신하지 마십시오/.test(notice.footText),
      notice.footText.slice(0, 50));

    const dismissed = JSON.parse(await evalIn(`(() => {
      document.getElementById('notice-ok').click();
      let stored = null;
      try { stored = window.localStorage.getItem('ktr24.notice.v1'); } catch {}
      return JSON.stringify({ hidden: document.getElementById('notice').hidden, stored });
    })()`));
    chk('확인하면 안내가 닫힌다', dismissed.hidden === true);
    chk('확인을 기억한다', dismissed.stored === '1', String(dismissed.stored));

    /* ── 종류 필터 ──
       등급(모양)만으로는 ITX-마음과 무궁화호를 못 가른다. 종별 목록과
       끄고 켜기가 실제로 지도에 반영되는지 잰다. */
    const filter = JSON.parse(await evalIn(`(() => {
      const panel = document.getElementById('filter');
      const kinds = [...panel.querySelectorAll('input[data-kind]')].map(b => b.dataset.kind);
      const grades = [...panel.querySelectorAll('input[data-grade]')].map(b => b.dataset.grade);
      const before = Number(document.getElementById('stat-running').textContent.replace(/,/g,''));
      /* data-kind 는 체크박스다. 꺼짐 표시는 그것을 감싼 라벨에 붙는다. */
      const first = panel.querySelector('input[data-kind]');
      const firstKind = first?.dataset.kind;
      first?.click();
      const box = panel.querySelector('input[data-kind="'+firstKind+'"]');
      return JSON.stringify({ kinds, grades, before, firstKind,
        unchecked: box ? !box.checked : null,
        offNow: box?.closest('label')?.classList.contains('is-off') });
    })()`));
    chk('필터에 종별이 여럿 있다', filter.kinds.length >= 3, filter.kinds.join(', '));
    chk('필터가 등급으로 묶여 있다', filter.grades.length >= 2, filter.grades.join(', '));
    chk('종별을 끄면 체크가 풀린다', filter.unchecked === true, filter.firstKind);
    chk('꺼진 종별이 목록에서 흐려진다', filter.offNow === true, filter.firstKind);

    await wait(1200);
    const after = Number(await evalIn(`document.getElementById('stat-running').textContent.replace(/,/g,'')`));
    chk('종별을 끄면 지도에서도 줄어든다', after < filter.before, `${filter.before} → ${after}`);

    const restored = JSON.parse(await evalIn(`(() => {
      document.querySelector('[data-all]').click();
      const panel = document.getElementById('filter');
      return JSON.stringify({
        anyOff: !!panel.querySelector('label.flt__kind.is-off'),
        allChecked: [...panel.querySelectorAll('input[data-kind]')].every(b => b.checked),
      });
    })()`));
    chk('전체 버튼이 필터를 해제한다', restored.anyOff === false && restored.allChecked === true);

    /* ── 역 표시 ──
       선로만 있고 역이 없으면 열차가 어디쯤인지 지명으로만 짐작해야 한다. */
    const stationsRes = await evalIn(`(async () => {
      try {
        const r = await fetch(new URL('api/stations.json', location.href).href);
        if (!r.ok) return JSON.stringify({ ok: false, status: r.status });
        const j = await r.json();
        const names = new Set(j.stations.map(s => s.n));
        return JSON.stringify({
          ok: true, n: j.stations.length,
          hasMajor: ['서울','부산','대전','동대구','광주송정'].filter(x => names.has(x)),
          inKorea: j.stations.every(s => s.y > 32 && s.y < 39.5 && s.x > 124 && s.x < 132),
        });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }); }
    })()`);
    const st = JSON.parse(stationsRes);
    chk('역 좌표 파일이 있다', st.ok === true, st.ok ? `${st.n}개` : String(st.status ?? st.err));
    chk('주요 역이 들어 있다', (st.hasMajor?.length ?? 0) >= 4, (st.hasMajor ?? []).join(', '));
    chk('역 좌표가 전부 한국 안에 있다', st.inKorea === true);

    /* ── 버전 표시 ── */
    const version = JSON.parse(await evalIn(`(() => {
      const t = (document.getElementById('brand-meta')?.textContent || '').replace(/\\s+/g,' ');
      const clock = (document.querySelector('#stat-clock')?.closest('.stat')?.textContent || '').replace(/\\s+/g,' ');
      return JSON.stringify({ t, clock });
    })()`));
    chk('앱 버전이 보인다', /v\d+\.\d+\.\d+/.test(version.t), version.t);
    chk('데이터 갱신 시각이 보인다', /데이터\s*\d{2}\.\d{2}/.test(version.t), version.t);
    /* 시각의 기준 시간대를 화면에 못박아 둔다. 해외에서 열면 09:00 이
       현지 시각인지 한국 시각인지 알 길이 없다. */
    chk('데이터 시각에 KST 표기가 붙는다', /KST/.test(version.t), version.t);
    chk('시계에 GMT+9 가 적혀 있다', /GMT\+9/.test(version.clock), version.clock);
  } catch (e) {
    chk('화면 검사가 끝까지 돈다', false, e.message);
  } finally {
    try { ws && ws.close(); } catch {}
    try { chrome.kill(); } catch {}
    server.close();
  }

  const fail = R.filter((r) => !r.p).length;
  console.log(`\n${R.length}건 중 ${R.length - fail}건 통과, ${fail}건 실패`);
  process.exit(fail === 0 ? 0 : 1);
})();
