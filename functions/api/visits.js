/* Visitor counter (aggregate, no personal data).
 * GET  /api/visits  → current total (edge-cached 60s to keep KV reads low)
 * POST /api/visits  → increment by one (client calls this at most once per browser per day,
 *                     gated by localStorage, so KV writes stay well within quota) */
import { json, jsonCacheable, cacheMatch, cachePut } from "./_lib.js";

export async function onRequestGet(ctx) {
  const hit = await cacheMatch(ctx.request);
  if (hit) return hit;
  const raw = await ctx.env.SCOUT_KV.get("visits");
  const count = raw ? (parseInt(raw, 10) || 0) : 0;
  const resp = jsonCacheable({ count }, 60);
  cachePut(ctx, resp);
  return resp;
}

export async function onRequestPost(ctx) {
  const raw = await ctx.env.SCOUT_KV.get("visits");
  const count = (raw ? (parseInt(raw, 10) || 0) : 0) + 1;
  await ctx.env.SCOUT_KV.put("visits", String(count));
  return json({ count });
}
