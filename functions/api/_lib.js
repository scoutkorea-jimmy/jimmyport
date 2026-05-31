/* 공통 유틸 (파일명 _ 접두사 → 라우팅 제외) */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function isAdmin(request, env) {
  const t = request.headers.get("X-Admin-Token");
  return !!env.ADMIN_TOKEN && t === env.ADMIN_TOKEN;
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
