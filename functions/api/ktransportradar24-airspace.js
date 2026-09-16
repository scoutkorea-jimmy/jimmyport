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
/** 원천에 우리를 밝힌다. 시내버스 중계도 같은 꼴을 쓴다 — 이름 없는 요청을 막는 원서버가 있다. */
const UA = "K-TransportRadar24/0.9 (+https://scoutingapp.net/ktransportradar24)";

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

/**
 * 설정 응답(키가 실린다).
 * ⚠️ **절대 담아 두지 않는다** — 엣지 캐시에 키가 남으면 시크릿을 갈아도 한동안 옛 키가 돌아다닌다.
 */
function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

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
  const { request, env } = context;
  /*
   * ⚠️ **`waitUntil` 은 구조 분해해서 부르면 안 된다.** `context` 에서 떼어 내면 `this` 가 끊겨
   *    Workers 가 `Illegal invocation` 을 던진다. 이 저장소에서 잘 도는 두 중계가 그 답을 갖고 있다 —
   *    시내버스는 이 래퍼를, 항공기는 `context.waitUntil(...)` 직접 호출을 쓴다.
   *    없는 환경(로컬 확인·회귀)에서는 약속을 그대로 돌려줘 `await` 가 완료를 기다리게 한다.
   */
  const waitUntil = (p) => (context && typeof context.waitUntil === "function" ? context.waitUntil(p) : p);
  const cache = deps.cache;
  const doFetch = deps.fetch ?? fetch;

  const p = parseQuery(request.url);
  if (p.error) return fail(p.error, 400, TTL_FAIL);

  const key = (env && env.VWORLD_API_KEY ? String(env.VWORLD_API_KEY) : "").trim();
  if (!key) return fail("config: VWORLD_API_KEY 없음", 502, TTL_FAIL);

  const hitKey = cacheKeyFor(new URL(request.url).origin, p);
  // 캐시는 있으면 좋은 것이지 없으면 안 되는 것이 아니다 — 여기서 던져도 그림은 준다.
  let hit = null;
  try {
    hit = await cache.match(hitKey);
  } catch {
    hit = null;
  }
  if (hit) return hit;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  let res;
  try {
    // 원천에 우리를 밝힌다(시내버스 중계와 같은 꼴). 이름 없는 요청을 막는 원서버가 있다.
    res = await doFetch(sourceUrl(p, key), {
      headers: { "user-agent": UA, accept: "image/png,image/*;q=0.8,*/*;q=0.5" },
      signal: abort.signal,
    });
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

  /*
   * ⚠️ **본문을 통째로 읽는다 — 원천 스트림을 그대로 넘기지 않는다.**
   *    처음엔 `new Response(res.body)` 를 만들고 `clone()` 으로 캐시에 넣었다. 그러면 스트림이 둘로 갈라지고(tee),
   *    캐시 쪽이 늦거나 막히면 **방문자에게 가는 쪽까지 끊긴다.**
   *    2026-09-16 라이브에서 성공 경로만 본문 없는 502(`error code: 502` · server: cloudflare)가 났고,
   *    `onRequestGet` 전체를 try/catch 로 감쌌는데도 **안 잡혔다** — JS 예외가 아니라 런타임이 응답을 중단시킨 것이다.
   *    타일은 최대 수십 KB라 통째로 읽어도 가볍고, 그러면 캐시본과 응답본이 서로 아무 관계도 없는 두 덩어리가 된다.
   */
  let body;
  try {
    body = await res.arrayBuffer();
  } catch (e) {
    return fail("원천 본문을 읽지 못했습니다: " + (e && e.name ? e.name : "unknown"), 502, TTL_FAIL);
  }
  const headers = { "content-type": "image/png", "cache-control": `public, max-age=${TTL_OK}` };
  try {
    const forCache = new Response(body, { status: 200, headers });
    // 배포에서는 waitUntil 이 즉시 undefined 를 돌려주고, 흉내에서는 약속이 그대로 와 await 가 기다린다.
    await waitUntil(cache.put(hitKey, forCache));
  } catch {
    // 담지 못해도 그림은 나간다. 다음 요청이 원천을 한 번 더 부를 뿐이다.
  }
  return new Response(body, { status: 200, headers });
}

/** 진단 응답 — 사람이 읽을 텍스트. 담아 두지 않는다(지금 무엇이 도는지를 묻는 것이다). */
const diag = (text) =>
  new Response(text, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

/**
 * 이 파일의 판 번호. **배포가 실제로 반영됐는지**를 재는 유일한 방법이라 고칠 때마다 올린다.
 * 2026-09-16: 라이브가 본문 없는 502 를 주는데 내 오류 문구는 하나도 안 나와,
 * 배포된 코드가 내가 고친 코드인지부터 확인해야 했다.
 */
export const BUILD = "v5";

export async function onRequestGet(context) {
  try {
    const u = new URL(context.request.url);
    const d = u.searchParams.get("diag");
    /*
     * 키 배급 — 화면이 V-World 를 **직접** 부르기 위해 받아 간다.
     *
     * 2026-09-16 측정으로 중계 경유가 막혔다(Cloudflare 엣지에서 `api.vworld.kr` 이 8번 중 8번 502/520).
     * 지미가 "키를 넣고 브라우저가 직접" 으로 정했다 — V-World 가 공식 안내하는 사용법이기도 하다.
     *
     * ⚠️ **그래도 번들에는 박지 않는다.** 배포 저장소(jimmyport)가 **공개**라 번들이 커밋되면
     *    GitHub 코드 검색으로 자동 수집되고, 키를 바꿔도 이력에서 사라지지 않는다.
     *    여기서 내주면 시크릿만 갈면 되고 재빌드도 필요 없다 — 노출 수준은 같고 뒷정리만 쉬워진다.
     * ⚠️ **같은 곳에서 온 요청에만 준다.** Referer 는 위조되니 완전한 방어가 아니다 — 긁어 가는 봇을 막는 빗장이다.
     */
    if (u.searchParams.get("config") === "1") {
      const key = String((context.env && context.env.VWORLD_API_KEY) || "").trim();
      if (!key) return json({ ok: false, error: "config: VWORLD_API_KEY 없음" });
      const ref = context.request.headers.get("referer") || "";
      if (ref && !ref.startsWith(DOMAIN)) return json({ ok: false, error: "다른 곳에서 온 요청입니다" });
      return json({ ok: true, wms: VWORLD_WMS, key, domain: DOMAIN, layers: LAYERS });
    }
    if (d === "1") {
      // 어느 판이 도는가 · 시크릿이 함수에 닿는가(값은 절대 싣지 않는다 — 길이도 안 싣는다).
      const has = !!(context.env && String(context.env.VWORLD_API_KEY ?? "").trim());
      return diag("airspace relay " + BUILD + " · key=" + (has ? "있음" : "없음"));
    }
    if (d === "2" || d === "3") {
      /*
       * 캐시도 스트림도 쓰지 않고 **원천 fetch 만** 잰다. 2026-09-16 실측에서 여기가 `원천 520` 이었다 —
       * 내 맥에서는 같은 요청이 200·PNG 인데 Cloudflare 엣지에서만 막힌다.
       * `diag=2` 는 헤더 없이, `diag=3` 은 우리를 밝히고(UA·Accept) 불러 **둘을 견준다**.
       */
      const key = String((context.env && context.env.VWORLD_API_KEY) || "").trim();
      if (!key) return diag(BUILD + " · 키가 없어 원천을 못 부른다");
      const probe = { layers: "lt_c_aisprhc", bbox: "14100000,4500000,14200000,4600000", width: 256, height: 256, transparent: true, styles: "" };
      const init = d === "3" ? { headers: { "user-agent": UA, accept: "image/png,image/*;q=0.8,*/*;q=0.5" } } : {};
      try {
        const r = await fetch(sourceUrl(probe, key), init);
        const buf = await r.arrayBuffer();
        // 본문 앞머리를 보여 준다 — 어느 계층이 낸 오류인지는 그 글자에 있다. 키가 섞여 오면 지운다.
        const head = new TextDecoder().decode(buf.slice(0, 160)).replace(/\s+/g, " ").trim();
        return diag(
          BUILD + " · " + (d === "3" ? "우리를 밝힘" : "헤더 없음") + " · 원천 " + r.status +
          " · " + (r.headers.get("content-type") || "?") + " · " + buf.byteLength + "B · " + head.split(key).join("«KEY»"),
        );
      } catch (e) {
        // 오류 원문은 URL(=키)을 담을 수 있다. 이름만.
        return diag(BUILD + " · 원천 오류 " + (e && e.name ? e.name : "unknown"));
      }
    }
    return await handleGet(context, { cache: caches.default });
  } catch (e) {
    /*
     * ⚠️ 여기서 안 잡으면 **Cloudflare 가 본문 없는 502(`error code: 502`)로 덮어** 까닭이 통째로 사라진다.
     *    2026-09-16 첫 배포에서 실제로 그랬다 — 입력 오류(400)는 내 문구가 나오는데 성공 경로만 남의 502 였다.
     *    오류 원문은 URL(=키)을 담을 수 있으므로 **이름만** 싣는다.
     */
    return fail("중계 오류: " + (e && e.name ? e.name : "unknown"), 502, TTL_FAIL);
  }
}
