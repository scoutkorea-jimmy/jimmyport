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
import { json, hashPassword, verifyPassword, issueMemberSession, adminUser, memberOrAdmin,
         getArr, putArr, clientIp, maskIp, appendLog } from "./_lib.js";

const INDEX = "jpm:index";
const USER = (u) => "jpm:user:" + u;
const TYPES_KEY = "jpm:types";

// 회원 유형별 접근 가능한 탭. 관리자가 유형을 추가/편집(jpm:types)할 수 있다.
const ALL_TABS = ["dashboard", "news", "calendar", "list", "timetable", "staff", "contacts", "orginfo", "protocol"];
const CONTENT_TABS = ["dashboard", "news", "calendar", "list", "timetable"];
const DEFAULT_TYPES = { "일반": CONTENT_TABS.slice(), "홍보부": ALL_TABS.slice() };
async function readTypes(env) {
  const raw = await env.SCOUT_KV.get(TYPES_KEY);
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_TYPES));
  try { const o = JSON.parse(raw); return (o && typeof o === "object" && !Array.isArray(o)) ? o : JSON.parse(JSON.stringify(DEFAULT_TYPES)); }
  catch { return JSON.parse(JSON.stringify(DEFAULT_TYPES)); }
}
function cleanTypes(t) {
  const out = {};
  if (t && typeof t === "object") for (const k of Object.keys(t)) {
    const name = String(k).trim().slice(0, 20); if (!name) continue;
    const tabs = Array.isArray(t[k]) ? t[k].filter((x) => ALL_TABS.indexOf(x) >= 0) : [];
    out[name] = tabs.length ? tabs : ["dashboard"];
  }
  return Object.keys(out).length ? out : JSON.parse(JSON.stringify(DEFAULT_TYPES));
}

function normUser(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
}
// "admin" 은 관리자(TOTP) 소유 레코드의 author sentinel 로 쓰인다 — 회원이 선점하면
// jp-news/jp-assets/jp-tips 의 소유권 검사(rec.author===who.username)를 전부 통과해버린다.
const RESERVED_USERNAMES = { admin: 1, administrator: 1, system: 1, master: 1, root: 1 };

async function readUser(env, username) {
  try { const raw = await env.SCOUT_KV.get(USER(username)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
async function writeIndex(env, rec) {
  const idx = await getArr(env, INDEX);
  const i = idx.findIndex((m) => m.username === rec.username);
  const row = { username: rec.username, name: rec.name, status: rec.status, createdAt: rec.createdAt, type: rec.type || "일반", master: rec.master === true };
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
    if (username.length < 3 || username.length > 24 || RESERVED_USERNAMES[username]) return json({ ok: false, error: "bad_username" }, 400);
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
    // name·master 를 세션에 서명해 넣는다 — 이후 API 들이 KV 재조회 없이 표시명/권한을 신뢰할 수 있다
    const s = await issueMemberSession(env, { username, name: rec.name, master: rec.master === true });
    const types = await readTypes(env);
    const tabs = rec.master === true ? ALL_TABS.slice() : (types[rec.type] || types[Object.keys(types)[0]] || CONTENT_TABS);
    return json({ ok: true, token: s.token, exp: s.exp, name: rec.name, username, type: rec.type || "일반", tabs, master: rec.master === true });
  }

  if (action === "change_password") {   // 본인 비밀번호 변경 (로그인 회원)
    const who = await memberOrAdmin(request, env);
    if (!who || !who.username) return json({ ok: false, error: "unauthorized" }, 401);   // 마스터도 회원 — username 있으면 본인 변경 허용
    const rec = await readUser(env, who.username);
    if (!rec || rec.status !== "approved") return json({ ok: false, error: "invalid" }, 400);
    if (!(await verifyPassword(String(body.oldPassword || ""), rec.salt, rec.hash))) return json({ ok: false, error: "wrong_password" }, 403);
    const np = String(body.newPassword || "");
    if (np.length < 4) return json({ ok: false, error: "weak_password" }, 400);
    const h = await hashPassword(np);
    rec.salt = h.salt; rec.hash = h.hash;
    await env.SCOUT_KV.put(USER(who.username), JSON.stringify(rec));
    await appendLog(env, { ts: new Date().toISOString(), action: "jpm.changepw", count: 0, ip: clientIp(request) });
    return json({ ok: true });
  }

  return json({ ok: false, error: "bad_action" }, 400);
}

// 회원 관리 권한 = TOTP 관리자 또는 마스터 회원 (memberOrAdmin 이 둘 다 admin:true 로 판정)
async function isManager(request, env) {
  if (await adminUser(request, env)) return true;
  const who = await memberOrAdmin(request, env);
  return !!(who && who.admin);
}

export async function onRequestGet({ request, env }) {
  if (!(await isManager(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  const idx = await getArr(env, INDEX);
  idx.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json({ ok: true, members: idx, types: await readTypes(env) });
}

export async function onRequestPatch({ request, env }) {
  if (!(await isManager(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const username = normUser(body.username);
  const action = body.action;
  if (action === "types") {   // 유형 설정 추가/편집(회원 무관)
    await env.SCOUT_KV.put(TYPES_KEY, JSON.stringify(cleanTypes(body.types)));
    await appendLog(env, { ts: new Date().toISOString(), action: "jpm.types", count: 0, ip: clientIp(request) });
    return json({ ok: true, types: await readTypes(env) });
  }
  if (action === "rename_type") {   // 유형 이름 변경 + 해당 유형 회원 일괄 이전
    const from = String(body.from || "").trim(), to = String(body.to || "").trim().slice(0, 20);
    if (!from || !to) return json({ ok: false, error: "bad_name" }, 400);
    const types = await readTypes(env);
    if (types[from] != null && to !== from) {
      if (types[to] == null) types[to] = types[from];
      delete types[from];
      await env.SCOUT_KV.put(TYPES_KEY, JSON.stringify(cleanTypes(types)));
      const idx = await getArr(env, INDEX); let changed = false;
      for (const r of idx) if (r.type === from) { r.type = to; changed = true; const rec = await readUser(env, r.username); if (rec) { rec.type = to; await env.SCOUT_KV.put(USER(r.username), JSON.stringify(rec)); } }
      if (changed) await putArr(env, INDEX, idx);
    }
    await appendLog(env, { ts: new Date().toISOString(), action: "jpm.rename_type", count: 0, ip: clientIp(request) });
    return json({ ok: true, types: await readTypes(env) });
  }
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
  } else if (action === "master") {   // 마스터 지정/해제 — 재로그인 시 세션에 반영
    rec.master = body.master === true;
    await env.SCOUT_KV.put(USER(username), JSON.stringify(rec));
    await writeIndex(env, rec);
  } else {
    return json({ ok: false, error: "bad_action" }, 400);
  }
  await appendLog(env, { ts: now, action: "jpm." + action, count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
