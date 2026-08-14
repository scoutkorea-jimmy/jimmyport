/* 페이지 유입 집계 (v0.9.257)
 *
 *  POST /api/hit { route }   (공개) → 그 라우트의 오늘 방문 수 +1
 *
 * KV: "hit:<route>:<YYYY-MM-DD>" = 숫자
 *
 * ⚠️ **개인정보를 남기지 않는다.** IP·UA·referrer 를 저장하지 않고, "어느 화면이 며칠에 몇 번 열렸는지"만
 *    센다. 그래서 개인 식별이 불가능하고, 방문자 단위가 아니라 **페이지 열람 수(PV)** 다.
 * ⚠️ KV 에는 원자적 증가가 없다. 같은 순간에 여러 명이 열면 몇 건이 겹쳐 사라질 수 있다 —
 *    추세를 보는 용도이지 정산용 숫자가 아니다(화면에도 그렇게 적어 둔다).
 * ⚠️ 라우트는 화이트리스트로만 받는다. 아무 문자열이나 받으면 KV 가 쓰레기로 찬다.
 */
import { json } from "./_lib.js";

// v0.9.295 — 카드뉴스 제작기·디데이·급식편의본부 종료로 5개 라우트 제거.
// 이미 쌓인 옛 유입 기록은 KV 에 그대로 남는다(지우지 않는다) — 화이트리스트는 '새로 받을 것'만 정한다.
export const ROUTES = [
  "/", "/tour", "/tour/admin", "/krjam-planning",
  "/krjam-jebo", "/privacy", "/admin",
];
export const KEEP_DAYS = 90;

export const cleanRoute = (v) => {
  let s = String(v || "").split("?")[0].split("#")[0];
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  if (s.endsWith(".html")) s = s.slice(0, -5);
  return ROUTES.indexOf(s) >= 0 ? s : null;
};
export const dayKey = (d) => {
  // 집계 기준은 한국 시간 — 운영자가 보는 날짜와 어긋나면 안 된다
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
};
export const KEY = (route, day) => "hit:" + route + ":" + day;

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch {}
  const route = cleanRoute(body.route);
  if (!route) return json({ ok: true, counted: false });          // 모르는 라우트는 조용히 무시
  const day = dayKey(new Date());
  const k = KEY(route, day);
  try {
    const cur = parseInt((await env.SCOUT_KV.get(k)) || "0", 10) || 0;
    await env.SCOUT_KV.put(k, String(cur + 1), { expirationTtl: KEEP_DAYS * 86400 });
  } catch { return json({ ok: true, counted: false }); }          // 집계 실패가 화면을 막지 않는다
  return json({ ok: true, counted: true });
}
