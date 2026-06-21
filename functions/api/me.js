/* GET /api/me → 200 { ok:true } for a valid admin session, else 401.
 * Used by the admin page to confirm a stored session token is still valid. */
import { json, adminUser } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const u = await adminUser(request, env);
  if (!u) return json({ ok: false }, 401);
  return json({ ok: true });
}
