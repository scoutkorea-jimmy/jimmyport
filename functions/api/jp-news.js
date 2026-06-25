/* 대원 기사 — jamboree-plan "기사" 탭
 * 사진 2~3장 + 본문 기사. 즉시 게시 · 작성자 본인 수정 · 삭제는 관리자만.
 *
 *  GET    /api/jp-news                                   (공개) → { articles } 최신순
 *  POST   /api/jp-news   { title, body, images[] }        (대원/관리자 세션) 새 기사
 *  PUT    /api/jp-news   { id, title, body, images[] }    (작성자 본인 또는 관리자)
 *  DELETE /api/jp-news?id=<id>                             (관리자만)
 *
 * KV: 기사 "jpn:<id>" = {id,title,body,images,author,authorName,createdAt,updatedAt,ip}
 *     (prefix list로 전체 조회 — jamboree-plan.js slot 패턴과 동일)
 */
import { json, memberOrAdmin, adminUser, newId, clientIp, maskIp, appendLog } from "./_lib.js";

const PREFIX = "jpn:";
const KEY = (id) => PREFIX + id;
const MAX_IMG = 3;

function cleanImages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((u) => typeof u === "string" && /^\/api\/image\?id=/.test(u))
    .slice(0, MAX_IMG);
}

async function readArticle(env, id) {
  try { const raw = await env.SCOUT_KV.get(KEY(id)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export async function onRequestGet({ env }) {
  const articles = [];
  let cursor;
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    for (const k of res.keys) {
      const raw = await env.SCOUT_KV.get(k.name);
      if (raw) { try { articles.push(JSON.parse(raw)); } catch {} }
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  articles.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, articles });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  if (body.action === "comment") {   // 검수 코멘트 추가
    const rec = await readArticle(env, String(body.id || ""));
    if (!rec) return json({ ok: false, error: "not_found" }, 404);
    const ctext = String(body.text || "").trim().slice(0, 1000);
    if (!ctext) return json({ ok: false, error: "empty" }, 400);
    if (!Array.isArray(rec.comments)) rec.comments = [];
    rec.comments.push({ id: newId(), text: ctext, author: who.admin ? "관리자" : (String(body.authorName || who.username).slice(0, 40)), username: who.admin ? "admin" : who.username, ts: new Date().toISOString(), ip: maskIp(clientIp(request)) });
    rec.comments = rec.comments.slice(-200);
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    await appendLog(env, { ts: new Date().toISOString(), action: "jpn.comment", count: 0, ip: clientIp(request) });
    return json({ ok: true, article: rec });
  }
  if (body.action === "comment_delete") {   // 코멘트 삭제(본인 또는 관리자)
    const rec = await readArticle(env, String(body.id || ""));
    if (!rec || !Array.isArray(rec.comments)) return json({ ok: false, error: "not_found" }, 404);
    const c = rec.comments.find((x) => x.id === body.commentId);
    if (!c) return json({ ok: false, error: "not_found" }, 404);
    if (!who.admin && c.username !== who.username) return json({ ok: false, error: "forbidden" }, 403);
    rec.comments = rec.comments.filter((x) => x.id !== body.commentId);
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    return json({ ok: true, article: rec });
  }
  const title = String(body.title || "").trim().slice(0, 160);
  const text = String(body.body || "").trim().slice(0, 8000);
  if (!title && !text) return json({ ok: false, error: "empty" }, 400);
  const now = new Date().toISOString();
  const rec = {
    id: newId(), title, body: text, images: cleanImages(body.images),
    author: who.admin ? "admin" : who.username,
    authorName: who.admin ? "관리자" : (String(body.authorName || who.username).slice(0, 40)),
    createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
  };
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jpn.create", count: 0, ip: clientIp(request) });
  return json({ ok: true, article: rec });
}

export async function onRequestPut({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const rec = await readArticle(env, String(body.id || ""));
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  if (!who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  rec.title = String(body.title || "").trim().slice(0, 160);
  rec.body = String(body.body || "").trim().slice(0, 8000);
  rec.images = cleanImages(body.images);
  rec.updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: rec.updatedAt, action: "jpn.edit", count: 0, ip: clientIp(request) });
  return json({ ok: true, article: rec });
}

export async function onRequestDelete({ request, env }) {
  if (!(await adminUser(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "missing_id" }, 400);
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpn.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
