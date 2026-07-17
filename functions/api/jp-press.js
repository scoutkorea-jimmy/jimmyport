/* 보도자료 게시판 — 홍보부가 언론·매체에 배포하는 공식 보도자료 (팀·자료)
 *  GET    /api/jp-press                                                          (홍보부/관리자) → { press } 최신순
 *  POST   /api/jp-press { title, body(HTML), date, contact, outlets, status, attachments[] }  (홍보부/관리자) 새 보도자료
 *  POST   /api/jp-press { action:'status', id, status }                          (홍보부/관리자) 상태 토글
 *  PUT    /api/jp-press { id, ... }                                              (작성자 본인 또는 관리자)
 *  DELETE /api/jp-press?id=<id>                                                  (작성자 본인 또는 관리자)
 * status: 'draft'(작성중) | 'released'(배포 완료)
 * body 는 리치텍스트 HTML — 표시 시 클라이언트가 sanitizeHtml 로 정화(저장은 원문).
 * KV: "jpp:<id>" = {id,title,body,date,contact,outlets,status,attachments[],author,authorName,createdAt,updatedAt,ip}
 */
import { json, memberOrAdmin, newId, clientIp, maskIp, appendLog } from "./_lib.js";

const PREFIX = "jpp:";
const KEY = (id) => PREFIX + id;

function cleanAttachments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((a) => (a && typeof a === "object") ? {
      name: String(a.name || "").slice(0, 120),
      url: String(a.url || ""),
      ct: String(a.ct || "").slice(0, 100),
      size: Number(a.size) > 0 ? Math.floor(Number(a.size)) : 0,
    } : null)
    .filter((a) => a && /^\/api\/(image|file|r2)\?id=/.test(a.url))
    .slice(0, 10);
}
const cleanDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const cleanStatus = (v) => (v === "released" ? "released" : "draft");

async function readPress(env, id) {
  try { const raw = await env.SCOUT_KV.get(KEY(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who || !who.staff) return json({ ok: false, error: "forbidden" }, 403);   // 공식 보도자료 — 홍보부/관리자만
  const press = []; let cursor;
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    for (const k of res.keys) { const raw = await env.SCOUT_KV.get(k.name); if (raw) { try { press.push(JSON.parse(raw)); } catch {} } }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  press.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, press });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who || !who.staff) return json({ ok: false, error: "forbidden" }, 403);
  let body = {}; try { body = await request.json(); } catch {}
  const authorName = who.username ? String(who.name || who.username).slice(0, 40) : "관리자";   // 세션 서명값만
  if (body.action === "status") {   // 목차 상태 토글(작성중 ↔ 배포 완료)
    const rec = await readPress(env, String(body.id || ""));
    if (!rec) return json({ ok: false, error: "not_found" }, 404);
    rec.status = cleanStatus(body.status);
    rec.updatedAt = new Date().toISOString();
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    return json({ ok: true, item: rec });
  }
  const title = String(body.title || "").trim().slice(0, 160);
  const text = String(body.body || "").trim().slice(0, 40000);
  if (!title && !text) return json({ ok: false, error: "empty" }, 400);
  const now = new Date().toISOString();
  const rec = {
    id: newId(), title, body: text,
    date: cleanDate(body.date), contact: String(body.contact || "").trim().slice(0, 80),
    outlets: String(body.outlets || "").trim().slice(0, 300),
    status: cleanStatus(body.status), attachments: cleanAttachments(body.attachments),
    author: who.username || "admin", authorName,
    createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
  };
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jpp.create", count: 0, ip: clientIp(request) });
  return json({ ok: true, item: rec });
}

export async function onRequestPut({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who || !who.staff) return json({ ok: false, error: "forbidden" }, 403);
  let body = {}; try { body = await request.json(); } catch {}
  const rec = await readPress(env, String(body.id || ""));
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  if (!who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  rec.title = String(body.title || "").trim().slice(0, 160);
  rec.body = String(body.body || "").trim().slice(0, 40000);
  rec.date = cleanDate(body.date);
  rec.contact = String(body.contact || "").trim().slice(0, 80);
  rec.outlets = String(body.outlets || "").trim().slice(0, 300);
  rec.status = cleanStatus(body.status);
  rec.attachments = cleanAttachments(body.attachments);
  rec.updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: rec.updatedAt, action: "jpp.edit", count: 0, ip: clientIp(request) });
  return json({ ok: true, item: rec });
}

export async function onRequestDelete({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who || !who.staff) return json({ ok: false, error: "forbidden" }, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "missing_id" }, 400);
  const rec = await readPress(env, id);
  if (rec && !who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  // R2 첨부는 실물까지 정리 (KV blob 은 그대로 둠)
  if (rec && Array.isArray(rec.attachments)) {
    for (const a of rec.attachments) {
      const r2key = /^\/api\/r2\?id=/.test(a.url || "") ? decodeURIComponent((a.url.split("id=")[1] || "")) : "";
      if (r2key && env.SCOUT_R2) { try { await env.SCOUT_R2.delete(r2key); } catch {} }
    }
  }
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpp.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
