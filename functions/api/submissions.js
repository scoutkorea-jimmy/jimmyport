/* 단위대 추가 제안 흐름 (삭제는 관리자 문의 — 공개 삭제 없음)
 * POST  /api/submissions  → 누구나: 새 단위대 제안 (승인 대기 큐 + IP 기록)
 * GET   /api/submissions  → 관리자: 대기 목록
 * PATCH /api/submissions  → 관리자: { id, action: "approve" | "reject" } */
import { json, isAdmin, clientIp, getArr, putArr, appendLog, newId, cachePurge } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const u = body.unit || body;
  if (!u || !u.name || !String(u.name).trim()) return json({ error: "name required" }, 400);
  var reporter = null;
  if (body.reporter && typeof body.reporter === "object") {
    reporter = {
      name: String(body.reporter.name || "").trim().slice(0, 80),
      affiliation: String(body.reporter.affiliation || "").trim().slice(0, 120),
    };
  }
  if (!reporter || !reporter.name || !reporter.affiliation) return json({ error: "reporter_required" }, 400);
  let correction = null;
  if (body.correction && typeof body.correction === "object" && body.correction.forId) {
    correction = {
      forId: String(body.correction.forId).slice(0, 80),
      forName: String(body.correction.forName || "").trim().slice(0, 160),
    };
  }
  const pending = await getArr(env, "pending");
  const item = { id: newId(), ts: new Date().toISOString(), ip: clientIp(request), unit: u, reporter: reporter, correction: correction };
  pending.unshift(item);
  await putArr(env, "pending", pending.slice(0, 1000));
  await appendLog(env, { ts: item.ts, action: "submission.new", name: u.name, ip: item.ip });
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  return json({ pending: await getArr(env, "pending") });
}

export async function onRequestPatch(ctx) {
  const { request, env } = ctx;
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const id = body.id, action = body.action;
  const pending = await getArr(env, "pending");
  const idx = pending.findIndex(function (p) { return p.id === id; });
  if (idx === -1) return json({ error: "not found" }, 404);
  const item = pending[idx];
  pending.splice(idx, 1);
  await putArr(env, "pending", pending);
  const ts = new Date().toISOString();

  if (action === "approve") {
    const raw = await env.SCOUT_KV.get("units");
    let store = raw ? JSON.parse(raw) : { units: [], updatedAt: null };
    if (!Array.isArray(store.units)) store.units = [];
    const unit = Object.assign({}, item.unit);
    // Upsert by id: a correction (unit.id matches an existing place) updates it in place;
    // a new submission (no matching id) is appended.
    let replaced = false;
    if (unit.id) {
      const i = store.units.findIndex(function (x) { return x.id === unit.id; });
      if (i !== -1) { store.units[i] = unit; replaced = true; }
    }
    if (!replaced) { if (!unit.id) unit.id = newId(); store.units.push(unit); }
    store.updatedAt = ts;
    await env.SCOUT_KV.put("units", JSON.stringify(store));
    await appendLog(env, { ts, action: replaced ? "submission.correction" : "submission.approve", name: unit.name, ip: clientIp(request) });
    cachePurge(ctx, "/api/units");  // approved place must appear on the public map promptly
    return json({ ok: true, approved: unit.id, replaced: replaced, count: store.units.length });
  }
  await appendLog(env, { ts, action: "submission.reject", name: item.unit && item.unit.name, ip: clientIp(request) });
  return json({ ok: true, rejected: id });
}
