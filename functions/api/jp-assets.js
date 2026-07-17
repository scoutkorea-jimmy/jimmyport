/* 홍보부 자료 라이브러리(아카이브) — 운영 계획서(문서·PDF) · 카드뉴스 · 사진 + 텍스트형 자료(참고자료·공지사항)
 *  GET    /api/jp-assets                                              (공개) → { assets } 최신순
 *  POST   /api/jp-assets { url, name, type, category, ct, tags[] }     (회원/관리자) 파일 자료 (url=/api/image?id= · /api/file?id= · /api/r2?id=)
 *  POST   /api/jp-assets { kind:'text', name, category, body(HTML), tags[] } (회원/관리자) 텍스트형 자료(리치텍스트)
 *  PATCH  /api/jp-assets { id, name?, tags[]?, category?, body? }      (작성자 본인 또는 관리자) 이름·태그·구분·본문 수정
 *  DELETE /api/jp-assets?id=<id>                                       (작성자 본인 또는 관리자)
 * category: plan(운영 계획서) | cardnews | photo | notice(공지사항) | reference(참고자료) | 사용자 정의
 * KV: 파일 "jpa:<id>" = {id,kind:'file',url,name,type,category,ct,size,tags,author,authorName,createdAt}
 *     텍스트 "jpa:<id>" = {id,kind:'text',name,category,body(HTML),tags,author,authorName,createdAt,updatedAt}
 *     body 는 리치텍스트 HTML — 표시 시 클라이언트가 sanitizeHtml 로 정화(저장은 원문).
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
  const now = new Date().toISOString();
  const authorName = who.username ? String(who.name || who.username).slice(0, 40) : "관리자";   // 세션 서명값만 — body.authorName 무시(사칭 차단)
  if (body.kind === "text") {   // 텍스트형 자료(참고자료·공지사항) — 파일 없이 리치텍스트 본문
    const nm = String(body.name || "").trim().slice(0, 120);
    const text = String(body.body || "").trim().slice(0, 40000);
    if (!nm && !text) return json({ ok: false, error: "empty" }, 400);
    const cat = (body.category != null && String(body.category).trim()) ? String(body.category).trim().slice(0, 40) : "notice";
    const rec = { id: newId(), kind: "text", name: nm, body: text, category: cat, tags: cleanTags(body.tags),
      author: who.username || "admin", authorName, createdAt: now, updatedAt: now };
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    await appendLog(env, { ts: now, action: "jpa.text", count: 0, ip: clientIp(request) });
    return json({ ok: true, asset: rec });
  }
  const url = String(body.url || "");
  if (!/^\/api\/(image|file|r2)\?id=/.test(url)) return json({ ok: false, error: "bad_url" }, 400);
  // 카테고리 자유 입력 — 기본 키 외 사용자 정의 카테고리 허용(≤40자). 빈 값은 타입으로 폴백
  const category = (body.category != null && String(body.category).trim())
    ? String(body.category).trim().slice(0, 40)
    : (body.type === "cardnews" ? "cardnews" : "photo");
  const rec = {
    id: newId(), kind: "file", url, name: String(body.name || "").trim().slice(0, 120),
    type: body.type === "cardnews" ? "cardnews" : "photo",
    category, ct: String(body.ct || "").slice(0, 100),
    size: Number(body.size) > 0 ? Math.floor(Number(body.size)) : 0, // 0 = 구버전 기록(용량 미저장)
    tags: cleanTags(body.tags),
    author: who.username || "admin", authorName,
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
  if (body.name != null) rec.name = String(body.name).trim().slice(0, 120);
  if (body.tags != null) rec.tags = cleanTags(body.tags);
  if (body.category != null) { const c = String(body.category).trim().slice(0, 40); if (c) rec.category = c; }   // 자유 카테고리(작성자 본인/관리자·마스터)
  if (body.body != null && rec.kind === "text") { rec.body = String(body.body).trim().slice(0, 40000); }        // 텍스트형 본문 수정
  rec.updatedAt = new Date().toISOString();
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
  // R2 자산은 용량이 커서 실물까지 지운다 (KV blob 은 기존대로 남겨둠)
  const r2key = rec && /^\/api\/r2\?id=/.test(rec.url || "") ? decodeURIComponent(rec.url.split("id=")[1] || "") : "";
  if (r2key && env.SCOUT_R2) { try { await env.SCOUT_R2.delete(r2key); } catch {} }
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpa.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
