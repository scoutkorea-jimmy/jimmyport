/* 일반 첨부파일 저장/제공 (Cloudflare KV) — 이미지 외 PDF·문서·압축 등
 * POST /api/file        → body = 파일 바이트, header content-type + X-Filename(인코딩). 최대 10MB.
 *                         KV에 file:<id> 저장 → { url:"/api/file?id=<id>", name, ct, size }
 * GET  /api/file?id=... → 파일 바이트 + content-type + 다운로드(content-disposition) */
import { json, newId } from "./_lib.js";

var MAX = 10 * 1024 * 1024; // 10MB

export async function onRequestPost({ request, env }) {
  var ct = (request.headers.get("content-type") || "application/octet-stream").split(";")[0].trim() || "application/octet-stream";
  var name = "";
  try { name = decodeURIComponent(request.headers.get("x-filename") || ""); } catch (e) { name = request.headers.get("x-filename") || ""; }
  name = (name || "file").toString().slice(0, 200);
  var buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: "empty" }, 400);
  if (buf.byteLength > MAX) return json({ error: "too_large", max: MAX }, 413);
  var id = newId();
  await env.SCOUT_KV.put("file:" + id, buf, { metadata: { ct: ct, name: name } });
  return json({ ok: true, url: "/api/file?id=" + id, name: name, ct: ct, size: buf.byteLength });
}

export async function onRequestGet({ request, env }) {
  var id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  var res = await env.SCOUT_KV.getWithMetadata("file:" + id, { type: "arrayBuffer" });
  if (!res || !res.value) return new Response("not found", { status: 404 });
  var ct = (res.metadata && res.metadata.ct) || "application/octet-stream";
  var name = (res.metadata && res.metadata.name) || "file";
  return new Response(res.value, {
    headers: {
      "content-type": ct,
      "content-disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(name),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
