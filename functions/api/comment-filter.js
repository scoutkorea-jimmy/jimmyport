/* Comment keyword blocklist (admin-managed).
 * GET /api/comment-filter  → admin: { words: [custom…], defaults: [built-in…] }
 * PUT /api/comment-filter  → admin: save { words: [...] } (custom list, merged with defaults at check time)
 * The default list is always enforced; the custom list adds to it. */
import { json, isAdmin, getArr, putArr, DEFAULT_BANNED } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  const words = await getArr(env, "comments:blocklist");
  return json({ words: Array.isArray(words) ? words : [], defaults: DEFAULT_BANNED });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!Array.isArray(body.words)) return json({ error: "words array required" }, 400);
  const clean = body.words
    .map(function (w) { return String(w || "").trim().slice(0, 60); })
    .filter(Boolean)
    .filter(function (w, i, a) { return a.indexOf(w) === i; })   // dedupe
    .slice(0, 1000);
  await putArr(env, "comments:blocklist", clean);
  return json({ ok: true, count: clean.length });
}
