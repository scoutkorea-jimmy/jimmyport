/* 카드뉴스 제작기 상태 저장 (KV) — 작성자 이름 기반(토큰 없음)
 *  - 작업 슬롯(자동 초안): KEY="jamboree"  (GET/PUT)
 *  - 이름 있는 다중 저장(카드뉴스 목록):
 *      index:  KEY_INDEX="jamboree:index" = [{id,name,author,updatedAt}]
 *      item:   "jamboree:item:<id>"        = {id,name,author,state,updatedAt}
 *  - GET  /api/jamboree            → 작업 슬롯 {state,updatedAt}
 *  - GET  /api/jamboree?list=1     → 목록 {items:[{id,name,author,updatedAt}]}
 *  - GET  /api/jamboree?id=<id>    → 개별 {id,name,author,state,updatedAt}
 *  - PUT  /api/jamboree            → 저장: body {state, author?, id?, name?}
 *        id 있으면 해당 항목 갱신, 없으면 작업 슬롯 저장
 *  - POST /api/jamboree            → 새 항목 {name, author, state} → {id}
 *  - DELETE /api/jamboree?id=<id>  → 삭제
 *  state = { text, props, images, brand }  (Phase 1 editKeys 호환) */
import { json, clientIp, appendLog, isAdmin } from "./_lib.js";

// Server backup is admin-only (gated by the same TOTP session as /admin).
// The card-news app saves locally by default; the server slot is opt-in and
// must not be readable/writable without a valid admin session.
const requireAdmin = async (request, env) =>
  (await isAdmin(request, env)) ? null : json({ error: "unauthorized" }, 401);

const KEY = "jamboree";
const KEY_INDEX = "jamboree:index";
const ITEM = (id) => "jamboree:item:" + id;

async function readIndex(env) {
  const raw = await env.SCOUT_KV.get(KEY_INDEX);
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}
function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }

export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env); if (deny) return deny;
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
  const deny = await requireAdmin(request, env); if (deny) return deny;
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const state = body && typeof body.state === "object" && body.state ? body.state : null;
  if (!state) return json({ error: "state object required" }, 400);
  const author = cleanName(body.author, "익명");
  const updatedAt = new Date().toISOString();

  if (body.id) {
    // 기존 항목 갱신
    const id = String(body.id);
    const raw = await env.SCOUT_KV.get(ITEM(id));
    if (!raw) return json({ error: "not found" }, 404);
    let prev = {}; try { prev = JSON.parse(raw); } catch {}
    const name = cleanName(body.name, prev.name || "카드뉴스");
    await env.SCOUT_KV.put(ITEM(id), JSON.stringify({ id, name, author, state, updatedAt }));
    const index = await readIndex(env);
    const e = index.find((x) => x.id === id);
    if (e) { e.name = name; e.author = author; e.updatedAt = updatedAt; }
    await env.SCOUT_KV.put(KEY_INDEX, JSON.stringify(index));
    await appendLog(env, { ts: updatedAt, action: "jamboree.update", count: 0, ip: clientIp(request) });
    return json({ ok: true, id, updatedAt });
  }

  // 작업 슬롯(초안)
  await env.SCOUT_KV.put(KEY, JSON.stringify({ state, author, updatedAt }));
  await appendLog(env, { ts: updatedAt, action: "jamboree.draft", count: 0, ip: clientIp(request) });
  return json({ ok: true, updatedAt });
}

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env); if (deny) return deny;
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const state = body && typeof body.state === "object" && body.state ? body.state : null;
  if (!state) return json({ error: "state object required" }, 400);
  const name = cleanName(body.name, "카드뉴스");
  const author = cleanName(body.author, "익명");
  const updatedAt = new Date().toISOString();
  const id = (crypto.randomUUID ? crypto.randomUUID() : "j" + Date.now() + Math.random().toString(36).slice(2, 8));
  await env.SCOUT_KV.put(ITEM(id), JSON.stringify({ id, name, author, state, updatedAt }));
  const index = await readIndex(env);
  index.unshift({ id, name, author, updatedAt });
  await env.SCOUT_KV.put(KEY_INDEX, JSON.stringify(index.slice(0, 200)));
  await appendLog(env, { ts: updatedAt, action: "jamboree.create", count: 0, ip: clientIp(request) });
  return json({ ok: true, id, name, author, updatedAt });
}

export async function onRequestDelete({ request, env }) {
  const deny = await requireAdmin(request, env); if (deny) return deny;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  await env.SCOUT_KV.delete(ITEM(id));
  const index = (await readIndex(env)).filter((x) => x.id !== id);
  await env.SCOUT_KV.put(KEY_INDEX, JSON.stringify(index));
  await appendLog(env, { ts: new Date().toISOString(), action: "jamboree.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
