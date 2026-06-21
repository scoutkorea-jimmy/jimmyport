/* 공통 유틸 (파일명 _ 접두사 → 라우팅 제외) */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ── Google Sign-In (in-app) admin auth ──────────────────────────────────
// Admin endpoints require an "Authorization: Bearer <google_id_token>" header.
// The token is verified against Google's public keys (JWKS), and the verified
// email must be in env.ADMIN_EMAILS (comma-separated). env.GOOGLE_CLIENT_ID is
// the OAuth Web Client ID and is matched against the token "aud" claim.
let _googleKeys = { keys: null, exp: 0 };

function b64urlToBytes(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4; if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function b64urlToJson(s) { return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))); }

async function googleKeys() {
  const now = Date.now();
  if (_googleKeys.keys && now < _googleKeys.exp) return _googleKeys.keys;
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!res.ok) throw new Error("jwks fetch failed");
  const data = await res.json();
  _googleKeys = { keys: data.keys || [], exp: now + 3600 * 1000 };
  return _googleKeys.keys;
}

export async function verifyGoogleIdToken(idToken, env) {
  if (!idToken) return null;
  const parts = String(idToken).split(".");
  if (parts.length !== 3) return null;
  let header, payload;
  try { header = b64urlToJson(parts[0]); payload = b64urlToJson(parts[1]); } catch { return null; }
  let jwk;
  try { jwk = (await googleKeys()).find((k) => k.kid === header.kid); } catch { return null; }
  if (!jwk) return null;
  let ok = false;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  } catch { return null; }
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) return null;
  if (payload.nbf && now < payload.nbf) return null;
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") return null;
  if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) return null;
  if (payload.email_verified !== true && payload.email_verified !== "true") return null;
  return payload;
}

function adminEmails(env) {
  return String(env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// Returns the verified admin payload ({ email, ... }) or null.
export async function adminUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const payload = await verifyGoogleIdToken(m[1], env);
  if (!payload) return null;
  const allow = adminEmails(env);
  if (!allow.length) return null;
  return allow.includes(String(payload.email || "").toLowerCase()) ? payload : null;
}

export async function isAdmin(request, env) {
  return !!(await adminUser(request, env));
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") ||
         request.headers.get("X-Forwarded-For") || "";
}

export function maskIp(ip) {
  if (!ip) return "";
  if (ip.indexOf(".") !== -1) { const p = ip.split("."); return p[0] + "." + p[1] + ".*.*"; }
  return ip.split(":").slice(0, 2).join(":") + ":***";
}

export async function getArr(env, key) {
  try { const raw = await env.SCOUT_KV.get(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export async function putArr(env, key, arr) {
  await env.SCOUT_KV.put(key, JSON.stringify(arr));
}

export async function appendLog(env, entry) {
  const arr = await getArr(env, "log");
  arr.unshift(entry);
  await putArr(env, "log", arr.slice(0, 1000));
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
