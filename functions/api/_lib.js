/* 공통 유틸 (파일명 _ 접두사 → 라우팅 제외) */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ── TOTP (Google Authenticator) admin auth ──────────────────────────────
// Login flow: POST /api/login { code } verifies a 6-digit TOTP code against
// env.TOTP_SECRET (a base32 secret) and returns a signed session token. Admin
// endpoints then require "Authorization: Bearer <session_token>". Sessions are
// HMAC-signed with a key derived from TOTP_SECRET, so rotating the secret
// invalidates every existing session.
const SESSION_TTL = 12 * 3600; // seconds

function base32Decode(str) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  str = String(str).toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = "";
  for (const c of str) { const v = A.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, "0"); }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return new Uint8Array(bytes);
}

function bytesToB64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hotp(keyBytes, counter) {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 0x100000000));
  dv.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const off = sig[19] & 0xf;
  const code = ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  return (code % 1000000).toString().padStart(6, "0");
}

// Verify a 6-digit TOTP code against env.TOTP_SECRET (±1 time-step tolerance).
export async function verifyTotp(env, code) {
  const secret = String(env.TOTP_SECRET || "").trim();
  if (!secret) return false;
  code = String(code || "").replace(/\D/g, "");
  if (code.length !== 6) return false;
  const key = base32Decode(secret);
  if (!key.length) return false;
  const t = Math.floor(Date.now() / 1000 / 30);
  for (let i = -1; i <= 1; i++) {
    if ((await hotp(key, t + i)) === code) return true;
  }
  return false;
}

async function sessionKey(env) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode("sess:" + String(env.TOTP_SECRET || "")),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

// Issue a signed session token: "<expEpochSec>.<base64url(hmac)>". Returns { token, exp(ms) }.
export async function issueSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const key = await sessionKey(env);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(exp))));
  return { token: exp + "." + bytesToB64url(sig), exp: exp * 1000 };
}

async function verifySession(env, token) {
  if (!env.TOTP_SECRET) return false;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return false;
  const exp = parseInt(parts[0], 10);
  if (!exp || Math.floor(Date.now() / 1000) >= exp) return false;
  const key = await sessionKey(env);
  const expected = bytesToB64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(exp)))));
  if (expected.length !== parts[1].length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
  return diff === 0;
}

// Returns a minimal admin marker ({ admin: true }) for a valid session, else null.
export async function adminUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return (await verifySession(env, m[1])) ? { admin: true } : null;
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
