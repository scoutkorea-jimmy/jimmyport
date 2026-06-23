/* 댓글 (레딧식 쓰레드 + 닉네임 + GDPR 준용)
 * GET    /api/comments        → 목록 (IP는 관리자만 원본, 공개엔 마스킹)
 * POST   /api/comments        → 누구나 작성. { name(닉네임), body, parentId?, consent:true }
 *                               GDPR: consent(동의) 필수, IP는 동의 하에 기록
 * DELETE /api/comments?id=...  → 관리자: 삭제 (잊혀질 권리 / 해당 댓글+대댓글 제거)
 *
 * GDPR 메모: 개인정보(IP, 닉네임)는 명시적 consent 시에만 저장, 공개 표시 시 IP 마스킹,
 * 원본 IP는 관리자 전용, 삭제(에러셔) 지원. 보존 최대 5000건(초과 시 오래된 것부터 정리). */
import { json, isAdmin, clientIp, maskIp, getArr, putArr, newId, bannedTerms, matchBanned } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const admin = await isAdmin(request, env);
  const arr = await getArr(env, "comments");
  const out = arr.map(function (c) {
    // Soft-deleted comments become a tombstone: original text/image are withheld,
    // only the deletion reason is shown (right to be forgotten, with an audit reason).
    if (c.deleted) {
      return {
        id: c.id, ts: c.ts, name: c.name, body: "", imageUrl: "",
        parentId: c.parentId || null, unitId: c.unitId || null,
        deleted: true, deletedReason: c.deletedReason || "", deletedTs: c.deletedTs || null,
        ip: admin ? c.ip : undefined, ipMasked: maskIp(c.ip),
      };
    }
    return {
      id: c.id, ts: c.ts, name: c.name, body: c.body, imageUrl: c.imageUrl || "",
      parentId: c.parentId || null, unitId: c.unitId || null, edited: !!c.editedTs,
      ip: admin ? c.ip : undefined, ipMasked: maskIp(c.ip),
    };
  });
  return json({ comments: out, admin: admin });
}

/* PATCH /api/comments → 관리자: 댓글 수정 / 사유와 함께 소프트 삭제
 *   { id, action: "edit", body }            → 본문 수정
 *   { id, action: "delete", reason }         → 삭제(사유 보존, 묘비 표시) — 대댓글은 유지 */
export async function onRequestPatch({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const id = body.id, action = body.action;
  if (!id) return json({ error: "id required" }, 400);
  const arr = await getArr(env, "comments");
  const c = arr.find(function (x) { return x.id === id; });
  if (!c) return json({ error: "not found" }, 404);
  const now = new Date().toISOString();
  if (action === "edit") {
    const text = (body.body || "").toString().trim().slice(0, 1000);
    if (!text) return json({ error: "empty" }, 400);
    c.body = text; c.deleted = false; c.deletedReason = ""; c.editedTs = now;
  } else if (action === "delete") {
    c.deleted = true; c.deletedReason = (body.reason || "").toString().trim().slice(0, 300); c.deletedTs = now;
  } else {
    return json({ error: "bad action" }, 400);
  }
  await putArr(env, "comments", arr);
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }

  // GDPR: 개인정보(IP·닉네임) 저장 동의 필수
  if (body.consent !== true) return json({ error: "consent_required" }, 400);

  const name = (body.name || "Anonymous").toString().trim().slice(0, 40) || "Anonymous";
  const text = (body.body || "").toString().trim().slice(0, 1000);
  const imageUrl = body.imageUrl ? String(body.imageUrl).slice(0, 500) : "";
  if (!text && !imageUrl) return json({ error: "empty" }, 400);

  // Keyword filter: reject comments (or nicknames) containing banned terms.
  if (matchBanned(await bannedTerms(env), name + " " + text)) return json({ error: "blocked_keyword" }, 400);

  const arr = await getArr(env, "comments");
  const parentId = body.parentId ? String(body.parentId).slice(0, 60) : null;
  if (parentId && !arr.some(function (c) { return c.id === parentId; })) {
    return json({ error: "parent_not_found" }, 400);
  }
  const now = new Date().toISOString();
  const c = {
    id: newId(), ts: now, name: name, body: text, imageUrl: imageUrl,
    parentId: parentId, unitId: body.unitId ? String(body.unitId).slice(0, 60) : null,
    ip: clientIp(request), consent: true, consentTs: now,
  };
  arr.unshift(c);
  await putArr(env, "comments", arr.slice(0, 5000));
  return json({ ok: true, comment: { id: c.id, ts: c.ts, name: c.name, body: c.body, imageUrl: c.imageUrl, parentId: c.parentId, ipMasked: maskIp(c.ip) } });
}

export async function onRequestDelete({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  let arr = await getArr(env, "comments");
  const before = arr.length;
  // 대상 댓글 + 그 대댓글까지 제거 (잊혀질 권리)
  arr = arr.filter(function (c) { return c.id !== id && c.parentId !== id; });
  await putArr(env, "comments", arr);
  return json({ ok: true, removed: before - arr.length });
}
