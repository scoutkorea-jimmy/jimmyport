/* 카드뉴스 제작기 상태 저장 (KV)
 *  - 작업 슬롯(자동): KEY="jamboree"  (GET/PUT) — 기존 호환, "서버 저장/불러오기"
 *  - 이름 있는 다중 저장(카드뉴스 목록):
 *      index:  KEY_INDEX="jamboree:index" = [{id,name,updatedAt}]
 *      item:   "jamboree:item:<id>"        = {id,name,state,updatedAt}
 *  - GET  /api/jamboree            → 작업 슬롯 {state,updatedAt}
 *  - GET  /api/jamboree?list=1     → 목록 {items:[{id,name,updatedAt}]}
 *  - GET  /api/jamboree?id=<id>    → 개별 {id,name,state,updatedAt}
 *  - PUT  /api/jamboree            → 작업 슬롯 저장(관리자)
 *  - POST /api/jamboree            → 이름으로 새 저장(관리자) {name,state} → {id}
 *  - DELETE /api/jamboree?id=<id>  → 삭제(관리자)
 *  state = { text, props, images, brand }  (Phase 1 editKeys 호환) */
import { json, isAdmin, clientIp, appendLog } from "./_lib.js";

const KEY = "jamboree";
const KEY_INDEX = "jamboree:index";
const ITEM = (id) => "jamboree:item:" + id;

async function readIndex(env) {
  const raw = await env.SCOUT_KV.get(KEY_INDEX);
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("list")) {
    return json({ items: await readIndex(env) });
  }
  const id = url.searchParams.get("id");
  if (id) {
    const raw = await env.SCOUT_KV.get(ITEM(id));
    if (!raw) return json({ error: "not found" }, 404);
    try { return json(JSON.parse(raw)); } catch { return json({ error: "corrupt" }, 500); }
  }
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

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const state = body && typeof body.state === "object" && body.state ? body.state : null;
  if (!state) return json({ error: "state object required" }, 400);
  let name = (body.name || "").toString().trim().slice(0, 80) || "카드뉴스";
  const updatedAt = new Date().toISOString();
  const id = (crypto.randomUUID ? crypto.randomUUID() : "j" + Date.now() + Math.random().toString(36).slice(2, 8));
  await env.SCOUT_KV.put(ITEM(id), JSON.stringify({ id, name, state, updatedAt }));
  const index = await readIndex(env);
  index.unshift({ id, name, updatedAt });
  await env.SCOUT_KV.put(KEY_INDEX, JSON.stringify(index.slice(0, 200)));
  await appendLog(env, { ts: updatedAt, action: "jamboree.create", count: 0, ip: clientIp(request) });
  return json({ ok: true, id, name, updatedAt });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  await env.SCOUT_KV.delete(ITEM(id));
  const index = (await readIndex(env)).filter((x) => x.id !== id);
  await env.SCOUT_KV.put(KEY_INDEX, JSON.stringify(index));
  await appendLog(env, { ts: new Date().toISOString(), action: "jamboree.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
