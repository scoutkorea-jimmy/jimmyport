/* 대용량 파일 저장/제공 (Cloudflare R2) — 자료실 첨부 1개당 최대 100MB
 *  KV 는 값 1개당 25MiB 가 한계라 대용량 파일을 담을 수 없어 R2 를 쓴다.
 *  업로드는 8MiB 청크 멀티파트 — Workers 요청 본문 100MB 제한에 걸리지 않고 진행률도 얻는다.
 *
 *  POST /api/r2?action=create   {name, ct, size}          (회원/관리자) → { key, uploadId }
 *  PUT  /api/r2?action=part&key=&uploadId=&part=N  body=청크 바이트 (회원/관리자) → { partNumber, etag }
 *  POST /api/r2?action=complete {key, uploadId, parts[]}  (회원/관리자) → { url, name, ct, size }
 *  POST /api/r2?action=abort    {key, uploadId}           (회원/관리자)
 *  GET  /api/r2?id=<key>  → 파일 스트림 + 다운로드 헤더 (공개 — /api/file 과 동일)
 *       &inline=1 → inline 으로 내려 미리보기(iframe)에 띄울 수 있다.
 *  DELETE /api/r2?id=<key> (회원/관리자)
 */
import { json, memberOrAdmin, newId, clientIp, appendLog } from "./_lib.js";

const MAX = 100 * 1024 * 1024; // 파일 1개당 100MB
const PART_MAX = 12 * 1024 * 1024; // 청크 1개 상한 (클라 8MiB + 여유)
const KEY_RE = /^jpa\/[A-Za-z0-9-]{8,64}$/; // 서버가 만든 키만 허용 → 경로 조작 차단

function bucket(env) {
  return env.SCOUT_R2 || null;
}

export async function onRequestPost({ request, env }) {
  const b = bucket(env);
  if (!b) return json({ ok: false, error: "r2_unbound" }, 503);
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);

  const action = new URL(request.url).searchParams.get("action") || "";
  let body = {};
  try { body = await request.json(); } catch {}

  if (action === "create") {
    const size = Number(body.size || 0);
    if (!(size > 0)) return json({ ok: false, error: "empty" }, 400);
    if (size > MAX) return json({ ok: false, error: "too_large", max: MAX }, 413);
    const name = String(body.name || "file").slice(0, 200);
    const ct = (String(body.ct || "").split(";")[0].trim()) || "application/octet-stream";
    const key = "jpa/" + newId();
    const mpu = await b.createMultipartUpload(key, {
      httpMetadata: { contentType: ct },
      customMetadata: { name, ct },
    });
    return json({ ok: true, key, uploadId: mpu.uploadId });
  }

  if (action === "complete") {
    const key = String(body.key || ""), uploadId = String(body.uploadId || "");
    if (!KEY_RE.test(key) || !uploadId) return json({ ok: false, error: "bad_key" }, 400);
    const parts = (Array.isArray(body.parts) ? body.parts : [])
      .map((p) => ({ partNumber: Number(p && p.partNumber), etag: String((p && p.etag) || "") }))
      .filter((p) => p.partNumber >= 1 && p.etag);
    if (!parts.length) return json({ ok: false, error: "no_parts" }, 400);
    const mpu = b.resumeMultipartUpload(key, uploadId);
    let obj;
    try {
      obj = await mpu.complete(parts);
    } catch (e) {
      return json({ ok: false, error: "complete_failed", detail: String((e && e.message) || e).slice(0, 200) }, 400);
    }
    // 클라가 create 의 size 를 속여도 여기서 실제 크기로 최종 차단
    if (obj && obj.size > MAX) {
      try { await b.delete(key); } catch {}
      return json({ ok: false, error: "too_large", max: MAX }, 413);
    }
    const name = String(body.name || (obj && obj.customMetadata && obj.customMetadata.name) || "file").slice(0, 200);
    const ct = (obj && obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream";
    await appendLog(env, { ts: new Date().toISOString(), action: "r2.put", count: 0, ip: clientIp(request) });
    return json({ ok: true, url: "/api/r2?id=" + encodeURIComponent(key), name, ct, size: (obj && obj.size) || 0 });
  }

  if (action === "abort") {
    const key = String(body.key || ""), uploadId = String(body.uploadId || "");
    if (!KEY_RE.test(key) || !uploadId) return json({ ok: false, error: "bad_key" }, 400);
    try { await b.resumeMultipartUpload(key, uploadId).abort(); } catch {}
    return json({ ok: true });
  }

  return json({ ok: false, error: "bad_action" }, 400);
}

export async function onRequestPut({ request, env }) {
  const b = bucket(env);
  if (!b) return json({ ok: false, error: "r2_unbound" }, 503);
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);

  const q = new URL(request.url).searchParams;
  if ((q.get("action") || "") !== "part") return json({ ok: false, error: "bad_action" }, 400);
  const key = String(q.get("key") || ""), uploadId = String(q.get("uploadId") || "");
  const partNumber = Number(q.get("part") || 0);
  if (!KEY_RE.test(key) || !uploadId) return json({ ok: false, error: "bad_key" }, 400);
  if (!(partNumber >= 1 && partNumber <= 10000)) return json({ ok: false, error: "bad_part" }, 400);

  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ ok: false, error: "empty" }, 400);
  if (buf.byteLength > PART_MAX) return json({ ok: false, error: "part_too_large" }, 413);

  const mpu = b.resumeMultipartUpload(key, uploadId);
  let part;
  try {
    part = await mpu.uploadPart(partNumber, buf);
  } catch (e) {
    return json({ ok: false, error: "part_failed", detail: String((e && e.message) || e).slice(0, 200) }, 400);
  }
  return json({ ok: true, partNumber: part.partNumber, etag: part.etag });
}

export async function onRequestGet({ request, env }) {
  const b = bucket(env);
  if (!b) return new Response("r2 unbound", { status: 503 });
  const u = new URL(request.url);
  const key = u.searchParams.get("id") || "";
  if (!KEY_RE.test(key)) return new Response("missing id", { status: 400 });
  const obj = await b.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  const name = (obj.customMetadata && obj.customMetadata.name) || "file";
  const ct = (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream";
  const disp = u.searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new Response(obj.body, {
    headers: {
      "content-type": ct,
      "content-length": String(obj.size),
      "content-disposition": disp + "; filename*=UTF-8''" + encodeURIComponent(name),
      "cache-control": "public, max-age=31536000, immutable",
      etag: obj.httpEtag,
    },
  });
}

export async function onRequestDelete({ request, env }) {
  const b = bucket(env);
  if (!b) return json({ ok: false, error: "r2_unbound" }, 503);
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const key = new URL(request.url).searchParams.get("id") || "";
  if (!KEY_RE.test(key)) return json({ ok: false, error: "bad_key" }, 400);
  try { await b.delete(key); } catch {}
  return json({ ok: true });
}
