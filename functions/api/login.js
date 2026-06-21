/* POST /api/login { code } → verify a 6-digit TOTP code (Google Authenticator)
 * against env.TOTP_SECRET, and on success issue a signed admin session token.
 * Response: { ok:true, token, exp(ms) } | 401 invalid | 429 rate-limited | 503 unconfigured.
 * Basic per-IP brute-force guard via KV (10 failures / 10 min). */
import { json, verifyTotp, issueSession, clientIp } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.TOTP_SECRET) return json({ ok: false, error: "totp_not_configured" }, 503);

  const ip = clientIp(request) || "noip";
  const rlKey = "totp:fail:" + ip;
  let fails = 0;
  try { fails = parseInt((await env.SCOUT_KV.get(rlKey)) || "0", 10) || 0; } catch {}
  if (fails >= 10) return json({ ok: false, error: "too_many_attempts" }, 429);

  let body = {};
  try { body = await request.json(); } catch {}

  if (!(await verifyTotp(env, body.code))) {
    try { await env.SCOUT_KV.put(rlKey, String(fails + 1), { expirationTtl: 600 }); } catch {}
    return json({ ok: false, error: "invalid_code" }, 401);
  }

  try { await env.SCOUT_KV.delete(rlKey); } catch {}
  const s = await issueSession(env);
  return json({ ok: true, token: s.token, exp: s.exp });
}
