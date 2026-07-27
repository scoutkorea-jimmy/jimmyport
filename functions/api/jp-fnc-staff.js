/* 급식편의본부 운영요원 · 쉬프트 (v0.9.272)
 *
 *  GET /api/jp-fnc-staff  (공개) → { ok, staff, shifts, updatedAt, by, admin }
 *      · 관리자(fncAdmin) 면 staff[].phone(전체번호) 포함, 비관리자면 phone4(끝 4자리)만.
 *  PUT /api/jp-fnc-staff { staff, shifts }  (fncAdmin 만) → 저장
 *
 * KV "jp:fnc-staff" = { staff:[{id,name,phone}], shifts:{ "YYYY-MM-DD": { am:[id], pm:[id], eve:[id] } }, updatedAt, by }
 *
 * ⚠️ 개인정보(전화 전체)는 **관리자에게만** 내보낸다 — 비관리자 응답엔 전체번호를 절대 담지 않는다(끝 4자리만).
 * ⚠️ 쓰기는 급식 관리자(admin/admin, /api/jp-fnc-auth 토큰)만.
 */
import { json, fncAdmin } from "./_lib.js";

const KEY = "jp:fnc-staff";
const SHIFTS = ["am", "pm", "eve"];

const digits = (v) => String(v == null ? "" : v).replace(/[^0-9]/g, "").slice(0, 11);
const cleanName = (v) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, 40);
const last4 = (ph) => { const d = digits(ph); return d.length >= 4 ? d.slice(-4) : d; };

export function cleanStaff(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = {}, out = [];
  for (const s of arr.slice(0, 200)) {
    if (!s || typeof s !== "object") continue;
    const nm = cleanName(s.name);
    if (!nm) continue;                                   // 이름 필수 — 없으면 버린다
    let id = String(s.id || "").slice(0, 40) || ("s" + out.length);
    if (seen[id]) continue; seen[id] = 1;
    out.push({ id, name: nm, phone: digits(s.phone) });
  }
  return out;
}
export function cleanShifts(sh) {
  const out = {};
  if (!sh || typeof sh !== "object") return out;
  for (const d of Object.keys(sh).slice(0, 40)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const day = sh[d] && typeof sh[d] === "object" ? sh[d] : {};
    const o = {};
    for (const k of SHIFTS) {
      const ids = Array.isArray(day[k]) ? day[k].filter((x) => typeof x === "string" && x).slice(0, 60) : [];
      if (ids.length) o[k] = ids;
    }
    if (Object.keys(o).length) out[d] = o;
  }
  return out;
}

async function read(env) {
  try {
    const raw = await env.SCOUT_KV.get(KEY);
    if (!raw) return { staff: [], shifts: {}, updatedAt: null, by: "" };
    const p = JSON.parse(raw);
    return { staff: cleanStaff(p.staff), shifts: cleanShifts(p.shifts), updatedAt: p.updatedAt || null, by: String(p.by || "") };
  } catch { return { staff: [], shifts: {}, updatedAt: null, by: "" }; }
}

export async function onRequestGet({ request, env }) {
  const r = await read(env);
  const admin = !!(await fncAdmin(request, env));
  // 비관리자에겐 전체번호를 절대 내보내지 않는다 — 끝 4자리(phone4)만.
  const staff = r.staff.map((s) => admin ? { id: s.id, name: s.name, phone: s.phone } : { id: s.id, name: s.name, phone4: last4(s.phone) });
  return json({ ok: true, staff, shifts: r.shifts, updatedAt: r.updatedAt, by: r.by, admin });
}

export async function onRequestPut({ request, env }) {
  const who = await fncAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let b = {};
  try { b = await request.json(); } catch {}
  const staff = cleanStaff(b.staff), shifts = cleanShifts(b.shifts);
  const updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY, JSON.stringify({ staff, shifts, updatedAt, by: String(who.name || "급식 관리자").slice(0, 40) }));
  return json({ ok: true, staff, shifts, updatedAt, by: String(who.name || "급식 관리자"), admin: true });
}
