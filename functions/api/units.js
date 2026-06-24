/* GET  /api/units  → 공개: 현재 단위대 목록 (KV 비어있으면 units:null → 클라가 data.js 폴백)
 * PUT  /api/units  → 관리자: 전체 단위대 저장 + updatedAt + 변경 로그 */
import { json, jsonCacheable, cacheMatch, cachePut, cachePurge, isAdmin, clientIp, appendLog } from "./_lib.js";

export async function onRequestGet(ctx) {
  const { env } = ctx;
  const hit = await cacheMatch(ctx.request);
  if (hit) return hit;
  const raw = await env.SCOUT_KV.get("units");
  let data;
  try { data = raw ? JSON.parse(raw) : { units: null, updatedAt: null }; }
  catch { data = { units: null, updatedAt: null }; }
  const resp = jsonCacheable(data, 120);  // public list rarely changes; admin PUT purges it
  cachePut(ctx, resp);
  return resp;
}

export async function onRequestPut(ctx) {
  const { request, env } = ctx;
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const units = Array.isArray(body.units) ? body.units : (Array.isArray(body) ? body : null);
  if (!units) return json({ error: "units array required" }, 400);
  const updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put("units", JSON.stringify({ units, updatedAt }));
  await appendLog(env, { ts: updatedAt, action: "units.save", count: units.length, ip: clientIp(request) });
  cachePurge(ctx, "/api/units");
  return json({ ok: true, updatedAt, count: units.length });
}
