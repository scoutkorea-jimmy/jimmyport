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

// ── member accounts (scouts) — password hashing + signed sessions ─────────
// Members self-register (status "pending") and an admin (TOTP) approves them.
// Passwords are stored as PBKDF2-SHA256(salt) only; sessions are HMAC-signed
// with a key derived from TOTP_SECRET (rotating the secret logs everyone out).
const MEMBER_TTL = 12 * 3600; // seconds
const PBKDF2_ITERS = 100000;

function b64encode(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(str) {
  const bin = atob(String(str || ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password, saltBytes) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(password)), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERS, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

// Hash a password. Returns { salt, hash } (both base64). Pass an existing salt
// (base64) to reproduce a stored hash for verification.
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64decode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return { salt: b64encode(salt), hash: b64encode(hash) };
}

// Constant-time check of a password against a stored salt+hash (both base64).
export async function verifyPassword(password, saltB64, hashB64) {
  if (!saltB64 || !hashB64) return false;
  const { hash } = await hashPassword(password, saltB64);
  if (hash.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

async function memberKey(env) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode("member:" + String(env.TOTP_SECRET || "")),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

// Issue a signed member session token: "<base64url(payload)>.<base64url(hmac)>".
export async function issueMemberSession(env, payload) {
  const body = Object.assign({}, payload, { exp: Math.floor(Date.now() / 1000) + MEMBER_TTL });
  const p = bytesToB64url(new TextEncoder().encode(JSON.stringify(body)));
  const key = await memberKey(env);
  const sig = bytesToB64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(p))));
  return { token: p + "." + sig, exp: body.exp * 1000 };
}

// Verify a member session token. Returns the payload ({username, exp}) or null.
export async function verifyMemberSession(env, token) {
  if (!env.TOTP_SECRET) return null;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const key = await memberKey(env);
  const expected = bytesToB64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts[0]))));
  if (expected.length !== parts[1].length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
  if (diff !== 0) return null;
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(b64decode(parts[0].replace(/-/g, "+").replace(/_/g, "/")))); }
  catch { return null; }
  if (!payload || !payload.exp || Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload;
}

// Resolve the caller's identity from the Bearer token: an admin (TOTP) session
// wins, else a member session. Member payload may carry {name, master, staff} (signed at login):
// master members get admin:true — full board admin without the shared TOTP code.
// staff = 홍보부(관리 탭 보유) 또는 마스터 — 제보자 개인정보 등 홍보부 전용 데이터 접근 판정용.
// Returns { admin:true, staff:true } | { username, name, admin, master, staff } | null.
export async function memberOrAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const tok = m[1];
  if (await verifySession(env, tok)) return { admin: true, staff: true };
  const p = await verifyMemberSession(env, tok);
  return p ? { username: p.username, name: p.name || "", admin: !!p.master, master: !!p.master, staff: !!(p.master || p.staff) } : null;
}

// 공개 업로드 엔드포인트용 IP 레이트리밋 (KV TTL 카운터, 40건/10분)
export async function uploadRateOk(env, request, bucket) {
  const ip = clientIp(request) || "noip";
  const key = bucket + ":rl:" + ip;
  let n = 0;
  try { n = parseInt((await env.SCOUT_KV.get(key)) || "0", 10) || 0; } catch {}
  if (n >= 40) return false;   // 제보 사진 10장 + 여유
  try { await env.SCOUT_KV.put(key, String(n + 1), { expirationTtl: 600 }); } catch {}
  return true;
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

// ── comment keyword blocklist (moderation) ──────────────────────────────
// Default banned terms (profanity / spam). Admins can add more via KV "comments:blocklist".
export const DEFAULT_BANNED = [
  "fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot", "dick", "pussy", "whore", "slut",
  "viagra", "casino", "porn", "sex cam",
  "씨발", "시발", "씨발놈", "개새끼", "병신", "좆", "좆같", "지랄", "니미", "썅", "보지", "자지",
];

export async function bannedTerms(env) {
  let custom = [];
  try { custom = await getArr(env, "comments:blocklist"); } catch { custom = []; }
  return DEFAULT_BANNED.concat(Array.isArray(custom) ? custom : []);
}

// Returns the first matched banned term in `text`, or null. Matches case-insensitively
// on both the raw text and a punctuation/space-stripped version (catches "f.u.c.k").
export function matchBanned(terms, text) {
  const lo = String(text || "").toLowerCase();
  const tight = lo.replace(/[^a-z0-9가-힣]/g, "");
  for (const w of terms) {
    const wl = String(w || "").toLowerCase().trim();
    if (!wl) continue;
    const wt = wl.replace(/[^a-z0-9가-힣]/g, "");
    if (lo.indexOf(wl) !== -1 || (wt && tight.indexOf(wt) !== -1)) return w;
  }
  return null;
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

// ── edge response cache (Cloudflare Cache API) — serves repeat GETs from the
//    nearest data center instead of re-reading KV. Faster + far fewer KV reads.
//    Writes purge the key so admin edits show up promptly (TTL is the upper bound).
function cacheKeyFor(request) {
  const u = new URL(request.url);
  return new Request(u.origin + u.pathname + u.search, { method: "GET" });
}
export function jsonCacheable(data, ttl) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + ttl },
  });
}
export async function cacheMatch(request) {
  try { return await caches.default.match(cacheKeyFor(request)); } catch { return null; }
}
export function cachePut(ctx, response) {
  try { ctx.waitUntil(caches.default.put(cacheKeyFor(ctx.request), response.clone())); } catch (e) {}
}
export function cachePurge(ctx, path) {
  try { const u = new URL(ctx.request.url); ctx.waitUntil(caches.default.delete(new Request(u.origin + path, { method: "GET" }))); } catch (e) {}
}
