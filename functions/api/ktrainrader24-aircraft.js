/* K-TrainRadar24 항공기 중계 (v0.9.313)
 *
 *  GET /api/ktrainrader24-aircraft   (공개) → { ok, source, now(ms), count, hidden, aircraft:[{hex,flight,type,reg,lat,lon,alt,gs,track,seen}] }
 *                                              실패 시 200 { ok:false, error, errors:["adsb.lol: …","adsb.fi: …"] }
 *
 * 왜 중계하나. adsb.lol 은 CORS 헤더를 주지 않아 브라우저가 직접 부를 수 없다(실측 2026-09-14).
 * OpenSky 는 자기 도메인에만 허용하고 익명 하루 400회라 방문자 브라우저에 맡길 수 없다.
 *
 * ⚠️ 엣지 캐시 15초. 방문자가 몇이든 원본 호출은 콜로당 15초 1회다. adsb.lol 은 키 없는 무료
 *    공개 API 라 방문자 수만큼 두들기면 막힌다. 실패 응답은 캐시하지 않는다.
 * ⚠️ LADD(dbFlags&8)·PIA(dbFlags&4) 기체는 **여기서** 버린다. 소유자가 추적 비공개를 요청한 기체다.
 *    브라우저로 보내고 화면에서 숨기면 응답에는 그대로 남는다.
 * ⚠️ 지상 기체(alt_baro "ground")와 위치가 60초 넘게 낡은 기체도 뺀다. 활주로 위 점은 공역이 아니고,
 *    낡은 위치를 지금 위치처럼 그리면 열차 추정보다 더 나쁜 거짓이 된다.
 * ⚠️ dist 단위는 해리(NM)다. 250NM ≈ 463km — 한반도 범위를 덮고 BOUNDS 로 한 번 더 자른다.
 *
 * 데이터: adsb.lol (ODbL 1.0). 화면에 출처를 표기한다.
 */
import { json } from "./_lib.js";

/*
 * 원천은 둘, 순서대로 시도한다. 둘 다 readsb 형식(hex·flight·t·r·lat·lon·alt_baro·gs·track·seen_pos·dbFlags)이고
 * 목록 키만 다르다(adsb.lol `ac` · adsb.fi `aircraft`).
 * ⚠️ adsb.lol 은 내 맥에서는 200 인데 **Cloudflare 엣지에서 부르면 실패한다**(2026-09-14 배포 직후 502 실측).
 *    그래서 adsb.fi 를 뒤에 둔다. 둘 다 실패하면 502 에 **어느 원천이 왜** 실패했는지 담는다 — 조용히 빈 하늘로 두지 않는다.
 */
const SOURCES = [
  { name: "adsb.lol", url: "https://api.adsb.lol/v2/lat/36/lon/128/dist/250", list: "ac" },
  { name: "adsb.fi", url: "https://opendata.adsb.fi/api/v2/lat/36/lon/128/dist/250", list: "aircraft" },
];
const TTL = 15;
const MAX_SEEN_POS = 60;
// 레이더 지도의 KOREA_BOUNDS 와 같은 상자. 지도가 이 밖으로 못 나가므로 밖의 기체는 보낼 이유가 없다.
export const BOUNDS = { latMin: 32.0, latMax: 39.6, lonMin: 123.5, lonMax: 132.0 };

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

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
    aircraft.push({
      hex: str(a.hex, 6), flight: str(a.flight, 8).trim(), type: str(a.t, 4), reg: str(a.r, 10),
      lat: Math.round(a.lat * 1e5) / 1e5, lon: Math.round(a.lon * 1e5) / 1e5,
      alt: num(a.alt_baro), gs: num(a.gs), track: num(a.track), seen: Math.round(seen),
    });
  }
  // adsb.lol 의 now 는 밀리초다. 초로 오는 경우도 받아 둔다.
  let now = num(raw && raw.now) ?? nowMs;
  if (now < 1e12) now *= 1000;
  return { now, count: aircraft.length, hidden, aircraft };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/ktrainrader24-aircraft", context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  let body = null;
  const errors = [];
  for (const src of SOURCES) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      // ⚠️ adsb.lol 은 흔한 UA(node·undici 기본값)를 "User-Agent too generic; include valid contact info" 로 거절한다(실측).
      const r = await fetch(src.url, { signal: ctl.signal, headers: { "user-agent": "K-TrainRadar24/0.6 (+https://scoutingapp.net/ktrainrader24)", accept: "application/json" } });
      clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 80).replace(/\s+/g, " "));
      const raw = await r.json();
      if (!Array.isArray(raw && raw[src.list])) throw new Error("응답에 " + src.list + " 목록이 없음");
      body = { ok: true, source: src.name, ...trimAircraft(raw) };
      break;
    } catch (e) {
      errors.push(src.name + ": " + String(e && e.message ? e.message : e).slice(0, 160));
    }
  }
  // ⚠️ 5xx 로 주면 커스텀 도메인에서 Cloudflare 가 본문을 자기 오류 페이지("error code: 502")로 바꿔
  //    `errors` 를 아무도 못 읽는다(2026-09-14 실측). 200 에 ok:false 로 준다 — 화면은 ok 만 본다.
  if (!body) return json({ ok: false, error: "항공기 자료를 받지 못했습니다", errors });
  const res = new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${TTL}` },
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}
