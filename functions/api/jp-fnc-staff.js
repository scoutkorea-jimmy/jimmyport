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
import { json, fncAdmin, appendLog, clientIp } from "./_lib.js";
import { snapPush, snapList, snapFind, shrankTooMuch } from "./_save-guard.js";

const KEY = "jp:fnc-staff";
const SNAP_KEY = "jp:fnc-staff:snap";   // 되돌리기용 직전 상태 보관
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
  // 스냅샷 목록(내용은 빼고 시각·작성자·인원수만) — 관리자만
  if (new URL(request.url).searchParams.get("snapshots")) {
    const who0 = await fncAdmin(request, env);
    if (!who0) return json({ ok: false, error: "unauthorized" }, 401);
    const snaps = await readSnaps(env);
    return json({ ok: true, snapshots: snaps.map((x) => ({ at: x.at, by: x.by, count: (x.staff || []).length })) });
  }

  const r = await read(env);
  const admin = !!(await fncAdmin(request, env));
  // 비관리자에겐 전체번호를 절대 내보내지 않는다 — 끝 4자리(phone4)만.
  const staff = r.staff.map((s) => admin ? { id: s.id, name: s.name, phone: s.phone } : { id: s.id, name: s.name, phone4: last4(s.phone) });
  return json({ ok: true, staff, shifts: r.shifts, updatedAt: r.updatedAt, by: r.by, admin });
}

/* 스냅샷 조회·복구 — 실수로 지웠을 때 되돌리는 길. 관리자만.
   GET  /api/jp-fnc-staff?snapshots=1 → { snapshots: [{at, by, count}] }
   PUT  { restore: "<at>" }           → 그 시점으로 되돌린다(되돌리기 직전 상태도 다시 스냅샷) */
const readSnaps = (env) => snapList(env, SNAP_KEY);

/* ⚠️ **마스킹된 전화가 원본을 덮어쓰는 사고를 막는다.**
   비관리자 GET 은 전화를 끝 4자리(phone4)만 내보낸다. 화면이 그 응답을 들고 있는 동안
   (로그인 직후 재조회 실패·재조회 완료 전 저장 등) 연락처를 저장하면 **전원의 번호가
   끝 4자리로 잘려 영구 저장된다** — 개수도 그대로라 잠금·전멸 가드에 걸리지 않는다.
   그래서 서버에서 되돌린다: 저장된 번호가 9자리 이상인데 들어온 값이 그 번호의 끝 4자리와
   같으면 **화면이 마스크만 보고 있었다는 뜻**이므로 저장된 원본을 그대로 유지한다.
   진짜로 지우려면 빈 값을 보내면 된다(빈 값은 여기서 건드리지 않는다). */
export function keepMaskedPhones(prevStaff, nextStaff) {
  const prev = {};
  for (const s of Array.isArray(prevStaff) ? prevStaff : []) {
    if (s && s.name) prev[s.name] = digits(s.phone);
  }
  let kept = 0;
  for (const s of nextStaff) {
    const was = prev[s.name];
    if (!was || was.length < 9) continue;
    if (s.phone && s.phone.length <= 4 && was.slice(-4) === s.phone) { s.phone = was; kept++; }
  }
  return kept;
}

export async function onRequestPut({ request, env }) {
  const who = await fncAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let b = {};
  try { b = await request.json(); } catch {}

  // 되돌리기 — 스냅샷 시각을 주면 그 상태로 복구한다(현재 상태도 스냅샷으로 남긴다)
  if (b.restore) {
    const snaps = await readSnaps(env);
    const hit = snaps.filter((x) => x.at === String(b.restore))[0];
    if (!hit) return json({ ok: false, error: "snapshot_not_found" }, 404);
    let cur0 = null;
    try { const raw = await env.SCOUT_KV.get(KEY); if (raw) cur0 = JSON.parse(raw); } catch {}
    const at = new Date().toISOString();
    if (cur0) {
      await snapPush(env, SNAP_KEY, { at, by: String(who.name || "급식 관리자").slice(0, 40),
        staff: cur0.staff || [], shifts: cur0.shifts || {} });
    }
    await env.SCOUT_KV.put(KEY, JSON.stringify({ staff: hit.staff || [], shifts: hit.shifts || {}, updatedAt: at, by: String(who.name || "급식 관리자").slice(0, 40) }));
    try { await appendLog(env, { ts: at, action: "fnc.staff.restore", count: (hit.staff || []).length, ip: clientIp(request) }); } catch {}
    return json({ ok: true, restored: hit.at, staff: hit.staff || [], shifts: hit.shifts || {}, updatedAt: at, admin: true });
  }

  /* ⚠️ 이 PUT 은 인원·쉬프트를 **통째로** 덮어쓴다. 보호가 없으면 두 관리자가 각자 화면에서
     저장할 때 나중 사람이 앞사람 작업을 조용히 지운다(실제로 재현됨).
     그래서 클라가 불러온 시점의 updatedAt(baseVer)을 함께 받아, 그 사이 누가 저장했으면
     **저장하지 않고 409 로 최신본을 돌려준다**. 덮어쓰기보다 "다시 확인하세요"가 낫다. */
  let cur = null;
  try { const raw = await env.SCOUT_KV.get(KEY); if (raw) cur = JSON.parse(raw); } catch {}
  const storedVer = (cur && cur.updatedAt) || "";
  const baseVer = String(b.baseVer == null ? "" : b.baseVer);
  if (storedVer && baseVer !== storedVer) {
    return json({ ok: false, error: "conflict", staff: (cur && cur.staff) || [], shifts: (cur && cur.shifts) || {},
      updatedAt: storedVer, by: (cur && cur.by) || "" }, 409);
  }

  const staff = cleanStaff(b.staff), shifts = cleanShifts(b.shifts);
  /* ⚠️ 저장된 인원이 있는데 빈 목록이 올라오면 사고다(불러오기 실패 후 저장 등).
     지우려면 confirmEmpty:true 를 명시해야 한다 — 실수로 전원이 사라지지 않게. */
  const prevStaff = (cur && cur.staff) || [];
  const had = prevStaff.length;
  if (had > 0 && staff.length === 0 && b.confirmEmpty !== true) {
    return json({ ok: false, error: "empty_guard", had: had,
      message: "저장된 인원이 " + had + "명인데 빈 목록이 올라왔습니다. 의도한 삭제라면 confirmEmpty 를 보내세요." }, 409);
  }

  // 마스킹(끝 4자리)만 보고 있던 화면이 원본 번호를 잘라 덮어쓰지 못하게 되돌린다.
  const keptMasked = keepMaskedPhones(prevStaff, staff);

  /* ⚠️ **부분 전멸 가드** — empty_guard 는 딱 0 일 때만 막는다. 40명 → 3명 처럼 일부만 남는
     사고(화면이 덜 그려진 상태에서 저장 등)는 개수가 0 이 아니라 그대로 통과한다.
     절반 미만으로 줄면 여기서 멈추고, 의도한 정리면 confirmShrink 로 한 번 더 눌러 통과시킨다. */
  if (shrankTooMuch(had, staff.length) && b.confirmShrink !== true) {
    return json({ ok: false, error: "shrink_guard", had: had, now: staff.length,
      message: "저장된 인원이 " + had + "명인데 " + staff.length + "명만 올라왔습니다. 의도한 정리라면 다시 저장해 주세요." }, 409);
  }

  const updatedAt = new Date().toISOString();

  /* 덮어쓰기 전에 직전 상태를 스냅샷으로 남긴다(최근 10개, 30일).
     보호를 다 걸어도 사람이 실수로 지울 수 있다 — 되돌릴 방법이 있어야 '안정적'이다. */
  if (cur) {
    await snapPush(env, SNAP_KEY, { at: updatedAt, by: String(who.name || "급식 관리자").slice(0, 40),
      staff: cur.staff || [], shifts: cur.shifts || {} });
  }
  await env.SCOUT_KV.put(KEY, JSON.stringify({ staff, shifts, updatedAt, by: String(who.name || "급식 관리자").slice(0, 40) }));
  try { await appendLog(env, { ts: updatedAt, action: "fnc.staff.save", count: staff.length, keptMasked, ip: clientIp(request) }); } catch {}
  return json({ ok: true, staff, shifts, updatedAt, by: String(who.name || "급식 관리자"), admin: true });
}
