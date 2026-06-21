/* GET /api/me → returns the verified admin identity, or 401.
 * Used by the admin page to confirm the signed-in Google account is allowed. */
import { json, adminUser } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const u = await adminUser(request, env);
  if (!u) return json({ ok: false }, 401);
  return json({ ok: true, email: u.email, name: u.name || "", picture: u.picture || "" });
}
