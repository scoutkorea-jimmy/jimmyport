/* D-Count 신청 시스템 백엔드 (KV) — 선점(하루 한 팀)·5종 동의·신청번호+비번 발급·관리자(TOTP).
 * 마감 버퍼 없음: 슬롯은 target_date 까지 신청 가능, 지나면 마감.
 * 카드 = krjam-cardnews D-가로(텍스트/그래픽) → 사진 업로드 없음(R2 불필요).
 * KV: dcount:slots(배열) · dcount:index(배열) · dcount:app:<no> · dcount:lock:<date>
 *  - GET  /api/krjam-dcount            → 공개: { eventDate, today, slots:[{dNumber,targetDate,isOpen,occupied,slotStatus}] }
 *  - GET  /api/krjam-dcount?admin=1    → 관리자(Bearer): { slots, applications:[전체 레코드] }
 *  - POST { action:apply, ... }        → 공개: 신청 → { applicationNo, password }(1회)
 *  - POST { action:lookup|edit|withdraw, applicationNo, password, ... } → 공개(비번 검증)
 *  - PATCH { action:seed|slot|approve|reject|changes, ... } → 관리자(Bearer) */
import { json, hashPassword, verifyPassword, isAdmin, getArr, putArr, clientIp, maskIp, appendLog } from "./_lib.js";

const EVENT_DATE = "2026-08-05";
const SLOTS = "dcount:slots", INDEX = "dcount:index";
const APP = (no) => "dcount:app:" + no;
const LOCK = (d) => "dcount:lock:" + d;
const ACTIVE = ["제출됨", "수정요청", "승인"];   // 슬롯을 점유하는 상태
const EDITABLE = ["제출됨", "수정요청"];

function ymd(d) { return d.toISOString().slice(0, 10); }
function dateForDNumber(n) {
  const ev = new Date(EVENT_DATE + "T00:00:00Z");
  ev.setUTCDate(ev.getUTCDate() - n);
  return ymd(ev);
}
function today() { return ymd(new Date()); }

function randCode(len, chars) {
  const a = new Uint8Array(len); crypto.getRandomValues(a);
  let s = ""; for (let i = 0; i < len; i++) s += chars[a[i] % chars.length];
  return s;
}
const genAppNo = () => "DC-" + randCode(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
const genPassword = () => randCode(8, "abcdefghjkmnpqrstuvwxyz23456789");

function cleanCard(b) {
  const clip = (s, n) => String(s == null ? "" : s).slice(0, n);
  let si = b.sceneIdx;
  si = (si === "" || si == null) ? "" : (parseInt(si, 10) || 0);
  return {
    name: clip(b.name, 40), contact: clip(b.contact, 60), org: clip(b.org, 60),
    teaser: clip(b.teaser, 120), kicker: clip(b.kicker, 60),
    bgColor: /^#[0-9a-fA-F]{3,8}$/.test(b.bgColor || "") ? b.bgColor : "",
    inkColor: /^#[0-9a-fA-F]{3,8}$/.test(b.inkColor || "") ? b.inkColor : "",
    sceneIdx: si,
  };
}
function publicApp(rec) {
  return {
    applicationNo: rec.applicationNo, targetDate: rec.targetDate, dNumber: rec.dNumber,
    name: rec.name, contact: rec.contact, org: rec.org,
    teaser: rec.teaser, kicker: rec.kicker, bgColor: rec.bgColor, inkColor: rec.inkColor, sceneIdx: rec.sceneIdx,
    status: rec.status, rejectReason: rec.rejectReason || "",
    editable: EDITABLE.indexOf(rec.status) >= 0, createdAt: rec.createdAt, updatedAt: rec.updatedAt,
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slots = await getArr(env, SLOTS);
  const index = await getArr(env, INDEX);
  const t = today();

  if (url.searchParams.get("admin")) {
    if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
    const apps = [];
    for (const e of index) {
      const raw = await env.SCOUT_KV.get(APP(e.applicationNo));
      if (raw) { try { apps.push(JSON.parse(raw)); } catch {} }
    }
    return json({ eventDate: EVENT_DATE, today: t, slots, applications: apps });
  }

  const occ = {};
  for (const e of index) if (ACTIVE.indexOf(e.status) >= 0) occ[e.targetDate] = e.status;
  const out = slots.map((s) => {
    let st;
    if (s.targetDate < t) st = "마감";
    else if (occ[s.targetDate]) st = occ[s.targetDate] === "승인" ? "확정" : "검토중";
    else st = s.isOpen ? "신청가능" : "마감";
    return { dNumber: s.dNumber, targetDate: s.targetDate, isOpen: !!s.isOpen, occupied: !!occ[s.targetDate], slotStatus: st };
  });
  return json({ eventDate: EVENT_DATE, today: t, slots: out });
}

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = b.action;

  if (action === "lookup" || action === "edit" || action === "withdraw") {
    const no = String(b.applicationNo || "").trim().toUpperCase();
    const raw = no ? await env.SCOUT_KV.get(APP(no)) : null;
    if (!raw) return json({ ok: false, error: "not_found" }, 404);
    let rec; try { rec = JSON.parse(raw); } catch { return json({ ok: false, error: "corrupt" }, 500); }
    if (!(await verifyPassword(String(b.password || ""), rec.salt, rec.hash)))
      return json({ ok: false, error: "bad_password" }, 401);

    if (action === "lookup") return json({ ok: true, application: publicApp(rec) });

    if (action === "edit") {
      if (EDITABLE.indexOf(rec.status) < 0) return json({ ok: false, error: "not_editable" }, 409);
      Object.assign(rec, cleanCard(b), { updatedAt: new Date().toISOString() });
      await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
      const idx = await getArr(env, INDEX); const e = idx.find((x) => x.applicationNo === no);
      if (e) { e.name = rec.name; await putArr(env, INDEX, idx); }
      await appendLog(env, { ts: rec.updatedAt, action: "dcount.edit", count: 0, ip: clientIp(request) });
      return json({ ok: true, application: publicApp(rec) });
    }

    rec.status = "철회"; rec.updatedAt = new Date().toISOString();           // withdraw
    await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
    await env.SCOUT_KV.delete(LOCK(rec.targetDate));
    const idx = await getArr(env, INDEX); const e = idx.find((x) => x.applicationNo === no);
    if (e) { e.status = "철회"; await putArr(env, INDEX, idx); }
    await appendLog(env, { ts: rec.updatedAt, action: "dcount.withdraw", count: 0, ip: clientIp(request) });
    return json({ ok: true });
  }

  if (action === "apply") {
    const targetDate = String(b.targetDate || "").trim();
    const slots = await getArr(env, SLOTS);
    const slot = slots.find((s) => s.targetDate === targetDate);
    if (!slot) return json({ ok: false, error: "no_slot" }, 400);
    if (!slot.isOpen) return json({ ok: false, error: "slot_closed" }, 409);
    if (targetDate < today()) return json({ ok: false, error: "slot_passed" }, 409);
    const co = b.consents || {};
    if (!["privacy", "portrait", "thirdparty", "license", "age14"].every((k) => co[k] === true))
      return json({ ok: false, error: "consent_required" }, 400);
    if (await env.SCOUT_KV.get(LOCK(targetDate))) return json({ ok: false, error: "already_taken" }, 409);
    const idx = await getArr(env, INDEX);
    if (idx.some((e) => e.targetDate === targetDate && ACTIVE.indexOf(e.status) >= 0))
      return json({ ok: false, error: "already_taken" }, 409);

    const c = cleanCard(b);
    if (!c.name || !c.contact) return json({ ok: false, error: "missing_fields" }, 400);
    const applicationNo = genAppNo(), password = genPassword();
    const { salt, hash } = await hashPassword(password);
    const now = new Date().toISOString();
    const rec = {
      applicationNo, salt, hash, targetDate, dNumber: slot.dNumber, ...c,
      status: "제출됨", rejectReason: "",
      consents: { privacy: true, portrait: true, thirdparty: true, license: true, age14: true },
      consentAt: now, createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
    };
    await env.SCOUT_KV.put(LOCK(targetDate), applicationNo);
    await env.SCOUT_KV.put(APP(applicationNo), JSON.stringify(rec));
    idx.unshift({ applicationNo, targetDate, dNumber: slot.dNumber, name: c.name, status: "제출됨", createdAt: now });
    await putArr(env, INDEX, idx.slice(0, 2000));
    await appendLog(env, { ts: now, action: "dcount.apply", count: 0, ip: clientIp(request) });
    return json({ ok: true, applicationNo, password, targetDate, dNumber: slot.dNumber });
  }

  return json({ error: "unknown action" }, 400);
}

export async function onRequestPatch({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = b.action, now = new Date().toISOString();

  if (action === "seed") {
    const slots = await getArr(env, SLOTS);
    const have = new Set(slots.map((s) => s.dNumber));
    for (let n = 40; n >= 5; n--) if (!have.has(n)) slots.push({ dNumber: n, targetDate: dateForDNumber(n), isOpen: true });
    slots.sort((a, z) => z.dNumber - a.dNumber);
    await putArr(env, SLOTS, slots);
    await appendLog(env, { ts: now, action: "dcount.seed", count: slots.length, ip: clientIp(request) });
    return json({ ok: true, slots });
  }

  if (action === "slot") {
    const slots = await getArr(env, SLOTS);
    const s = slots.find((x) => x.dNumber === b.dNumber || x.targetDate === b.targetDate);
    if (!s) return json({ ok: false, error: "no_slot" }, 404);
    s.isOpen = !!b.isOpen;
    await putArr(env, SLOTS, slots);
    return json({ ok: true, slots });
  }

  if (action === "approve" || action === "reject" || action === "changes") {
    const no = String(b.applicationNo || "").trim().toUpperCase();
    const raw = no ? await env.SCOUT_KV.get(APP(no)) : null;
    if (!raw) return json({ ok: false, error: "not_found" }, 404);
    let rec; try { rec = JSON.parse(raw); } catch { return json({ ok: false, error: "corrupt" }, 500); }
    if (action === "approve") rec.status = "승인";
    else if (action === "changes") { rec.status = "수정요청"; rec.rejectReason = String(b.rejectReason || "").slice(0, 300); }
    else { rec.status = "반려"; rec.rejectReason = String(b.rejectReason || "").slice(0, 300); }
    rec.updatedAt = now;
    await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
    if (action === "reject") await env.SCOUT_KV.delete(LOCK(rec.targetDate));   // 반려 → 날짜 해제
    const idx = await getArr(env, INDEX); const e = idx.find((x) => x.applicationNo === no);
    if (e) { e.status = rec.status; await putArr(env, INDEX, idx); }
    await appendLog(env, { ts: now, action: "dcount." + action, count: 0, ip: clientIp(request) });
    return json({ ok: true, application: publicApp(rec) });
  }

  return json({ error: "unknown action" }, 400);
}
