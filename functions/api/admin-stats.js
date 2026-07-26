/* 관리자 대시보드 데이터 (v0.9.257)
 *
 *  GET /api/admin-stats?days=14   (관리자 TOTP 세션) → { ok, days[], routes[], totals, status }
 *
 * 유입(hit:*) 집계와 배포·검증 상태(status.json)를 한 번에 준다.
 * ⚠️ 관리자만. 유입 수치는 개인정보가 아니지만 운영 정보이므로 공개하지 않는다.
 * ⚠️ 읽기 전용 — 여기서 KV 를 쓰지 않는다.
 */
import { json, isAdmin } from "./_lib.js";
import { ROUTES, KEY, dayKey } from "./hit.js";

export const dayList = (n, now) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(now.getTime() - i * 86400000)));
  return out;
};

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "14", 10) || 14));
  const list = dayList(days, new Date());

  // 라우트 × 날짜 — 값이 없으면 0. (KV 조회가 라우트 수 × 일수만큼 나가지만 관리자 한 명이 가끔 보는 화면이다.)
  const routes = [];
  for (const r of ROUTES) {
    const counts = await Promise.all(list.map(async (d) => {
      try { return parseInt((await env.SCOUT_KV.get(KEY(r, d))) || "0", 10) || 0; } catch { return 0; }
    }));
    routes.push({ route: r, counts, total: counts.reduce((a, b) => a + b, 0) });
  }
  routes.sort((a, b) => b.total - a.total);

  // 배포·검증 상태는 배포 때 만들어 둔 정적 파일에서 읽는다(같은 도메인이라 그냥 fetch 한다)
  let status = null;
  try {
    const r = await fetch(new URL("/status.json", request.url).toString(), { cf: { cacheTtl: 0 } });
    if (r.ok) status = await r.json();
  } catch {}

  const totals = list.map((_, i) => routes.reduce((s, r) => s + r.counts[i], 0));
  return json({ ok: true, days: list, routes, totals, status });
}
