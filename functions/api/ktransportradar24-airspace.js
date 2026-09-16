/* K-TransportRadar24 항공정보도(공역 경계) 중계 — V-World WMS (2026-09-16 첫판)
 *
 *  GET /api/ktransportradar24-airspace?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0
 *      &LAYERS=lt_c_aisprhc,lt_c_aisctrc,…&CRS=EPSG:3857&BBOX=minx,miny,maxx,maxy
 *      &WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true
 *      → image/png (성공) · 502 (원천 실패·설정 없음) · 400 (입력이 규칙 밖)
 *
 * Leaflet 의 L.tileLayer.wms 가 만드는 쿼리를 그대로 받는다. 그래서 화면 쪽에 특별한 코드가 없다.
 *
 * 왜 중계인가. V-World 는 인증키를 **쿼리로** 받고, 도메인 제한도 Referer 검증이 아니라 `DOMAIN` **파라미터**다
 * (2026-09-16 실측: 정상 키라도 DOMAIN 없으면 INCORRECT_KEY, 가짜 키는 INVALID_KEY).
 * 즉 키를 번들에 박으면 누구든 같은 DOMAIN 문자열을 붙여 우리 키로 제 한도를 태울 수 있다.
 * ⚠️ **V-World 는 WMS/WFS 일일 한도를 공개하지 않는다**(OVER_REQUEST_LIMIT 오류코드만 있다).
 *    피해 크기를 계산할 수 없는 위험은 지지 않는다 — 그래서 키는 여기에만 둔다.
 *
 * 저장에 관하여. V-World 레퍼런스에 "별도의 저장장치나 데이터베이스에 저장할 수 없습니다" 가 있고
 * WMS 에도 같은 조건인지는 **약관 원문 미확인**이다(웹방화벽에 4회 막혔다 · 1661-0115 · vworld@spacen.or.kr).
 * 그래서 **굽지 않는다.** 여기 캐시는 굽기가 아니라 전송 캐시이고, 그마저 1시간으로 짧게 둔다 —
 * 공역 도면은 몇 달에 한 번 바뀌므로 더 길게 두면 효율은 조금 오르고 '저장'에는 가까워진다.
 *
 * 한도를 아끼는 장치는 캐시 하나뿐이다. 타일은 (레이어 조합, BBOX, 크기)가 같으면 같은 그림이라
 * 방문자가 몇 명이든 그 조합마다 1시간에 한 번만 원천을 부른다.
 *
 * ⚠️ 인증키(env.VWORLD_API_KEY, Pages 시크릿)는 응답·오류·로그 어디에도 싣지 않는다.
 *    fetch 오류 원문은 URL(=키)을 담을 수 있어 **오류 이름만** 남긴다.
 *
 * 배포
 *  1. relay/ktransportradar24-airspace.js → jimmyport/functions/api/ktransportradar24-airspace.js
 *  2. npx wrangler pages secret put VWORLD_API_KEY --project-name jimmyport
 *     (값은 K-TrainRader24/.env 의 VWORLD_API_KEY) — 시크릿은 그 뒤 배포부터 보인다.
 *  3. 확인: /api/ktransportradar24-airspace?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=lt_c_aisprhc
 *          &CRS=EPSG:3857&BBOX=14100000,4500000,14200000,4600000&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true
 *          → 200 image/png
 *
 * 데이터: 국토교통부 V-World (공공누리 제1유형). 화면에 출처를 표기한다.
 */

export const VWORLD_WMS = "https://api.vworld.kr/req/wms";

/** 등록 도메인. V-World 는 이 값을 **파라미터로** 받는다(Referer 를 보지 않는다). */
export const DOMAIN = "https://scoutingapp.net";

/**
 * 띄우는 도면만 받는다. ⚠️ `web/src/legend.ts` 의 `AIRSPACE_LAYERS` 와 같은 목록이어야 한다 —
 * 저쪽은 이 파일을 못 읽으므로 한쪽만 고치면 화면은 요청하는데 여기서 400 이 난다.
 */
export const LAYERS = Object.freeze([
  "lt_c_aisprhc", // 비행금지구역
  "lt_c_aisctrc", // 관제권
  "lt_c_aisadzc", // 방공식별구역
  "lt_c_aisfirc", // 비행정보구역
]);
const LAYER_SET = new Set(LAYERS);

/** V-World 는 요청당 레이어 4개까지 받는다(2.0 문서). */
export const MAX_LAYERS = 4;

/** 웹 메르카토르(EPSG:3857) 기준 한국 둘레 — 한참 벗어난 요청은 우리 화면이 낸 것이 아니다. */
export const BOUNDS_3857 = Object.freeze({ xMin: 13_000_000, xMax: 15_400_000, yMin: 3_200_000, yMax: 5_400_000 });

export const MAX_SIDE = 512;
export const TTL_OK = 3600;
/** 실패는 짧게 — 방문자마다 원천을 다시 두들기지 않으면서, 곧 나을 장애를 오래 붙들지 않는다. */
export const TTL_FAIL = 30;
const TIMEOUT_MS = 8000;

/* ------------------------------------------------------------------ */
/* 입력                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Leaflet 이 만든 WMS 쿼리를 검사해 원천에 보낼 파라미터로 바꾼다.
 * 규칙 밖이면 { error } — 지어내서 통과시키지 않는다.
 */
export function parseQuery(url) {
  const u = typeof url === "string" ? new URL(url) : url;
  // WMS 파라미터 이름은 대소문자를 가리지 않는다. 대문자로 모아 본다.
  const q = new Map();
  for (const [k, v] of u.searchParams) q.set(k.toUpperCase(), v);

  if ((q.get("SERVICE") ?? "WMS").toUpperCase() !== "WMS") return { error: "SERVICE 는 WMS 여야 합니다" };
  if ((q.get("REQUEST") ?? "GetMap") !== "GetMap") return { error: "REQUEST 는 GetMap 만 받습니다" };

  const layersRaw = (q.get("LAYERS") ?? "").trim();
  if (!layersRaw) return { error: "LAYERS 가 없습니다" };
  const layers = layersRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (layers.length === 0 || layers.length > MAX_LAYERS) return { error: "LAYERS 는 1~" + MAX_LAYERS + "개여야 합니다" };
  for (const l of layers) if (!LAYER_SET.has(l)) return { error: "받지 않는 도면입니다: " + l };

  const crs = (q.get("CRS") ?? q.get("SRS") ?? "").toUpperCase();
  if (crs !== "EPSG:3857") return { error: "CRS 는 EPSG:3857 만 받습니다" };

  const bboxRaw = (q.get("BBOX") ?? "").split(",").map((s) => Number(s.trim()));
  if (bboxRaw.length !== 4 || bboxRaw.some((n) => !Number.isFinite(n))) return { error: "BBOX 가 숫자 넷이 아닙니다" };
  const [minx, miny, maxx, maxy] = bboxRaw;
  if (!(minx < maxx && miny < maxy)) return { error: "BBOX 의 최소가 최대보다 큽니다" };
  const B = BOUNDS_3857;
  if (maxx < B.xMin || minx > B.xMax || maxy < B.yMin || miny > B.yMax) return { error: "한국 밖 BBOX 입니다" };

  const width = Number(q.get("WIDTH"));
  const height = Number(q.get("HEIGHT"));
  if (!Number.isInteger(width) || !Number.isInteger(height)) return { error: "WIDTH·HEIGHT 가 정수가 아닙니다" };
  if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE) return { error: "WIDTH·HEIGHT 는 1~" + MAX_SIDE + " 입니다" };

  const format = (q.get("FORMAT") ?? "image/png").toLowerCase();
  if (format !== "image/png") return { error: "FORMAT 은 image/png 만 받습니다" };

  return {
    layers: layers.join(","),
    bbox: [minx, miny, maxx, maxy].join(","),
    width,
    height,
    transparent: (q.get("TRANSPARENT") ?? "true").toLowerCase() !== "false",
    styles: q.get("STYLES") ?? "",
  };
}

/** 원천 주소. 키는 부르는 자리에서만 붙고 어디에도 남지 않는다. */
export function sourceUrl(p, key) {
  const u = new URL(VWORLD_WMS);
  u.searchParams.set("SERVICE", "WMS");
  u.searchParams.set("REQUEST", "GetMap");
  u.searchParams.set("VERSION", "1.3.0");
  u.searchParams.set("LAYERS", p.layers);
  u.searchParams.set("STYLES", p.styles);
  u.searchParams.set("CRS", "EPSG:3857");
  u.searchParams.set("BBOX", p.bbox);
  u.searchParams.set("WIDTH", String(p.width));
  u.searchParams.set("HEIGHT", String(p.height));
  u.searchParams.set("FORMAT", "image/png");
  u.searchParams.set("TRANSPARENT", p.transparent ? "true" : "false");
  u.searchParams.set("DOMAIN", DOMAIN);
  u.searchParams.set("KEY", key);
  return u.toString();
}

/** 캐시 열쇠 — 그림을 정하는 값만 담는다. 키·DOMAIN 은 들어가지 않는다. */
export function cacheKeyFor(origin, p) {
  const u = new URL("/api/ktransportradar24-airspace", origin);
  u.searchParams.set("l", p.layers);
  u.searchParams.set("b", p.bbox);
  u.searchParams.set("w", String(p.width));
  u.searchParams.set("h", String(p.height));
  u.searchParams.set("t", p.transparent ? "1" : "0");
  return new Request(u.toString(), { method: "GET" });
}

/* ------------------------------------------------------------------ */
/* 처리                                                                 */
/* ------------------------------------------------------------------ */

function fail(message, status, ttl) {
  // 타일 자리라 본문을 읽는 사람은 없다. 그래도 사람이 직접 열어 볼 때를 위해 까닭을 남긴다.
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": `public, max-age=${ttl}` },
  });
}

/**
 * deps: { cache, fetch?, now? } — 배포에서는 caches.default·전역 fetch. 로컬 확인·회귀는 흉내 객체를 넣는다.
 */
export async function handleGet(context, deps) {
  const { request, env, waitUntil } = context;
  const cache = deps.cache;
  const doFetch = deps.fetch ?? fetch;

  const p = parseQuery(request.url);
  if (p.error) return fail(p.error, 400, TTL_FAIL);

  const key = (env && env.VWORLD_API_KEY ? String(env.VWORLD_API_KEY) : "").trim();
  if (!key) return fail("config: VWORLD_API_KEY 없음", 502, TTL_FAIL);

  const hitKey = cacheKeyFor(new URL(request.url).origin, p);
  const hit = await cache.match(hitKey);
  if (hit) return hit;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await doFetch(sourceUrl(p, key), { signal: abort.signal });
  } catch (e) {
    // ⚠️ 오류 원문에 URL(=키)이 섞일 수 있다. 이름만 남긴다.
    return fail("원천 오류: " + (e && e.name ? e.name : "unknown"), 502, TTL_FAIL);
  } finally {
    clearTimeout(timer);
  }

  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  // V-World 는 실패도 HTTP 200 으로 주고 본문만 XML(ServiceExceptionReport)이다 — 형식으로 가른다.
  if (!res.ok || !type.startsWith("image/")) {
    return fail("원천이 그림을 주지 않았습니다", 502, TTL_FAIL);
  }

  const out = new Response(res.body, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": `public, max-age=${TTL_OK}`,
    },
  });
  if (waitUntil) waitUntil(cache.put(hitKey, out.clone()));
  else await cache.put(hitKey, out.clone());
  return out;
}

export async function onRequestGet(context) {
  return handleGet(context, { cache: caches.default });
}
