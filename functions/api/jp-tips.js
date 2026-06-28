/* 현장 제보 인박스 — 현장 사진/소식 제보 → 홍보부 검토(채택/반려)
 *  GET    /api/jp-tips                                  (회원/관리자) → { tips } 최신순
 *  POST   /api/jp-tips { org, zone, text, photos[], reporterName }  (회원/관리자) 제보 등록
 *  PATCH  /api/jp-tips { id, status?, note? }           (회원/관리자) 검토 상태·메모
 *  DELETE /api/jp-tips?id=<id>                          (작성자 본인 또는 관리자)
 * KV: "jpt:<id>" = {id, reporterName, reporterUser, org, zone, text, photos[], status, note, ip, createdAt, triagedBy, triagedAt}
 */
import { json, memberOrAdmin, newId, clientIp, maskIp, appendLog, bannedTerms, matchBanned } from "./_lib.js";

const PREFIX = "jpt:";
const KEY = (id) => PREFIX + id;
const STATUSES = ["new", "used", "rejected"];

// 공개(비로그인) 제보 레이트리밋 — IP당 10분에 8건
async function rateOk(env, ip) {
  const key = "jpt:rl:" + ip;
  let n = 0; try { n = parseInt((await env.SCOUT_KV.get(key)) || "0", 10) || 0; } catch {}
  if (n >= 8) return false;
  try { await env.SCOUT_KV.put(key, String(n + 1), { expirationTtl: 600 }); } catch {}
  return true;
}

async function readTip(env, id) {
  try { const raw = await env.SCOUT_KV.get(KEY(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function cleanPhotos(arr) {
  return Array.isArray(arr)
    ? arr.map((u) => String(u || "").slice(0, 600)).filter((u) => /^\/api\/image\?id=/.test(u)).slice(0, 3)
    : [];
}

export async function onRequestGet({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const tips = []; let cursor;
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    for (const k of res.keys) { const raw = await env.SCOUT_KV.get(k.name); if (raw) { try { tips.push(JSON.parse(raw)); } catch {} } }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  tips.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, tips });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);   // null = 공개(비로그인) 제보
  let body = {}; try { body = await request.json(); } catch {}
  const text = String(body.text || "").trim().slice(0, 2000);
  const photos = cleanPhotos(body.photos);
  const reporterName = String(body.reporterName || "").trim().slice(0, 40);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const org = String(body.org || "").trim().slice(0, 60);
  if (!text && !photos.length) return json({ ok: false, error: "empty" }, 400);
  if (!who) {
    if (!reporterName) return json({ ok: false, error: "name_required" }, 400);  // 공개 제보는 이름 필수
    if (!phone) return json({ ok: false, error: "phone_required" }, 400);  // 전화번호 필수
    if (body.consent !== true) return json({ ok: false, error: "consent_required" }, 400);  // 개인정보 수집·이용 동의
    if (body.participant !== true) return json({ ok: false, error: "participant_required" }, 400);  // 잼버리 참가자 확인
    const ip = clientIp(request);
    if (!(await rateOk(env, ip))) return json({ ok: false, error: "too_many" }, 429);
    const terms = await bannedTerms(env);
    if (matchBanned(terms, text + " " + reporterName + " " + org)) return json({ ok: false, error: "blocked_keyword" }, 400);
  }
  const now = new Date().toISOString();
  const rec = {
    id: newId(),
    reporterUser: who ? (who.admin ? "admin" : who.username) : "public",
    reporterName: reporterName || (who ? (who.admin ? "관리자" : who.username) : "익명"),
    phone, org, zone: String(body.zone || "").slice(0, 40),
    text, photos, status: "new", note: "", assignee: "",
    source: who ? "member" : "public",
    consentAt: (!who && body.consent === true) ? now : "",
    participant: !who ? (body.participant === true) : true,
    ip: maskIp(clientIp(request)), createdAt: now,
  };
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: who ? "jpt.add" : "jpt.add.public", count: 0, ip: clientIp(request) });
  return json({ ok: true, tip: rec });
}

export async function onRequestPatch({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {}; try { body = await request.json(); } catch {}
  const rec = await readTip(env, String(body.id || ""));
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  if (body.status != null && STATUSES.indexOf(body.status) >= 0) rec.status = body.status;
  if (body.note != null) rec.note = String(body.note).slice(0, 500);
  if (body.assignee != null) rec.assignee = String(body.assignee).slice(0, 40);
  rec.triagedBy = who.admin ? "관리자" : who.username;
  rec.triagedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  return json({ ok: true, tip: rec });
}

export async function onRequestDelete({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "missing_id" }, 400);
  const rec = await readTip(env, id);
  if (rec && !who.admin && rec.reporterUser !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpt.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
