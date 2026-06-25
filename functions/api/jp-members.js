/* 대원(scout) 계정 — jamboree-plan 개별 로그인
 * 대원이 ID/PW로 자가 가입(status "pending") → 관리자(TOTP)가 승인하면 로그인 가능.
 *
 *  POST /api/jp-members { action:"register", username, password, name }  (공개)
 *  POST /api/jp-members { action:"login",    username, password }        (공개)
 *  GET  /api/jp-members                                                  (관리자) → { members }
 *  PATCH /api/jp-members { username, action:"approve"|"reject"|"reset", password? } (관리자)
 *
 * KV: 인덱스 "jpm:index" = [{username,name,status,createdAt}]
 *     레코드 "jpm:user:<username>" = {username,name,salt,hash,status,createdAt,approvedAt,ip}
 */
import { json, hashPassword, verifyPassword, issueMemberSession, adminUser,
         getArr, putArr, clientIp, maskIp, appendLog } from "./_lib.js";

const INDEX = "jpm:index";
const USER = (u) => "jpm:user:" + u;

function normUser(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
}

async function readUser(env, username) {
  try { const raw = await env.SCOUT_KV.get(USER(username)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
async function writeIndex(env, rec) {
  const idx = await getArr(env, INDEX);
  const i = idx.findIndex((m) => m.username === rec.username);
  const row = { username: rec.username, name: rec.name, status: rec.status, createdAt: rec.createdAt, type: rec.type || "일반" };
  if (i >= 0) idx[i] = row; else idx.push(row);
  await putArr(env, INDEX, idx);
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch {}
  const action = body.action;
  const ip = clientIp(request) || "noip";

  if (action === "register") {
    const username = normUser(body.username);
    const name = String(body.name || "").trim().slice(0, 40);
    const password = String(body.password || "");
    if (username.length < 3 || username.length > 24) return json({ ok: false, error: "bad_username" }, 400);
    if (!name) return json({ ok: false, error: "name_required" }, 400);
    if (password.length < 4) return json({ ok: false, error: "weak_password" }, 400);
    if (body.consent !== true) return json({ ok: false, error: "consent_required" }, 400);
    if (await readUser(env, username)) return json({ ok: false, error: "username_taken" }, 409);

    // per-IP registration throttle (5 / 10 min)
    const rlKey = "jpm:reg:" + ip;
    let regs = 0;
    try { regs = parseInt((await env.SCOUT_KV.get(rlKey)) || "0", 10) || 0; } catch {}
    if (regs >= 5) return json({ ok: false, error: "too_many_attempts" }, 429);
    try { await env.SCOUT_KV.put(rlKey, String(regs + 1), { expirationTtl: 600 }); } catch {}

    const { salt, hash } = await hashPassword(password);
    const nowIso = new Date().toISOString();
    const rec = { username, name, salt, hash, status: "pending", type: "일반",
      createdAt: nowIso, approvedAt: null, ip: maskIp(clientIp(request)),
      consentAt: nowIso };   // type: 회원 유형(관리자가 지정) · consentAt: 개인정보 동의 시각
    await env.SCOUT_KV.put(USER(username), JSON.stringify(rec));
    await writeIndex(env, rec);
    await appendLog(env, { ts: rec.createdAt, action: "jpm.register", count: 0, ip: clientIp(request) });
    return json({ ok: true, status: "pending" });
  }

  if (action === "login") {
    const username = normUser(body.username);
    const password = String(body.password || "");

    // per-IP login throttle (10 / 10 min)
    const rlKey = "jpm:login:" + ip;
    let fails = 0;
    try { fails = parseInt((await env.SCOUT_KV.get(rlKey)) || "0", 10) || 0; } catch {}
    if (fails >= 10) return json({ ok: false, error: "too_many_attempts" }, 429);

    const rec = await readUser(env, username);
    if (!rec || !(await verifyPassword(password, rec.salt, rec.hash))) {
      try { await env.SCOUT_KV.put(rlKey, String(fails + 1), { expirationTtl: 600 }); } catch {}
      return json({ ok: false, error: "invalid_login" }, 401);
    }
    if (rec.status !== "approved") return json({ ok: false, error: "pending_approval" }, 403);

    try { await env.SCOUT_KV.delete(rlKey); } catch {}
    const s = await issueMemberSession(env, { username });
    return json({ ok: true, token: s.token, exp: s.exp, name: rec.name, username, type: rec.type || "일반" });
  }

  return json({ ok: false, error: "bad_action" }, 400);
}

export async function onRequestGet({ request, env }) {
  if (!(await adminUser(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  const idx = await getArr(env, INDEX);
  idx.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, members: idx });
}

export async function onRequestPatch({ request, env }) {
  if (!(await adminUser(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const username = normUser(body.username);
  const action = body.action;
  const rec = await readUser(env, username);
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  const now = new Date().toISOString();

  if (action === "approve") {
    rec.status = "approved"; rec.approvedAt = now;
    await env.SCOUT_KV.put(USER(username), JSON.stringify(rec));
    await writeIndex(env, rec);
  } else if (action === "reject") {
    await env.SCOUT_KV.delete(USER(username));
    const idx = (await getArr(env, INDEX)).filter((m) => m.username !== username);
    await putArr(env, INDEX, idx);
  } else if (action === "reset") {
    const password = String(body.password || "");
    if (password.length < 4) return json({ ok: false, error: "weak_password" }, 400);
    const { salt, hash } = await hashPassword(password);
    rec.salt = salt; rec.hash = hash;
    await env.SCOUT_KV.put(USER(username), JSON.stringify(rec));
  } else if (action === "type") {
    rec.type = (String(body.type || "").trim()) || "일반";   // 회원 유형 지정(관리자)
    await env.SCOUT_KV.put(USER(username), JSON.stringify(rec));
    await writeIndex(env, rec);
  } else {
    return json({ ok: false, error: "bad_action" }, 400);
  }
  await appendLog(env, { ts: now, action: "jpm." + action, count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
