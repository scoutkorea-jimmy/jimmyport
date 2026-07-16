/* 첨부 이미지 저장/제공 (Cloudflare KV)
 * POST /api/image  → body = 이미지 바이트, header content-type. 최대 5MB.
 *                    KV에 img:<id> 로 저장, { url: "/api/image?id=<id>" } 반환.
 * GET  /api/image?id=...  → 이미지 바이트 + content-type (장기 캐시)
 * (다운스케일하는 댓글/잼버리 앱은 1~2MB 미만이라 한도 상향 영향 없음. D-count 승인 후 원본 사진 최대 5MB.) */
import { json, newId, uploadRateOk } from "./_lib.js";

var MAX = 10 * 1024 * 1024; // 10MB (현장 제보 고화질 사진 대응)
var ALLOWED = { "image/jpeg": 1, "image/png": 1, "image/gif": 1, "image/webp": 1 };

export async function onRequestPost({ request, env }) {
  var ct = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!ALLOWED[ct]) return json({ error: "unsupported_type" }, 415);
  // 공개 엔드포인트(제보·디데이 사진) — IP당 업로드 상한이 없으면 KV 를 무한정 채울 수 있다
  if (!(await uploadRateOk(env, request, "img"))) return json({ error: "too_many" }, 429);
  var buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: "empty" }, 400);
  if (buf.byteLength > MAX) return json({ error: "too_large" }, 413);
  var id = newId();
  await env.SCOUT_KV.put("img:" + id, buf, { metadata: { ct: ct } });
  return json({ ok: true, url: "/api/image?id=" + id });
}

export async function onRequestGet({ request, env }) {
  var id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  var res = await env.SCOUT_KV.getWithMetadata("img:" + id, { type: "arrayBuffer" });
  if (!res || !res.value) return new Response("not found", { status: 404 });
  var ct = (res.metadata && res.metadata.ct) || "application/octet-stream";
  return new Response(res.value, { headers: { "content-type": ct, "cache-control": "public, max-age=31536000, immutable" } });
}
