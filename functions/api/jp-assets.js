/* 홍보부 자료 라이브러리(아카이브) — 사진 · 완성 카드뉴스 PNG 모음
 *  GET    /api/jp-assets                                  (공개) → { assets } 최신순
 *  POST   /api/jp-assets { url, name, type, tags[] }       (회원/관리자) 자료 등록 (url=/api/image?id=)
 *  PATCH  /api/jp-assets { id, name?, tags[]? }            (작성자 본인 또는 관리자) 이름·태그 수정
 *  DELETE /api/jp-assets?id=<id>                           (작성자 본인 또는 관리자)
 * KV: "jpa:<id>" = {id,url,name,type,tags,author,authorName,createdAt}
 */
import { json, memberOrAdmin, newId, clientIp, appendLog } from "./_lib.js";

const PREFIX = "jpa:";
const KEY = (id) => PREFIX + id;

function cleanTags(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((t) => String(t || "").trim().slice(0, 20)).filter(Boolean).slice(0, 8);
}
async function readAsset(env, id) {
  try { const raw = await env.SCOUT_KV.get(KEY(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function onRequestGet({ env }) {
  const assets = []; let cursor;
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    for (const k of res.keys) { const raw = await env.SCOUT_KV.get(k.name); if (raw) { try { assets.push(JSON.parse(raw)); } catch {} } }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  assets.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, assets });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {}; try { body = await request.json(); } catch {}
  const url = String(body.url || "");
  if (!/^\/api\/image\?id=/.test(url)) return json({ ok: false, error: "bad_url" }, 400);
  const now = new Date().toISOString();
  const rec = {
    id: newId(), url, name: String(body.name || "").trim().slice(0, 80),
    type: body.type === "cardnews" ? "cardnews" : "photo", tags: cleanTags(body.tags),
    author: who.admin ? "admin" : who.username,
    authorName: who.admin ? "관리자" : (String(body.authorName || who.username).slice(0, 40)),
    createdAt: now,
  };
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jpa.add", count: 0, ip: clientIp(request) });
  return json({ ok: true, asset: rec });
}

export async function onRequestPatch({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {}; try { body = await request.json(); } catch {}
  const rec = await readAsset(env, String(body.id || ""));
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  if (!who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  if (body.name != null) rec.name = String(body.name).trim().slice(0, 80);
  if (body.tags != null) rec.tags = cleanTags(body.tags);
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  return json({ ok: true, asset: rec });
}

export async function onRequestDelete({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "missing_id" }, 400);
  const rec = await readAsset(env, id);
  if (rec && !who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpa.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
