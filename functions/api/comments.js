/* 댓글 (레딧식 쓰레드 + 닉네임 + GDPR 준용)
 * GET    /api/comments        → 목록 (IP는 관리자만 원본, 공개엔 마스킹)
 * POST   /api/comments        → 누구나 작성. { name(닉네임), body, parentId?, consent:true }
 *                               GDPR: consent(동의) 필수, IP는 동의 하에 기록
 * DELETE /api/comments?id=...  → 관리자: 삭제 (잊혀질 권리 / 해당 댓글+대댓글 제거)
 *
 * GDPR 메모: 개인정보(IP, 닉네임)는 명시적 consent 시에만 저장, 공개 표시 시 IP 마스킹,
 * 원본 IP는 관리자 전용, 삭제(에러셔) 지원. 보존 최대 5000건(초과 시 오래된 것부터 정리). */
import { json, isAdmin, clientIp, maskIp, getArr, putArr, newId } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const admin = isAdmin(request, env);
  const arr = await getArr(env, "comments");
  const out = arr.map(function (c) {
    return {
      id: c.id, ts: c.ts, name: c.name, body: c.body,
      parentId: c.parentId || null, unitId: c.unitId || null,
      ip: admin ? c.ip : undefined, ipMasked: maskIp(c.ip),
    };
  });
  return json({ comments: out, admin: admin });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }

  // GDPR: 개인정보(IP·닉네임) 저장 동의 필수
  if (body.consent !== true) return json({ error: "consent_required" }, 400);

  const name = (body.name || "익명").toString().trim().slice(0, 40) || "익명";
  const text = (body.body || "").toString().trim().slice(0, 1000);
  if (!text) return json({ error: "empty" }, 400);

  const arr = await getArr(env, "comments");
  const parentId = body.parentId ? String(body.parentId).slice(0, 60) : null;
  if (parentId && !arr.some(function (c) { return c.id === parentId; })) {
    return json({ error: "parent_not_found" }, 400);
  }
  const now = new Date().toISOString();
  const c = {
    id: newId(), ts: now, name: name, body: text,
    parentId: parentId, unitId: body.unitId ? String(body.unitId).slice(0, 60) : null,
    ip: clientIp(request), consent: true, consentTs: now,
  };
  arr.unshift(c);
  await putArr(env, "comments", arr.slice(0, 5000));
  return json({ ok: true, comment: { id: c.id, ts: c.ts, name: c.name, body: c.body, parentId: c.parentId, ipMasked: maskIp(c.ip) } });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  let arr = await getArr(env, "comments");
  const before = arr.length;
  // 대상 댓글 + 그 대댓글까지 제거 (잊혀질 권리)
  arr = arr.filter(function (c) { return c.id !== id && c.parentId !== id; });
  await putArr(env, "comments", arr);
  return json({ ok: true, removed: before - arr.length });
}
