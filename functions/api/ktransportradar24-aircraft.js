/* K-TransportRadar24 항공기 중계 (v0.9.318)
 *
 *  GET  /api/ktransportradar24-aircraft   (공개)
 *       → { ok, source, via, now(ms), receivedAt(ms), count, hidden, aircraft:[{hex,flight,type,reg,lat,lon,alt,gs,track,seen}] }
 *       실패 시 200 { ok:false, error, errors:["collector: …","adsb.lol: …","adsb.fi: …"] }
 *  POST /api/ktransportradar24-aircraft   (맥미니 수집기 전용 · Authorization: Bearer <KTR24_AIRCRAFT_INGEST_TOKEN>)
 *       body { source, now, ac:[readsb 필드] } → 정리본을 KV 에 둔다 → { ok, count, hidden }
 *
 * 키 없는 무료 원천만 쓴다(2026-09-15 지미 지시). 그래서 이렇게 생겼다.
 *  - adsb.lol·adsb.fi 는 키 없이 무료지만 CORS 헤더가 없어 방문자 브라우저가 직접 못 부른다(2026-09-15 실측).
 *  - 엣지에서 부르면 adsb.lol 429(Workers 공유 IP)·adsb.fi 403(봇 차단)이다(2026-09-14 실측). 봇 차단을 위장으로 뚫지 않는다.
 *  - 그래서 맥미니 수집기(K-TrainRader24 저장소 collector/aircraft.ts)가 가정 회선으로 15초마다 받아 POST 하고,
 *    이 함수는 KV 에서 꺼내 준다. 저장본이 낡았을 때만 원천을 직접 시도한다(엣지에선 대개 실패 — 이유를 errors 에 담는다).
 *  - OpenSky 등록 경로(자격증명)는 지웠다(v0.9.316 에 있던 것).
 *
 * ⚠️ LADD(dbFlags&8)·PIA(dbFlags&4) 기체는 **받을 때 여기서** 버린다. 저장본·응답 어디에도 남지 않는다.
 * ⚠️ 지상 기체·60초 넘게 낡은 위치·지도 상자 밖은 뺀다. 낡은 위치를 지금 위치처럼 그리면 열차 추정보다 나쁜 거짓이다.
 * ⚠️ 수집 토큰은 바깥 API 키가 아니라 우리 수집기를 알아보는 공유 비밀이다. 설정이 없으면 아무도 못 올린다.
 * ⚠️ 실패 응답도 30초 캐시한다. 수집기가 멎은 동안 방문자마다 막힌 원천을 두들기지 않게.
 * ⚠️ KV 읽기는 콜로마다 최대 약 60초 늦을 수 있다. 화면은 now(수신 시각)로 나이를 말한다.
 * ⚠️ 5xx 는 커스텀 도메인에서 Cloudflare 가 본문을 자기 오류 페이지로 덮는다 → GET 실패도 200 ok:false (2026-09-14 실측).
 * ⚠️ KV 쓰기는 15초마다 하루 5,760회 — Workers Paid 포함량(월 100만) 안이다. 간격을 줄이면 다시 계산할 것.
 *
 * 데이터: adsb.lol · adsb.fi (ODbL 1.0). 화면에 출처를 표기한다.
 */
import { json } from "./_lib.js";

export const KV_KEY = "ktransportradar24:aircraft:v1";
export const SOURCES = [
  { name: "adsb.lol", url: "https://api.adsb.lol/v2/lat/36/lon/128/dist/250", list: "ac" },
  { name: "adsb.fi", url: "https://opendata.adsb.fi/api/v2/lat/36/lon/128/dist/250", list: "aircraft" },
];
const TTL = 10;
const TTL_FAIL = 30;
/** 이보다 오래 새 저장본이 없으면 수집기가 멎은 것으로 본다. 수집 15초 + KV 전파 60초 + 여유. */
export const FRESH_SEC = 90;
const KV_EXPIRE = 600;
const MAX_BODY = 2_000_000;
const MAX_SEEN_POS = 60;
// 레이더 지도의 KOREA_BOUNDS 와 같은 상자. 지도가 이 밖으로 못 나가므로 밖의 기체는 보낼 이유가 없다.
export const BOUNDS = { latMin: 32.0, latMax: 39.6, lonMin: 123.5, lonMax: 132.0 };

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
const msg = (e) => String(e && e.message ? e.message : e).slice(0, 160);

/*
 * 경로(v0.9.319): 수집기가 adsb.im routeset 에서 받아 붙인 {codes, countries, names}.
 * 바깥에서 온 값이다 — 모양이 하나라도 어긋나면 통째로 버린다(틀린 목적지를 보여 주느니 모른다고 한다).
 */
const CODE = /^[A-Z0-9]{3,4}$/;
const ISO2 = /^[A-Z]{2}$/;
export function cleanRoute(r) {
  if (!r || !Array.isArray(r.codes) || !Array.isArray(r.countries) || !Array.isArray(r.names)) return null;
  const n = r.codes.length;
  if (n < 2 || n > 6 || r.countries.length !== n || r.names.length !== n) return null;
  if (!r.codes.every((c) => typeof c === "string" && CODE.test(c))) return null;
  if (!r.countries.every((c) => typeof c === "string" && ISO2.test(c))) return null;
  return { codes: [...r.codes], countries: [...r.countries], names: r.names.map((x) => str(x, 40)) };
}

export function trimAircraft(raw, nowMs = Date.now()) {
  const list = raw && Array.isArray(raw.ac) ? raw.ac : raw && Array.isArray(raw.aircraft) ? raw.aircraft : [];
  const aircraft = [];
  let hidden = 0;
  for (const a of list) {
    if (!a || num(a.lat) === null || num(a.lon) === null) continue;
    if ((a.dbFlags | 0) & 12) { hidden++; continue; }
    if (a.alt_baro === "ground") continue;
    if (a.lat < BOUNDS.latMin || a.lat > BOUNDS.latMax || a.lon < BOUNDS.lonMin || a.lon > BOUNDS.lonMax) continue;
    const seen = num(a.seen_pos) ?? 0;
    if (seen > MAX_SEEN_POS) continue;
    const route = cleanRoute(a.route);
    aircraft.push({
      hex: str(a.hex, 6), flight: str(a.flight, 8).trim(), type: str(a.t, 4), desc: str(a.desc, 40), reg: str(a.r, 10),
      lat: Math.round(a.lat * 1e5) / 1e5, lon: Math.round(a.lon * 1e5) / 1e5,
      alt: num(a.alt_baro), gs: num(a.gs), track: num(a.track), seen: Math.round(seen),
      ...(route ? { route } : {}),
    });
  }
  // adsb.lol 의 now 는 밀리초, adsb.fi 는 초다.
  let now = num(raw && raw.now) ?? nowMs;
  if (now < 1e12) now *= 1000;
  return { now, count: aircraft.length, hidden, aircraft };
}

/** Authorization 헤더가 수집 토큰과 같은지. 토큰이 설정 안 됐거나 짧으면 아무도 통과시키지 않는다. 비교는 끝까지 돈다. */
export function tokenMatches(header, secret) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const m = /^Bearer (\S+)$/.exec(String(header || ""));
  if (!m) return false;
  const enc = new TextEncoder();
  const a = enc.encode(m[1]);
  const b = enc.encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** 수집기가 올린 몸통 → 저장본. 모양이 어긋나면 null. 받은 시각은 서버 시계로 찍는다 — 수집기 시계를 믿지 않는다. */
export function ingestBody(body, nowMs = Date.now()) {
  if (!body || typeof body !== "object" || !Array.isArray(body.ac)) return null;
  const source = typeof body.source === "string" && /^[a-z0-9.-]{1,20}$/i.test(body.source) ? body.source : "unknown";
  const trimmed = trimAircraft({ now: body.now, ac: body.ac }, nowMs);
  if (trimmed.now > nowMs + 60000) trimmed.now = nowMs;
  return { source, receivedAt: nowMs, ...trimmed };
}

/** 저장본의 나이(초)와 쓸 만한지. 나이는 받은 시각 기준이다 — 기체 위치 시각(now)이 아니다. */
export function freshness(stored, nowMs = Date.now()) {
  if (!stored || typeof stored.receivedAt !== "number" || !Array.isArray(stored.aircraft)) return { fresh: false, age: null };
  const age = Math.max(0, Math.round((nowMs - stored.receivedAt) / 1000));
  return { fresh: age <= FRESH_SEC, age };
}

export async function onRequestPost({ request, env }) {
  if (!tokenMatches(request.headers.get("authorization"), env && env.KTR24_AIRCRAFT_INGEST_TOKEN)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.SCOUT_KV) return json({ ok: false, error: "KV 바인딩 없음" }, 500);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ ok: false, error: "too large" }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ ok: false, error: "too large" }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const stored = ingestBody(body, Date.now());
  if (!stored) return json({ ok: false, error: "ac 목록 없음" }, 400);
  await env.SCOUT_KV.put(KV_KEY, JSON.stringify(stored), { expirationTtl: KV_EXPIRE });
  return json({ ok: true, count: stored.count, hidden: stored.hidden });
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/ktransportradar24-aircraft", context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const env = context.env || {};
  const errors = [];
  let body = null;

  let stored = null;
  try {
    stored = env.SCOUT_KV ? await env.SCOUT_KV.get(KV_KEY, "json") : null;
  } catch (e) {
    errors.push("collector: KV 읽기 실패 " + msg(e));
  }
  const { fresh, age } = freshness(stored, Date.now());
  if (fresh) {
    body = { ok: true, source: stored.source, via: "collector", now: stored.now, receivedAt: stored.receivedAt, count: stored.count, hidden: stored.hidden, aircraft: stored.aircraft };
  } else {
    errors.push(age === null ? "collector: 수신 기록 없음 — 맥미니 수집기를 확인" : `collector: 마지막 수신 ${age}초 전 — 맥미니 수집기를 확인`);
  }

  if (!body) {
    const UA = "K-TransportRadar24/0.7 (+https://scoutingapp.net/ktransportradar24)";
    for (const src of SOURCES) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(src.url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ctl.signal });
        if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 80).replace(/\s+/g, " "));
        const raw = await r.json();
        if (!Array.isArray(raw && raw[src.list])) throw new Error("응답에 " + src.list + " 목록이 없음");
        body = { ok: true, source: src.name, via: "edge", receivedAt: Date.now(), ...trimAircraft(raw) };
        break;
      } catch (e) {
        errors.push(src.name + ": " + msg(e));
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const payload = body || { ok: false, error: "항공기 자료를 받지 못했습니다", errors };
  const res = new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${body ? TTL : TTL_FAIL}` },
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}
