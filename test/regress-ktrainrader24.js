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
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
    '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--window-size=1440,900', 'about:blank']);
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
      total: Number(document.getElementById('stat-total').textContent.replace(/,/g,'')),
      source: document.getElementById('source-text').textContent,
      detailHidden: document.getElementById('detail').hidden,
      canvases: document.querySelectorAll('canvas').length
    })`));

    chk('부팅 오버레이가 사라진다', state.boot === true);
    chk('오늘 전체 편수가 날짜 파일과 같다', state.total === readJson(`api/day-${todayKST}.json`).trains.length, `화면 ${state.total}`);
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
              routeStops: hit.route.stops.length }); }
        }
      }
      return JSON.stringify({ ok:false, why:'열차를 못 찾음' });
    })()`));
    chk('열차를 눌러 상세가 열린다', clicked.ok === true && clicked.open === true, clicked.why || `열차 ${clicked.no}`);
    chk('상세의 정차역 수가 경로와 같다', clicked.ok === true && clicked.stops === clicked.routeStops, `${clicked.stops}/${clicked.routeStops}`);
    chk('콘솔 오류가 없다', errors.length === 0, errors.slice(0, 2).join(' | '));
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
