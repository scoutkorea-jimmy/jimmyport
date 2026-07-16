/* D-Count 신청 시스템 백엔드 (KV) — 선점(하루 한 팀)·5종 동의·관리자(TOTP).
 *  신청번호 = 신청자 이름, 비밀번호 = 전화번호 끝 4자리.  (이름 1건 활성 + 날짜 1건 선점)
 *  슬롯 D-40~D-5 자동 생성(시딩 불필요), 관리자가 닫은 dNumber 만 CLOSED 에 저장. 마감 버퍼 없음.
 *  카드 = krjam-cardnews D-가로(텍스트/그래픽) → 사진 업로드 없음.
 *  마스터 스타일(전역 여백/크기) = 관리자 편집(dcount:style).
 *  KV: dcount:closed · dcount:index · dcount:style · dcount:app:<이름> · dcount:lock:<date> */
import { json, hashPassword, verifyPassword, isAdmin, getArr, putArr, clientIp, maskIp, appendLog } from "./_lib.js";

// 관리자 인증: 관리자 세션(TOTP) 또는 공유 비밀번호(헤더 X-CC-Pass, env.CC_PASS 기본 scout1922).
async function requireAdmin(request, env) {
  if (await isAdmin(request, env)) return true;
  const pass = (request.headers.get("X-CC-Pass") || "").trim();
  return !!(pass && pass === (env.CC_PASS || "scout1922"));
}

const EVENT_DATE = "2026-08-05";
const SLOT_HI = 40, SLOT_LO = 5;
const CLOSED = "dcount:closed", INDEX = "dcount:index", STYLE = "dcount:style";
const APP = (no) => "dcount:app:" + no;
const LOCK = (d) => "dcount:lock:" + d;
const ACTIVE = ["제출됨", "수정요청", "승인"];
const EDITABLE = ["제출됨", "수정요청"];

function ymd(d) { return d.toISOString().slice(0, 10); }
function dateForDNumber(n) { const ev = new Date(EVENT_DATE + "T00:00:00Z"); ev.setUTCDate(ev.getUTCDate() - n); return ymd(ev); }
function today() { return ymd(new Date()); }
async function buildSlots(env) {
  const closed = new Set((await getArr(env, CLOSED)).map((n) => parseInt(n, 10)));
  const out = [];
  for (let n = SLOT_HI; n >= SLOT_LO; n--) out.push({ dNumber: n, targetDate: dateForDNumber(n), isOpen: !closed.has(n) });
  return out;
}

const digits = (s) => String(s || "").replace(/\D/g, "");
const isPhone = (s) => /^01\d{8,9}$/.test(digits(s));

// ── 공격 내성: KV TTL 카운터 기반 레이트리밋(무차별 대입·폭주 방어) ──
async function rlGet(env, k) { try { return parseInt((await env.SCOUT_KV.get(k)) || "0", 10) || 0; } catch { return 0; } }
async function rlBump(env, k, ttl) { try { const n = await rlGet(env, k); await env.SCOUT_KV.put(k, String(n + 1), { expirationTtl: ttl }); } catch {} }
async function rlClear(env, k) { try { await env.SCOUT_KV.delete(k); } catch {} }

const ALLOWED_LOGOS = ["/jamboree/assets/logo.png", "/jamboree/assets/logo-white.png", "/jamboree/assets/logo-asset.png"];
function cleanStyle(s) {
  s = s || {};
  const num = (v, lo, hi, d) => { v = parseFloat(v); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
  return {
    pad: num(s.pad, 0, 16, 0), topAdj: num(s.topAdj, -80, 160, 0), botAdj: num(s.botAdj, -80, 160, 0),
    lead: num(s.lead, -40, 120, 0), gap: num(s.gap, -30, 100, 0), numScale: num(s.numScale, 0.7, 1.3, 1),
    logo: (typeof s.logo === "string" && ALLOWED_LOGOS.indexOf(s.logo) >= 0) ? s.logo : "",
    notice: typeof s.notice === "string" ? s.notice.slice(0, 300) : "",
  };
}

// D-count 전용 기록(승인/반려/철회/신청 등) — 개발 로그와 분리. 초기화해도 '초기화' 기록은 남김.
const DCLOG = "dcount:log", VISITS = "dcount:visits";
async function dcLog(env, entry) { const a = await getArr(env, DCLOG); a.unshift(entry); await putArr(env, DCLOG, a.slice(0, 500)); }
async function getStyle(env) { try { const r = await env.SCOUT_KV.get(STYLE); return r ? cleanStyle(JSON.parse(r)) : {}; } catch { return {}; } }

function cleanCard(b) {
  const clip = (s, n) => String(s == null ? "" : s).slice(0, n);
  let si = b.sceneIdx; si = (si === "" || si == null) ? "" : (parseInt(si, 10) || 0);
  return {
    name: clip(b.name, 40).trim(), contact: clip(b.contact, 60), org: clip(b.org, 60),
    teaser: clip(b.teaser, 160),   // 두 줄 허용
    bgColor: /^#[0-9a-fA-F]{3,8}$/.test(b.bgColor || "") ? b.bgColor : "",
    inkColor: /^#[0-9a-fA-F]{3,8}$/.test(b.inkColor || "") ? b.inkColor : "",
    sceneIdx: si,
  };
}
function publicApp(rec) {
  return {
    applicationNo: rec.applicationNo, targetDate: rec.targetDate, dNumber: rec.dNumber,
    name: rec.name, contact: rec.contact, org: rec.org,
    teaser: rec.teaser, bgColor: rec.bgColor, inkColor: rec.inkColor, sceneIdx: rec.sceneIdx,
    photos: rec.photos || [],
    status: rec.status, rejectReason: rec.rejectReason || "",
    editable: EDITABLE.indexOf(rec.status) >= 0, createdAt: rec.createdAt, updatedAt: rec.updatedAt,
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slots = await buildSlots(env);
  const index = await getArr(env, INDEX);
  const masterStyle = await getStyle(env);
  const t = today();

  if (url.searchParams.get("admin")) {
    if (!(await requireAdmin(request, env))) return json({ error: "unauthorized" }, 401);
    const apps = [];
    for (const e of index) { const raw = await env.SCOUT_KV.get(APP(e.applicationNo)); if (raw) { try { apps.push(JSON.parse(raw)); } catch {} } }
    return json({ eventDate: EVENT_DATE, today: t, slots, masterStyle, applications: apps, dclog: await getArr(env, DCLOG), visits: parseInt((await env.SCOUT_KV.get(VISITS)) || "0", 10) || 0 });
  }

  const occ = {};
  for (const e of index) if (ACTIVE.indexOf(e.status) >= 0) occ[e.targetDate] = e.status;
  const out = slots.map((s) => {
    // 마감(날짜 경과) 개념 없음 — 점유/관리자 닫힘만 반영
    let st;
    if (occ[s.targetDate]) st = occ[s.targetDate] === "승인" ? "확정" : "검토중";
    else st = s.isOpen ? "신청가능" : "닫힘";
    return { dNumber: s.dNumber, targetDate: s.targetDate, isOpen: !!s.isOpen, occupied: !!occ[s.targetDate], slotStatus: st };
  });
  // 승인(확정)된 디데이 카드 — krjam-planning 캘린더 연동용 공개 목록(게시용 카드+사진이라 공개 안전).
  // 홍보부가 SNS 카드뉴스를 준비하도록 사진·문구 포함.
  const approved = [];
  for (const e of index) {
    if (e.status !== "승인") continue;
    let rec = null; try { const raw = await env.SCOUT_KV.get(APP(e.applicationNo)); if (raw) rec = JSON.parse(raw); } catch {}
    approved.push({ targetDate: e.targetDate, dNumber: e.dNumber, name: e.name || "", teaser: rec ? (rec.teaser || "") : "", org: rec ? (rec.org || "") : "", photos: rec ? (rec.photos || []) : [] });
  }
  return json({ eventDate: EVENT_DATE, today: t, slots: out, masterStyle, approved });
}

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = b.action;
  const ip = clientIp(request);

  if (action === "visit") {   // 방문자 카운트(IP당 1일 1회)
    const vk = "dc:visit:" + ip;
    if (!(await env.SCOUT_KV.get(vk))) { try { const n = (parseInt((await env.SCOUT_KV.get(VISITS)) || "0", 10) || 0) + 1; await env.SCOUT_KV.put(VISITS, String(n)); await env.SCOUT_KV.put(vk, "1", { expirationTtl: 86400 }); } catch {} }
    return json({ ok: true });
  }

  if (action === "lookup" || action === "edit" || action === "withdraw" || action === "photos") {
    const no = String(b.applicationNo || "").trim().slice(0, 60);
    // 무차별 대입 방지(4자리 비번): IP·신청번호별 실패 횟수 제한
    const ipKey = "dc:rl:ip:" + ip, noKey = "dc:rl:no:" + no;
    if ((await rlGet(env, ipKey)) >= 40 || (no && (await rlGet(env, noKey)) >= 7)) return json({ ok: false, error: "rate_limited" }, 429);
    const raw = no ? await env.SCOUT_KV.get(APP(no)) : null;
    let rec = null; if (raw) { try { rec = JSON.parse(raw); } catch {} }
    if (!rec || !(await verifyPassword(digits(b.password), rec.salt, rec.hash))) {
      await rlBump(env, ipKey, 600); if (no) await rlBump(env, noKey, 1200);
      return json({ ok: false, error: "bad_credentials" }, 401);   // 존재 여부 숨김(enumeration 방지)
    }
    await rlClear(env, noKey);

    if (action === "lookup") return json({ ok: true, application: publicApp(rec) });

    if (action === "edit") {
      if (EDITABLE.indexOf(rec.status) < 0) return json({ ok: false, error: "not_editable" }, 409);
      const c = cleanCard(b);   // 카드 내용만 수정(이름·연락처는 식별자라 고정)
      Object.assign(rec, { org: c.org, teaser: c.teaser, bgColor: c.bgColor, inkColor: c.inkColor, sceneIdx: c.sceneIdx, updatedAt: new Date().toISOString() });
      await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
      await appendLog(env, { ts: rec.updatedAt, action: "dcount.edit", count: 0, ip: clientIp(request) });
      return json({ ok: true, application: publicApp(rec) });
    }

    if (action === "photos") {   // 승인된 신청만 사진 등록(최대 3장, 업로드는 /api/image)
      if (rec.status !== "승인") return json({ ok: false, error: "not_approved" }, 409);
      // 접두어만 검사하면 "…id=x\" onerror=…" 같은 속성 탈출 문자열이 통과한다 — id 전체 형식을 강제
      const photos = (Array.isArray(b.photos) ? b.photos : [])
        .filter((u) => typeof u === "string" && /^\/api\/image\?id=[A-Za-z0-9_-]+$/.test(u)).slice(0, 3);
      rec.photos = photos; rec.updatedAt = new Date().toISOString();
      await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
      await appendLog(env, { ts: rec.updatedAt, action: "dcount.photos", count: photos.length, ip: clientIp(request) });
      return json({ ok: true, application: publicApp(rec) });
    }

    rec.status = "철회"; rec.updatedAt = new Date().toISOString();   // withdraw
    await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
    await env.SCOUT_KV.delete(LOCK(rec.targetDate));
    const idx = await getArr(env, INDEX); const e = idx.find((x) => x.applicationNo === no);
    if (e) { e.status = "철회"; await putArr(env, INDEX, idx); }
    await appendLog(env, { ts: rec.updatedAt, action: "dcount.withdraw", count: 0, ip: clientIp(request) });
    await dcLog(env, { ts: rec.updatedAt, action: "철회", name: rec.name, dNumber: rec.dNumber, targetDate: rec.targetDate, ip: maskIp(clientIp(request)) });
    return json({ ok: true });
  }

  if (action === "apply") {
    if ((await rlGet(env, "dc:rl:apply:" + ip)) >= 8) return json({ ok: false, error: "rate_limited" }, 429);
    await rlBump(env, "dc:rl:apply:" + ip, 600);   // 신청 폭주·날짜 잠금 어뷰징 방지
    const targetDate = String(b.targetDate || "").trim();
    const slot = (await buildSlots(env)).find((s) => s.targetDate === targetDate);
    if (!slot) return json({ ok: false, error: "no_slot" }, 400);
    if (!slot.isOpen) return json({ ok: false, error: "slot_closed" }, 409);
    const co = b.consents || {};
    if (!["privacy", "portrait", "thirdparty", "license", "age14"].every((k) => co[k] === true)) return json({ ok: false, error: "consent_required" }, 400);
    const c = cleanCard(b);
    if (!c.name) return json({ ok: false, error: "name_required" }, 400);
    if (!isPhone(c.contact)) return json({ ok: false, error: "bad_phone" }, 400);

    const applicationNo = c.name;   // 신청번호 = 이름
    const exRaw = await env.SCOUT_KV.get(APP(applicationNo));
    if (exRaw) { try { const ex = JSON.parse(exRaw); if (ACTIVE.indexOf(ex.status) >= 0) return json({ ok: false, error: "name_taken" }, 409); } catch {} }
    if (await env.SCOUT_KV.get(LOCK(targetDate))) return json({ ok: false, error: "already_taken" }, 409);
    const idx = await getArr(env, INDEX);
    if (idx.some((e) => e.targetDate === targetDate && ACTIVE.indexOf(e.status) >= 0)) return json({ ok: false, error: "already_taken" }, 409);

    const password = digits(c.contact).slice(-4);   // 비밀번호 = 전화 끝 4자리
    const { salt, hash } = await hashPassword(password);
    const now = new Date().toISOString();
    const rec = {
      applicationNo, salt, hash, targetDate, dNumber: slot.dNumber,
      name: c.name, contact: c.contact, org: c.org, teaser: c.teaser, bgColor: c.bgColor, inkColor: c.inkColor, sceneIdx: c.sceneIdx,
      status: "제출됨", rejectReason: "",
      consents: { privacy: true, portrait: true, thirdparty: true, license: true, age14: true },
      consentAt: now, createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
    };
    await env.SCOUT_KV.put(LOCK(targetDate), applicationNo);
    await env.SCOUT_KV.put(APP(applicationNo), JSON.stringify(rec));
    const idx2 = idx.filter((e) => e.applicationNo !== applicationNo);   // 같은 이름 옛(철회/반려) 항목 제거
    idx2.unshift({ applicationNo, targetDate, dNumber: slot.dNumber, name: c.name, status: "제출됨", createdAt: now });
    await putArr(env, INDEX, idx2.slice(0, 2000));
    await appendLog(env, { ts: now, action: "dcount.apply", count: 0, ip: clientIp(request) });
    await dcLog(env, { ts: now, action: "신청", name: c.name, dNumber: slot.dNumber, targetDate, ip: maskIp(clientIp(request)) });
    return json({ ok: true, applicationNo, password, targetDate, dNumber: slot.dNumber });
  }

  return json({ error: "unknown action" }, 400);
}

export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = b.action, now = new Date().toISOString();

  if (action === "slot") {
    const dn = parseInt(b.dNumber, 10); if (!dn) return json({ ok: false, error: "no_slot" }, 404);
    const closed = new Set((await getArr(env, CLOSED)).map((n) => parseInt(n, 10)));
    if (b.isOpen) closed.delete(dn); else closed.add(dn);
    await putArr(env, CLOSED, [...closed]);
    await appendLog(env, { ts: now, action: "dcount.slot", count: closed.size, ip: clientIp(request) });
    return json({ ok: true, slots: await buildSlots(env) });
  }

  if (action === "style") {
    const st = cleanStyle(b.style);
    await env.SCOUT_KV.put(STYLE, JSON.stringify(st));
    await appendLog(env, { ts: now, action: "dcount.style", count: 0, ip: clientIp(request) });
    return json({ ok: true, masterStyle: st });
  }

  if (action === "clearlog") {
    // 기록 초기화 — 단, '초기화했다'는 기록은 무조건 남긴다(감사 추적). 라이브 전 테스트용.
    const prev = await getArr(env, DCLOG);
    await putArr(env, DCLOG, [{ ts: now, action: "기록 초기화", count: prev.length, ip: maskIp(clientIp(request)) }]);
    return json({ ok: true, cleared: prev.length });
  }

  if (action === "approve" || action === "reject" || action === "changes") {
    const no = String(b.applicationNo || "").trim();
    const raw = no ? await env.SCOUT_KV.get(APP(no)) : null;
    if (!raw) return json({ ok: false, error: "not_found" }, 404);
    let rec; try { rec = JSON.parse(raw); } catch { return json({ ok: false, error: "corrupt" }, 500); }
    if (action === "approve") { rec.status = "승인"; rec.approvedBy = String(b.by || "").slice(0, 40); }   // 승인자(관리자 전용 기록)
    else if (action === "changes") { rec.status = "수정요청"; rec.rejectReason = String(b.rejectReason || "").slice(0, 300); }
    else { rec.status = "반려"; rec.rejectReason = String(b.rejectReason || "").slice(0, 300); }
    rec.updatedAt = now;
    await env.SCOUT_KV.put(APP(no), JSON.stringify(rec));
    if (action === "reject") await env.SCOUT_KV.delete(LOCK(rec.targetDate));
    const idx = await getArr(env, INDEX); const e = idx.find((x) => x.applicationNo === no);
    if (e) { e.status = rec.status; await putArr(env, INDEX, idx); }
    await appendLog(env, { ts: now, action: "dcount." + action, count: 0, ip: clientIp(request) });
    await dcLog(env, { ts: now, action: rec.status, name: rec.name, dNumber: rec.dNumber, targetDate: rec.targetDate, reason: rec.rejectReason || "", by: action === "approve" ? (rec.approvedBy || "") : "", ip: maskIp(clientIp(request)) });
    return json({ ok: true, application: publicApp(rec) });
  }

  return json({ error: "unknown action" }, 400);
}
