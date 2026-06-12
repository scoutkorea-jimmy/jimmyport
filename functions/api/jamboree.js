/* GET  /api/jamboree  → 공개: 저장된 카드뉴스 제작기 상태 (없으면 state:null)
 * PUT  /api/jamboree  → 관리자: 상태 전체 저장 + updatedAt + 변경 로그
 *   state = { text:{<ekey>:val}, props:{<scope>:json}, images:{<slot>:dataURL},
 *            brand:{brand,dateRange,place,org,openLine} }  (Phase 1 editKeys 호환) */
import { json, isAdmin, clientIp, appendLog } from "./_lib.js";

const KEY = "jamboree";

export async function onRequestGet({ env }) {
  const raw = await env.SCOUT_KV.get(KEY);
  if (!raw) return json({ state: null, updatedAt: null });
  try { return json(JSON.parse(raw)); }
  catch { return json({ state: null, updatedAt: null }); }
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const state = body && typeof body.state === "object" && body.state ? body.state : null;
  if (!state) return json({ error: "state object required" }, 400);
  const updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY, JSON.stringify({ state, updatedAt }));
  const cnt = (o) => (o && typeof o === "object" ? Object.keys(o).length : 0);
  const editCount = cnt(state.text) + cnt(state.props) + cnt(state.images) + cnt(state.editKeys);
  await appendLog(env, { ts: updatedAt, action: "jamboree.save", count: editCount, ip: clientIp(request) });
  return json({ ok: true, updatedAt });
}
