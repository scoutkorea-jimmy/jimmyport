/* K-TransportRadar24 시내버스 중계 (2026-09-15 첫판)
 *
 *  GET /api/ktransportradar24-bus?city=<도시코드>&route=<노선ID>
 *      → { ok, city, route, basis:'gps'|'stop', receivedAt(ms), vehicles:[{no,lat,lon,node,ord}], dropped?, stale?, staleAge?, errors? }
 *  GET /api/ktransportradar24-bus?city=<도시코드>&route=<노선ID>&stops=1
 *      → { ok, city, route, basis, receivedAt(ms), stops:[{id,name,ord,lat,lon,up}], dropped? }
 *  실패 200 { ok:false, error, errors:[…] } · 입력 오류 400 { ok:false, error }
 *
 * 왜 중계인가. TAGO 버스 API 는 CORS 로 Origin 을 되돌려 줘 브라우저가 직접 부를 수는 있지만(2026-09-15 실측),
 * 인증키가 URL 쿼리에 실린다. 키를 방문자에게 줄 수 없으니 여기서 붙인다.
 *
 * 한도가 설계를 정했다(docs/research/2026-09-15-transport-apis.md 🚌 절).
 *  - 오퍼레이션마다 하루 10,000회. 오류 응답도 센다. 전국 노선 21,489 라 상시 전체 표시는 불가 →
 *    화면은 고른 노선만(최대 3) 30초마다 묻는다. 노선 하나를 한 사람이 하루 종일 켜 두면 2,880회다.
 *  - 그래서 (도시, 노선)마다 30초 엣지 캐시를 두고, 방문자가 몇 명이든 노선당 30초에 한 번만 부른다.
 *  - 응답 헤더 X-RateLimit-Remaining 이 남은 수다. 하루(KST) 가장 작은 값을 KV 에 두고 1,000 밑이면 멈춘다.
 *    1,000 을 남기는 이유: 같은 키를 쓰는 맥미니 빌드·수동 확인 몫, 그리고 KV 가 콜로 사이에 최대 60초 늦는 사이 나가는 호출 몫.
 *
 * ⚠️ 코드 99 "가용한 세션이 존재하지 않습니다 (30/30)" — HTTP 200 에 resultCode 가 숫자 99, body "".
 *    폴링 11회에 1회꼴(2026-09-15). 99 는 절대 '좋은 사본'으로 담지 않는다. 대신 10분짜리 두 번째 캐시 키에
 *    남겨 둔 직전 성공본을 stale:true 로 준다. 없으면 ok:false.
 *    실패·낡은 응답은 방문자마다 원천을 다시 두들기지 않게 **10초만** 첫 번째 키에 둔다(99 본문이 아니라 그 대체 응답이다).
 * ⚠️ 경기(31xxx) 위치는 정류소 좌표로 스냅된다 — 정류소를 지날 때만 바뀐다. basis:'stop' 으로 알려 화면이 보간한다.
 * ⚠️ 계룡(34070)은 대전(25)과 같은 차량을 중복으로 주고 좌표가 없다 → 받지 않는다.
 * ⚠️ 5xx 는 커스텀 도메인에서 Cloudflare 가 본문을 자기 오류 페이지로 덮는다 → 실패도 200 ok:false (항공기 중계와 같다).
 * ⚠️ 인증키(env.DATA_GO_KR_SERVICE_KEY, Pages 시크릿)는 응답·오류·로그 어디에도 싣지 않는다. fetch 오류 원문은 URL 을
 *    담을 수 있어 오류 이름만 싣고, 마지막에 errors 전체에서 키 문자열을 한 번 더 지운다.
 * ⚠️ KV 쓰기: 오퍼레이션마다 isolate 하나당 최대 1분에 1번(한도 1,000 밑으로 막 내려간 순간은 바로 1번 더).
 *    화면이 쓰는 동안만 생긴다 — 하루 종일 켜 둬도 위치 1,440 + 정류소(7일 캐시라 드묾) ≈ 하루 1,500 이하/isolate.
 *    Workers Paid 포함량 월 100만(하루 약 33,000) 안이다. 읽기도 isolate 당 1분에 1번.
 *
 * 로컬 실측(2026-09-15 23:41 KST, 실제 TAGO · 흉내 캐시·KV): 부산 105·인천 N80·수원 7001 — 원천 9회, 64~577 ms(한 번 2,191 ms),
 *    캐시 적중 0 ms, 남은 한도 위치 9,890→9,885 · 정류소 9,968→9,966(오퍼레이션마다 따로), KV 쓰기 2(오퍼레이션당 1).
 *    수원(stop) 31초 뒤 표본 2대 모두 정류소 한 칸씩 이동 · 인천(gps) 1대 이동.
 *
 * 배포 (K-TrainRader24 저장소의 relay/ 에서 옮긴다)
 *  1. relay/ktransportradar24-bus.js            → jimmyport/functions/api/ktransportradar24-bus.js
 *     relay/test/regress-ktransportradar24-bus.js → jimmyport/test/regress-ktransportradar24-bus.js
 *     회귀는 ../functions/api/ 를 먼저 찾으므로 경로를 고치지 않는다: node test/regress-ktransportradar24-bus.js
 *  2. 시크릿(값은 K-TrainRader24/.env 의 DATA_GO_KR_SERVICE_KEY 인코딩본 그대로):
 *       npx wrangler pages secret put DATA_GO_KR_SERVICE_KEY --project-name jimmyport
 *     Pages 시크릿은 그 뒤 배포부터 보인다 — 넣고 나서 배포한다. 없으면 200 ok:false "config: … 없음".
 *  3. KV 는 기존 바인딩 SCOUT_KV(wrangler.toml)를 쓴다. 새로 만들 것 없음.
 *  4. 확인: ?city=25&route=DJB30300036 → ok:true·basis:"gps" / ?city=34070&route=GRB69690112 → 400.
 *
 * 데이터: 국토교통부 TAGO(공공데이터포털). 화면에 출처를 표기한다.
 */

export const TAGO = "https://apis.data.go.kr/1613000";
export const OPS = Object.freeze({
  positions: "BusLcInfoInqireService/getRouteAcctoBusLcList",
  stops: "BusRouteInfoInqireService/getRouteAcctoThrghSttnList",
});

/**
 * 받는 도시 코드 136곳 — getCtyCodeList(2026-09-15) 138곳에서 계룡 34070(제외)과
 * 양양군 32410(00 에 노선 0)을 뺀 것. K-TrainRader24 의 bus/cities.json 과 같아야 한다
 * (tests/bus.test.ts 가 대조하고, npm run build:bus-routes 가 다르면 경고한다).
 */
export const CITY_CODES = Object.freeze([
  12, 21, 22, 23, 24, 25, 26, 39,
  31010, 31020, 31030, 31040, 31050, 31060, 31070, 31080, 31090, 31100, 31110, 31120, 31130, 31140,
  31150, 31160, 31170, 31180, 31190, 31200, 31210, 31220, 31230, 31240, 31250, 31260, 31270, 31320,
  31350, 31370, 31380,
  32010, 32020, 32050, 32310, 32360,
  33010, 33020, 33030, 33320, 33330, 33340, 33350, 33360, 33370, 33380,
  34010, 34020, 34030, 34040, 34050, 34060, 34310, 34330, 34340, 34350, 34380, 34390,
  35010, 35020, 35030, 35040, 35050, 35060, 35320, 35330, 35340, 35350, 35360, 35370, 35380,
  36010, 36020, 36030, 36040, 36060, 36320, 36330, 36350, 36380, 36400, 36410, 36420, 36430, 36450,
  36460, 36470, 36480,
  37010, 37020, 37030, 37040, 37050, 37060, 37070, 37080, 37090, 37100, 37320, 37330, 37340, 37350,
  37360, 37370, 37380, 37390, 37400, 37410, 37420, 37430,
  38010, 38030, 38050, 38060, 38070, 38080, 38090, 38100, 38310, 38320, 38330, 38340, 38350, 38360,
  38370, 38380, 38390, 38400,
]);
const CITY_SET = new Set(CITY_CODES);
export const EXCLUDED = Object.freeze({
  34070: "계룡시는 대전(25)과 같은 노선·차량을 중복으로 주고 위치에 좌표가 없습니다. 대전 25 로 조회하세요.",
});

/**
 * 노선 ID. 2026-09-15 전국 21,478행 실측: 대문자 3자 + 숫자·대문자·하이픈 1~10자(가장 긴 ID 13자) — 뒷부분 12자까지 받는다.
 * 예: DJB30300036 · GGB233000007 · BSB5201001000 · KJB10 · GMB0-110 · 99-999 꼴 하이픈 166행.
 * ⚠️ 구미 GMB수점10 류 한글 ID 3행은 받지 않는다(구운 노선 목록에도 없다).
 */
export const ROUTE_ID = /^[A-Z]{3}[0-9A-Z-]{1,12}$/;

export const TTL_POS = 30;
export const TTL_STALE = 600;
export const TTL_STOPS = 7 * 86400;
/** 빈 정류소 목록은 1시간만 — 없는 노선일 수도, 일시적 빈 응답일 수도 있다. */
export const TTL_STOPS_EMPTY = 3600;
export const TTL_FAIL = 10;
export const BUDGET_FLOOR = 1000;
export const BUDGET_WRITE_GAP_MS = 60_000;
export const BUDGET_READ_GAP_MS = 60_000;
const BUDGET_KV_EXPIRE = 2 * 86400;
export const BUDGET_ERROR = "오늘 버스 조회 한도에 가까워 멈췄습니다";
const POS_ROWS = 300;
const STOP_ROWS = 1000;
const STOP_MAX_PAGES = 3;
const TIMEOUT_MS = 8000;
const UA = "K-TransportRadar24/0.7 (+https://scoutingapp.net/ktransportradar24)";
export const BOUNDS = { latMin: 32.0, latMax: 39.6, lonMin: 123.5, lonMax: 132.0 };

const str = (v, n) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/\s+/g, " ").trim().slice(0, n) : "");

/* ------------------------------------------------------------------ */
/* 입력                                                                 */
/* ------------------------------------------------------------------ */

/** 경기(31xxx)는 정류소 단위, 나머지는 GPS 수신. */
export function basisOf(city) {
  return city >= 31000 && city < 32000 ? "stop" : "gps";
}

export function parseQuery(url) {
  const u = typeof url === "string" ? new URL(url) : url;
  const cityRaw = u.searchParams.get("city") ?? "";
  const route = u.searchParams.get("route") ?? "";
  if (!/^\d{2,5}$/.test(cityRaw)) return { ok: false, error: "city 는 도시 코드 숫자여야 합니다" };
  const city = Number(cityRaw);
  if (Object.prototype.hasOwnProperty.call(EXCLUDED, city)) return { ok: false, error: `도시 ${city} 는 쓰지 않습니다 — ${EXCLUDED[city]}` };
  if (!CITY_SET.has(city)) return { ok: false, error: `모르는 도시 코드 ${city}` };
  if (!ROUTE_ID.test(route)) return { ok: false, error: "route 는 노선 ID 모양이어야 합니다(예: DJB30300036)" };
  return { ok: true, city, route, stops: u.searchParams.get("stops") === "1" };
}

/* ------------------------------------------------------------------ */
/* 응답 읽기                                                            */
/* ------------------------------------------------------------------ */

const normCode = (raw) => {
  const s = String(raw).trim();
  return /^\d+$/.test(s) ? String(Number(s)) : s;
};

/**
 * 본문 → { code, message, items, totalCount }. 던지지 않는다.
 * code: '0' 성공(03 데이터 없음 포함) · '99' 세션 부족 · '12'·'22'·'30' 게이트웨이 · 'FORMAT' 알 수 없는 모양.
 */
export function readEnvelope(text) {
  const t = String(text ?? "").trim();
  const fail = (code, message) => ({ code, message: str(message, 80), items: [], totalCount: 0 });
  if (t.startsWith("<")) {
    // 게이트웨이 오류는 JSON 을 요청해도 XML 로 올 수 있다. 성공 XML 은 요청하지 않으므로 읽지 않는다.
    const c = /<returnReasonCode>\s*(\d+)\s*<\/returnReasonCode>/.exec(t)?.[1] ?? /<resultCode>\s*(\d+)\s*<\/resultCode>/.exec(t)?.[1];
    const m = /<returnAuthMsg>([^<]*)</.exec(t)?.[1] ?? /<resultMsg>([^<]*)</.exec(t)?.[1] ?? "";
    if (c === undefined || normCode(c) === "0") return fail("FORMAT", "XML 응답");
    return fail(normCode(c), m);
  }
  let body;
  try {
    body = JSON.parse(t);
  } catch {
    return fail("FORMAT", "JSON 이 아님");
  }
  const gw = body?.OpenAPI_ServiceResponse?.cmmMsgHeader ?? body?.cmmMsgHeader;
  if (gw && gw.returnReasonCode !== undefined) return fail(normCode(gw.returnReasonCode), gw.returnAuthMsg ?? gw.errMsg ?? "");
  const header = body?.response?.header ?? body?.header;
  if (!header || header.resultCode === undefined) return fail("FORMAT", "결과코드 없음");
  const code = normCode(header.resultCode);
  if (code === "3") return { code: "0", message: "", items: [], totalCount: 0 };
  if (code !== "0") return fail(code, header.resultMsg ?? "");
  const b = body?.response?.body ?? body?.body;
  if (!b || typeof b !== "object") return fail("FORMAT", "성공 코드인데 body 가 없음");
  const raw = b.items && typeof b.items === "object" ? b.items.item : undefined;
  const items = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : raw && typeof raw === "object" ? [raw] : [];
  const total = Number(b.totalCount);
  return { code: "0", message: "", items, totalCount: Number.isFinite(total) ? total : items.length };
}

/** 숫자 또는 숫자 문자열("35.1694560") → 수. */
export function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v);
  return null;
}

function coord(lat, lon) {
  const la = toNumber(lat);
  const lo = toNumber(lon);
  if (la === null || lo === null) return null;
  if (la < BOUNDS.latMin || la > BOUNDS.latMax || lo < BOUNDS.lonMin || lo > BOUNDS.lonMax) return null;
  return { lat: Math.round(la * 1e6) / 1e6, lon: Math.round(lo * 1e6) / 1e6 };
}

/** 위치 행 → 차량. 좌표 없음(계룡형)·상자 밖은 버리고 센다. 같은 번호판은 첫 행만. */
export function trimVehicles(items) {
  const seen = new Set();
  const vehicles = [];
  let dropped = 0;
  for (const it of Array.isArray(items) ? items : []) {
    const no = str(it && it.vehicleno, 20);
    const c = it ? coord(it.gpslati, it.gpslong) : null;
    if (!no || !c) { dropped++; continue; }
    if (seen.has(no)) continue;
    seen.add(no);
    const ord = toNumber(it.nodeord);
    vehicles.push({ no, lat: c.lat, lon: c.lon, node: str(it.nodenm, 60) || null, ord: Number.isInteger(ord) ? ord : null });
  }
  return { vehicles, dropped };
}

/** 경유 정류소 → 순서대로. updowncd 는 원값(0·1)만 넘기고 뜻을 붙이지 않는다 — 가이드가 어느 쪽이 상행인지 말하지 않는다. */
export function trimStops(items) {
  const stops = [];
  let dropped = 0;
  for (const it of Array.isArray(items) ? items : []) {
    const id = str(it && it.nodeid, 40);
    const ord = it ? toNumber(it.nodeord) : null;
    const c = it ? coord(it.gpslati, it.gpslong) : null;
    if (!id || !Number.isInteger(ord) || ord < 1 || !c) { dropped++; continue; }
    const ud = toNumber(it.updowncd);
    stops.push({ id, name: str(it.nodenm, 60) || id, ord, lat: c.lat, lon: c.lon, up: ud === 0 || ud === 1 ? ud : null });
  }
  stops.sort((a, b) => a.ord - b.ord);
  return { stops, dropped };
}

export function describeCode(code, message) {
  switch (code) {
    case "99": return "tago: 99 세션 부족(가용한 세션 없음)";
    case "22": return "tago: 22 일일 한도 초과";
    case "30": return "tago: 30 인증키 미등록";
    case "12": return "tago: 12 서비스 없음";
    case "FORMAT": return `tago: 응답 형식을 읽지 못함 (${str(message, 60)})`;
    default: return `tago: ${str(code, 20)} ${str(message, 60)}`.trim();
  }
}

/* ------------------------------------------------------------------ */
/* 캐시 키 · 낡은 사본                                                   */
/* ------------------------------------------------------------------ */

/**
 * 캐시 키는 우리가 정규화한 값으로만 만든다. 방문자가 붙인 다른 쿼리(?x=랜덤)로 캐시를 비껴 원천을 두들길 수 없다.
 */
export function cacheKeys(requestUrl, city, route) {
  const base = new URL("/api/ktransportradar24-bus", requestUrl);
  const k = (kind) => `${base.origin}${base.pathname}?v=1&kind=${kind}&city=${city}&route=${encodeURIComponent(route)}`;
  return { fresh: k("pos"), stale: k("pos-stale"), stops: k("stops") };
}

/** 실패했을 때 줄 것. 10분 안의 직전 성공본이 있으면 stale:true 로, 없으면 ok:false. */
export function fallbackPayload(staleBody, errors, nowMs, error) {
  const usable =
    staleBody && staleBody.ok === true && Array.isArray(staleBody.vehicles) && typeof staleBody.receivedAt === "number" &&
    nowMs >= staleBody.receivedAt && nowMs - staleBody.receivedAt <= TTL_STALE * 1000;
  if (usable) {
    return { ...staleBody, stale: true, staleAge: Math.round((nowMs - staleBody.receivedAt) / 1000), errors };
  }
  return { ok: false, error, errors };
}

/* ------------------------------------------------------------------ */
/* 일일 한도 가드                                                        */
/* ------------------------------------------------------------------ */

export function kstDate(nowMs) {
  return new Date(nowMs + 9 * 3600000).toISOString().slice(0, 10).replaceAll("-", "");
}

/** op 는 오퍼레이션 이름(getRouteAcctoBusLcList 등). 한도가 오퍼레이션마다 따로다. */
export function budgetKey(op, date) {
  return `ktransportradar24:bus:remaining:${op}:${date}`;
}

export function readRemainingHeader(headers) {
  const v = headers && typeof headers.get === "function" ? headers.get("x-ratelimit-remaining") : null;
  return typeof v === "string" && /^\s*\d+\s*$/.test(v) ? Number(v) : null;
}

export function budgetDecision(min) {
  return { blocked: typeof min === "number" && min < BUDGET_FLOOR, remaining: typeof min === "number" ? min : null };
}

/**
 * 새 헤더 값을 받았을 때 KV 에 쓸지.
 *   state = { min, storedMin, wroteAt }  (storedMin: 이 isolate 가 KV 에서 읽었거나 쓴 값)
 * 더 작아졌을 때만, 지난 쓰기에서 1분이 지났거나 방금 한도 밑으로 내려갔을 때만 쓴다.
 */
export function planBudgetWrite(state, reading, nowMs) {
  const min = state.min === null || state.min === undefined ? reading : Math.min(state.min, reading);
  const stored = state.storedMin === null || state.storedMin === undefined ? null : state.storedMin;
  const improved = stored === null || min < stored;
  const crossed = min < BUDGET_FLOOR && (stored === null || stored >= BUDGET_FLOOR);
  const write = improved && (crossed || nowMs - (state.wroteAt || 0) >= BUDGET_WRITE_GAP_MS);
  return { min, write };
}

/** isolate 안의 기억. 콜로·isolate 마다 따로라 KV 가 공유 기록이다. */
const budgetMemo = new Map();
export function _resetBudgetMemo() {
  budgetMemo.clear();
}

async function loadBudget(env, op, nowMs, errors) {
  const date = kstDate(nowMs);
  let s = budgetMemo.get(op);
  if (!s || s.date !== date) {
    s = { date, min: null, storedMin: null, readAt: 0, wroteAt: 0 };
    budgetMemo.set(op, s);
  }
  if (env.SCOUT_KV && nowMs - s.readAt >= BUDGET_READ_GAP_MS) {
    s.readAt = nowMs;
    try {
      const v = await env.SCOUT_KV.get(budgetKey(op, date), "json");
      const m = v && Number.isInteger(v.min) ? v.min : null;
      if (m !== null) {
        s.storedMin = s.storedMin === null ? m : Math.min(s.storedMin, m);
        s.min = s.min === null ? m : Math.min(s.min, m);
      }
    } catch (e) {
      errors.push("budget: KV 읽기 실패 " + (e && e.name ? e.name : "unknown"));
    }
  }
  return s;
}

function recordBudget(env, op, s, reading, nowMs, waitUntil) {
  if (reading === null) return;
  const { min, write } = planBudgetWrite(s, reading, nowMs);
  s.min = min;
  if (!write || !env.SCOUT_KV) return;
  s.wroteAt = nowMs;
  s.storedMin = min;
  waitUntil(
    Promise.resolve(env.SCOUT_KV.put(budgetKey(op, s.date), JSON.stringify({ min, at: nowMs }), { expirationTtl: BUDGET_KV_EXPIRE })).catch(() => {}),
  );
}

/* ------------------------------------------------------------------ */
/* 원천 호출                                                            */
/* ------------------------------------------------------------------ */

/** 키는 인코딩본(%XX)이면 그대로, 원본이면 한 번만 인코딩해 붙인다. URLSearchParams 에 넣으면 다시 인코딩된다. */
export function keyForQuery(raw) {
  const k = String(raw || "").trim();
  return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k);
}

export function tagoUrl(op, key, params) {
  const q = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  return `${TAGO}/${op}?serviceKey=${keyForQuery(key)}&_type=json&${q}`;
}

/** errors 에서 키 문자열(인코딩본·원본)을 지운다. */
export function redact(text, key) {
  let out = String(text);
  const k = String(key || "").trim();
  if (k.length < 8) return out;
  const forms = new Set([k, keyForQuery(k)]);
  try { forms.add(decodeURIComponent(k)); } catch { /* 원본이다 */ }
  for (const f of forms) if (f.length >= 8) out = out.split(f).join("<KEY>");
  return out;
}

async function callTago(doFetch, op, key, params) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await doFetch(tagoUrl(op, key, params), { headers: { accept: "application/json", "user-agent": UA }, signal: ctl.signal });
    const remaining = readRemainingHeader(r.headers);
    const env = readEnvelope(await r.text());
    // 403 본문에 게이트웨이 30 이 실려 왔다 — 본문 코드가 있으면 그것을, 없으면 HTTP 상태를 말한다.
    if (env.code === "FORMAT" && !r.ok) return { remaining, env: { ...env, code: `HTTP_${r.status}`, message: "" } };
    return { remaining, env };
  } catch (e) {
    // ⚠️ 오류 원문에 URL(=키)이 섞일 수 있다. 이름만.
    return { remaining: null, env: { code: "NETWORK", message: e && e.name ? e.name : "unknown", items: [], totalCount: 0 } };
  } finally {
    clearTimeout(timer);
  }
}

const opName = (op) => op.split("/")[1];

function reply(payload, status, cacheControl) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cacheControl },
  });
}

/* ------------------------------------------------------------------ */
/* 처리                                                                 */
/* ------------------------------------------------------------------ */

/**
 * deps: { cache, fetch?, now? } — 배포에서는 caches.default·전역 fetch. 로컬 확인·회귀는 흉내 객체를 넣는다.
 */
export async function handleGet(context, deps) {
  const env = (context && context.env) || {};
  const cache = deps.cache;
  const doFetch = deps.fetch || fetch;
  const now = deps.now || Date.now;
  const waitUntil = (p) => (context && typeof context.waitUntil === "function" ? context.waitUntil(p) : p);

  const q = parseQuery(new URL(context.request.url));
  if (!q.ok) return reply({ ok: false, error: q.error }, 400, "no-store");
  const keys = cacheKeys(context.request.url, q.city, q.route);
  const hitKey = q.stops ? keys.stops : keys.fresh;
  const hit = await cache.match(hitKey);
  if (hit) return hit;

  const key = typeof env.DATA_GO_KR_SERVICE_KEY === "string" ? env.DATA_GO_KR_SERVICE_KEY.trim() : "";
  const errors = [];
  const op = q.stops ? OPS.stops : OPS.positions;
  const name = opName(op);
  let blocked = false;
  let payload = null;
  let ttl = 0;

  if (!key) {
    errors.push("config: DATA_GO_KR_SERVICE_KEY 없음 — Pages 시크릿을 넣어야 합니다");
  } else {
    const s = await loadBudget(env, name, now(), errors);
    const d = budgetDecision(s.min);
    if (d.blocked) {
      blocked = true;
      errors.push(`budget: ${name} 오늘 남은 한도 ${d.remaining} < ${BUDGET_FLOOR} — 원천을 부르지 않음`);
    } else if (!q.stops) {
      const r = await callTago(doFetch, op, key, { cityCode: q.city, routeId: q.route, numOfRows: POS_ROWS, pageNo: 1 });
      recordBudget(env, name, s, r.remaining, now(), waitUntil);
      if (r.env.code === "0") {
        const { vehicles, dropped } = trimVehicles(r.env.items);
        payload = { ok: true, city: q.city, route: q.route, basis: basisOf(q.city), receivedAt: now(), vehicles, ...(dropped ? { dropped } : {}) };
        ttl = TTL_POS;
      } else {
        errors.push(describeCode(r.env.code, r.env.message));
      }
    } else {
      const items = [];
      let total = 0;
      for (let page = 1; page <= STOP_MAX_PAGES; page++) {
        const r = await callTago(doFetch, op, key, { cityCode: q.city, routeId: q.route, numOfRows: STOP_ROWS, pageNo: page });
        recordBudget(env, name, s, r.remaining, now(), waitUntil);
        if (r.env.code !== "0") { errors.push(describeCode(r.env.code, r.env.message)); break; }
        items.push(...r.env.items);
        total = r.env.totalCount;
        if (items.length >= total || r.env.items.length === 0) break;
      }
      if (!errors.length && items.length < total) errors.push(`tago: 정류소 ${total}곳 중 ${items.length}곳만 받음(쪽 넘김 ${STOP_MAX_PAGES}쪽 초과)`);
      if (!errors.length) {
        const { stops, dropped } = trimStops(items);
        payload = { ok: true, city: q.city, route: q.route, basis: basisOf(q.city), receivedAt: now(), stops, ...(dropped ? { dropped } : {}) };
        ttl = stops.length ? TTL_STOPS : TTL_STOPS_EMPTY;
      }
    }
  }

  if (payload) {
    const res = reply(payload, 200, `public, max-age=${ttl}`);
    waitUntil(cache.put(hitKey, res.clone()));
    if (!q.stops) waitUntil(cache.put(keys.stale, reply(payload, 200, `public, max-age=${TTL_STALE}`)));
    return res;
  }

  const clean = errors.map((e) => redact(e, key));
  let out;
  if (q.stops) {
    out = { ok: false, error: blocked ? BUDGET_ERROR : "정류소 목록을 받지 못했습니다", errors: clean };
  } else {
    let staleBody = null;
    try {
      const s = await cache.match(keys.stale);
      staleBody = s ? await s.json() : null;
    } catch {
      staleBody = null;
    }
    out = fallbackPayload(staleBody, clean, now(), blocked ? BUDGET_ERROR : "버스 위치를 받지 못했습니다");
  }
  const res = reply(out, 200, `public, max-age=${TTL_FAIL}`);
  waitUntil(cache.put(hitKey, res.clone()));
  return res;
}

export async function onRequestGet(context) {
  return handleGet(context, { cache: caches.default });
}
