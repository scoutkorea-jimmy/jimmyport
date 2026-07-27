/* 급식편의본부 보드 텍스트 override (v0.9.274)
 *
 *  GET /api/jp-fnc-content              (공개) → { ok, overrides }
 *  PUT /api/jp-fnc-content { key, value }  (fncAdmin) → 한 키만 수정(RMW)
 *
 * KV "jp:fnc-content" = { overrides: { "<key>": "<수정된 문구>" }, updatedAt, by }
 *
 * 화면의 핵심 안내 문구를 관리자가 인라인으로 고치면 여기에 저장한다. 키는 클라가 '뷰+원문 해시'로
 * 안정적으로 만든다(원문 코드가 바뀌면 키가 달라져 옛 override 는 자동으로 버려지고 새 기본값이 보인다).
 * ⚠️ 읽기 공개(안내 화면이라). 쓰기는 급식 관리자(fncAdmin)만. 값은 평문 텍스트로 저장(길이 제한).
 */
import { json, fncAdmin } from "./_lib.js";

const KEY = "jp:fnc-content";

const cleanKey = (v) => String(v == null ? "" : v).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
const cleanVal = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, 800);

async function readOv(env) {
  try { const raw = await env.SCOUT_KV.get(KEY); if (raw) { const p = JSON.parse(raw); return (p && p.overrides && typeof p.overrides === "object") ? p.overrides : {}; } } catch {}
  return {};
}

export async function onRequestGet({ env }) {
  return json({ ok: true, overrides: await readOv(env) });
}

export async function onRequestPut({ request, env }) {
  const who = await fncAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let b = {};
  try { b = await request.json(); } catch {}
  const key = cleanKey(b.key);
  if (!key) return json({ ok: false, error: "bad key" }, 400);
  const ov = await readOv(env);
  const val = cleanVal(b.value);
  if (val) ov[key] = val; else delete ov[key];          // 빈 값 = override 제거(기본값 복귀)
  // 과다 방지: 최대 300개 키
  const keys = Object.keys(ov);
  if (keys.length > 300) { for (const k of keys.slice(0, keys.length - 300)) delete ov[k]; }
  await env.SCOUT_KV.put(KEY, JSON.stringify({ overrides: ov, updatedAt: new Date().toISOString(), by: String(who.name || "급식 관리자").slice(0, 40) }));
  return json({ ok: true, overrides: ov });
}
