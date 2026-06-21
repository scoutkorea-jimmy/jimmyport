/* GET  /api/units  → 공개: 현재 단위대 목록 (KV 비어있으면 units:null → 클라가 data.js 폴백)
 * PUT  /api/units  → 관리자: 전체 단위대 저장 + updatedAt + 변경 로그 */
import { json, isAdmin, clientIp, appendLog } from "./_lib.js";

export async function onRequestGet({ env }) {
  const raw = await env.SCOUT_KV.get("units");
  if (!raw) return json({ units: null, updatedAt: null });
  try { return json(JSON.parse(raw)); }
  catch { return json({ units: null, updatedAt: null }); }
}

export async function onRequestPut({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const units = Array.isArray(body.units) ? body.units : (Array.isArray(body) ? body : null);
  if (!units) return json({ error: "units array required" }, 400);
  const updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put("units", JSON.stringify({ units, updatedAt }));
  await appendLog(env, { ts: updatedAt, action: "units.save", count: units.length, ip: clientIp(request) });
  return json({ ok: true, updatedAt, count: units.length });
}
