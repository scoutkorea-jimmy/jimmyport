/* 제16회 한국잼버리 · 미디어부 SNS 운영 캘린더 — 콘텐츠(카드)별 저장 + 업데이트 히스토리
 *  카드(콘텐츠 계획) 단위로 KV에 개별 저장 → 보드 전체를 한 덩어리로 덮어쓰지 않음.
 *   - 슬롯(카드):  "jp:s:<slotKey>" = { k, edit, history:[{ts,author,html}], deleted, updatedAt, author }
 *        slotKey 예: "2026-06-26#dcount" (시드) / "2026-07-01#extra#<id>" (추가 카드)
 *   - 마케팅:      "jp:marketing"     = { marketing:[...], updatedAt }
 *
 *  - GET  /api/jamboree-plan              → { slots:{<slotKey>:rec}, marketing }
 *  - PUT  /api/jamboree-plan  (카드 저장) → body { slotKey, edit?, deleted?, addHistory?:{html}, author }
 *  - PUT  /api/jamboree-plan  (마케팅)    → body { marketing:[...], author }
 *  - DELETE /api/jamboree-plan?slotKey=…  → 카드 KV 삭제(완전 제거)
 */
import { json, clientIp, maskIp, appendLog } from "./_lib.js";

const PREFIX = "jp:s:";
const SLOT = (k) => PREFIX + k;
const MKT = "jp:marketing";
const TYPES = "jp:types";
const EVENTS = "jp:events";
const TIMETABLE = "jp:timetable";
const ROSTER = "jp:roster";
const PLACEMENT = "jp:placement";
const TTCATS = "jp:ttcats";
const OFFTIMES = "jp:offtimes";
const CONTACTS = "jp:contacts";
const DIVISIONS = "jp:divisions";
const PROTOCOL = "jp:protocol";
const LAUNCH = "jp:launch";

function cleanDivision(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    region: (e.region || "").toString().slice(0, 60),
    federations: (e.federations || "").toString().slice(0, 400),
    leader: (e.leader || "").toString().slice(0, 60),
    ops: (e.ops || "").toString().slice(0, 60),
    safety: (e.safety || "").toString().slice(0, 60),
    support: (e.support || "").toString().slice(0, 60),
  };
}
function cleanProtocol(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    role: (e.role || "").toString().slice(0, 40),
    name: (e.name || e.person || "").toString().slice(0, 60),
    title: (e.title || "").toString().slice(0, 80),
    date: (e.date || "").toString().slice(0, 10),
    time: (e.time || "").toString().slice(0, 5),
    activity: (e.activity || "").toString().slice(0, 300),
    place: (e.place || "").toString().slice(0, 120),
    memo: (e.memo || "").toString().slice(0, 400),
  };
}
function cleanLaunch(o) {
  o = o && typeof o === "object" ? o : {};
  const steps = Array.isArray(o.steps) ? o.steps.slice(0, 40).map((s) => {
    s = s && typeof s === "object" ? s : {};
    return {
      id: (s.id || "").toString().slice(0, 40),
      time: (s.time || "").toString().slice(0, 40),
      dur: (s.dur || "").toString().slice(0, 20),
      title: (s.title || "").toString().slice(0, 200),
      note: (s.note || "").toString().slice(0, 200),
    };
  }) : [];
  return { when: (o.when || "").toString().slice(0, 80), place: (o.place || "").toString().slice(0, 120), steps };
}

function cleanContact(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    org: (e.org || "").toString().slice(0, 80),
    role: (e.role || "").toString().slice(0, 80),
    phone: (e.phone || "").toString().slice(0, 40),
    email: (e.email || "").toString().slice(0, 120),
    memo: (e.memo || "").toString().slice(0, 400),
  };
}

function cleanTtCats(arr) {
  return arr.slice(0, 40).map((p) => Array.isArray(p)
    ? [(p[0] || "").toString().slice(0, 30), (p[1] || "#7A6A57").toString().slice(0, 9)]
    : null).filter((x) => x && x[0]);
}
function cleanOff(o) {
  o = o && typeof o === "object" ? o : {};
  const out = {};
  Object.keys(o).slice(0, 200).forEach((pid) => {
    const days = o[pid]; if (!days || typeof days !== "object") return;
    const dd = {};
    Object.keys(days).slice(0, 40).forEach((d) => {
      const v = days[d]; if (!v || typeof v !== "object") return;
      const blk = {}; ["am", "pm", "eve"].forEach((k) => { if (v[k]) blk[k] = true; });
      if (Object.keys(blk).length) dd[d.toString().slice(0, 10)] = blk;
    });
    if (Object.keys(dd).length) out[pid.toString().slice(0, 40)] = dd;
  });
  return out;
}

function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }
function cleanTT(e) {
  e = e && typeof e === "object" ? e : {};
  const assignees = Array.isArray(e.assignees)
    ? e.assignees.slice(0, 30).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean)
    : [];
  const contacts = Array.isArray(e.contacts)
    ? e.contacts.slice(0, 30).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean)
    : [];
  const rundown = Array.isArray(e.rundown)
    ? e.rundown.slice(0, 80).map((r) => {
        r = r && typeof r === "object" ? r : {};
        return { time: (r.time || "").toString().slice(0, 20), title: (r.title || "").toString().slice(0, 200), note: (r.note || "").toString().slice(0, 200) };
      })
    : [];
  return {
    id: (e.id || "").toString().slice(0, 40),
    day: (e.day || "").toString().slice(0, 10),
    start: (e.start || "").toString().slice(0, 5),
    end: (e.end || "").toString().slice(0, 5),
    title: (e.title || "").toString().slice(0, 200),
    place: (e.place || "").toString().slice(0, 120),
    cat: (e.cat || "").toString().slice(0, 20),
    assignees,
    contacts,
    memo: (e.memo || "").toString().slice(0, 500),
    rundown,
  };
}
function cleanRoster(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    role: (e.role || "").toString().slice(0, 80),
    duty: (e.duty || "").toString().slice(0, 400),
    contact: (e.contact || "").toString().slice(0, 80),
    channel: (e.channel || "").toString().slice(0, 160),
  };
}
function cleanPlace(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    day: (e.day || "").toString().slice(0, 40),
    zone: (e.zone || "").toString().slice(0, 120),
    time: (e.time || "").toString().slice(0, 40),
    task: (e.task || "").toString().slice(0, 300),
  };
}
function cleanEvent(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    title: (e.title || "").toString().slice(0, 200),
    kind: (e.kind || "기타").toString().slice(0, 20),
    start: (e.start || "").toString().slice(0, 10),
    end: (e.end || e.start || "").toString().slice(0, 10),
    owner: (e.owner || "").toString().slice(0, 60),
    memo: (e.memo || "").toString().slice(0, 1000),
  };
}
function cleanEdit(e) {
  e = e && typeof e === "object" ? e : {};
  let channels = Array.isArray(e.channels)
    ? e.channels.slice(0, 8).map((c) => (c || "").toString().slice(0, 40)).filter(Boolean)
    : (e.channel ? [String(e.channel).slice(0, 40)] : []);
  if (!channels.length) channels = ["페이스북"];
  const links = {};
  const src = e.links && typeof e.links === "object" ? e.links : (e.link ? { [channels[0]]: e.link } : {});
  Object.keys(src).slice(0, 12).forEach((k) => { links[k.slice(0, 40)] = (src[k] || "").toString().slice(0, 1000); });
  const files = Array.isArray(e.files) ? e.files.slice(0, 20).map((f) => ({
    name: (f && f.name || "file").toString().slice(0, 200),
    url: (f && f.url || "").toString().slice(0, 600),
    ct: (f && f.ct || "").toString().slice(0, 100),
  })).filter((f) => f.url) : [];
  return {
    title: (e.title || "").toString().slice(0, 400),
    ctype: (e.ctype || "").toString().slice(0, 40),
    status: ["planned", "draft", "ready"].indexOf(e.status) >= 0 ? e.status : "planned",
    time: (e.time || "").toString().slice(0, 5),
    owner: (e.owner || "").toString().slice(0, 60),
    tags: (e.tags || "").toString().slice(0, 600),
    posted: !!e.posted,
    postedAt: (e.postedAt || "").toString().slice(0, 30),
    channels,
    links,
    images: Array.isArray(e.images) ? e.images.slice(0, 10).map((u) => (u || "").toString().slice(0, 600)) : [],
    files,
    category: (e.category || "").toString().slice(0, 40),
  };
}

export async function onRequestGet({ env }) {
  let cursor, names = [];
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    names = names.concat(res.keys.map((k) => k.name));
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  const slots = {};
  await Promise.all(names.map(async (name) => {
    const raw = await env.SCOUT_KV.get(name);
    if (!raw) return;
    try { slots[name.slice(PREFIX.length)] = JSON.parse(raw); } catch {}
  }));

  let marketing = null;
  const mraw = await env.SCOUT_KV.get(MKT);
  if (mraw) { try { marketing = JSON.parse(mraw).marketing; } catch {} }

  let types = null;
  const traw = await env.SCOUT_KV.get(TYPES);
  if (traw) { try { types = JSON.parse(traw).types; } catch {} }

  let events = null;
  const eraw = await env.SCOUT_KV.get(EVENTS);
  if (eraw) { try { events = JSON.parse(eraw).events; } catch {} }

  let timetable = null;
  const ttraw = await env.SCOUT_KV.get(TIMETABLE);
  if (ttraw) { try { timetable = JSON.parse(ttraw).timetable; } catch {} }

  let roster = null;
  const rraw = await env.SCOUT_KV.get(ROSTER);
  if (rraw) { try { roster = JSON.parse(rraw).roster; } catch {} }

  let placement = null;
  const praw = await env.SCOUT_KV.get(PLACEMENT);
  if (praw) { try { placement = JSON.parse(praw).placement; } catch {} }

  let ttcats = null;
  const tcraw = await env.SCOUT_KV.get(TTCATS);
  if (tcraw) { try { ttcats = JSON.parse(tcraw).ttcats; } catch {} }

  let offtimes = null;
  const ofraw = await env.SCOUT_KV.get(OFFTIMES);
  if (ofraw) { try { offtimes = JSON.parse(ofraw).offtimes; } catch {} }

  let contacts = null;
  const craw = await env.SCOUT_KV.get(CONTACTS);
  if (craw) { try { contacts = JSON.parse(craw).contacts; } catch {} }

  let divisions = null;
  const draw = await env.SCOUT_KV.get(DIVISIONS);
  if (draw) { try { divisions = JSON.parse(draw).divisions; } catch {} }

  let protocol = null;
  const proraw = await env.SCOUT_KV.get(PROTOCOL);
  if (proraw) { try { protocol = JSON.parse(proraw).protocol; } catch {} }

  let launch = null;
  const lraw = await env.SCOUT_KV.get(LAUNCH);
  if (lraw) { try { launch = JSON.parse(lraw).launch; } catch {} }

  return json({ slots, marketing, types, events, timetable, roster, placement, ttcats, offtimes, contacts, divisions, protocol, launch });
}

export async function onRequestPut({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const author = cleanName(body.author, "익명");
  const now = new Date().toISOString();
  const ip = maskIp(clientIp(request));

  // 마케팅 저장
  if (Array.isArray(body.marketing)) {
    await env.SCOUT_KV.put(MKT, JSON.stringify({ marketing: body.marketing.slice(0, 300), updatedAt: now }));
    await appendLog(env, { ts: now, action: "jp.marketing", count: 0, ip: clientIp(request) });
    return json({ ok: true, updatedAt: now });
  }

  // 콘텐츠 종류 목록 저장
  if (Array.isArray(body.types)) {
    const types = body.types.slice(0, 60).map((t) => (t || "").toString().slice(0, 40)).filter(Boolean);
    await env.SCOUT_KV.put(TYPES, JSON.stringify({ types, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 운영 일정(events) 저장
  if (Array.isArray(body.events)) {
    const events = body.events.slice(0, 300).map(cleanEvent).filter((e) => e.start);
    await env.SCOUT_KV.put(EVENTS, JSON.stringify({ events, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 일자별 시간 일정표(timetable) 저장
  if (Array.isArray(body.timetable)) {
    const timetable = body.timetable.slice(0, 400).map(cleanTT).filter((e) => e.day);
    await env.SCOUT_KV.put(TIMETABLE, JSON.stringify({ timetable, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 홍보부 인원 R&R(roster) 저장
  if (Array.isArray(body.roster)) {
    const roster = body.roster.slice(0, 100).map(cleanRoster);
    await env.SCOUT_KV.put(ROSTER, JSON.stringify({ roster, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 배치표(placement) 저장
  if (Array.isArray(body.placement)) {
    const placement = body.placement.slice(0, 300).map(cleanPlace);
    await env.SCOUT_KV.put(PLACEMENT, JSON.stringify({ placement, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 일정 종류(ttcats) 저장
  if (Array.isArray(body.ttcats)) {
    const ttcats = cleanTtCats(body.ttcats);
    await env.SCOUT_KV.put(TTCATS, JSON.stringify({ ttcats, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 취재 연락처(contacts) 저장
  if (Array.isArray(body.contacts)) {
    const contacts = body.contacts.slice(0, 300).map(cleanContact);
    await env.SCOUT_KV.put(CONTACTS, JSON.stringify({ contacts, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 인원별 오프타임(offtimes) 저장 — 객체(배열 아님)
  if (body.offtimes && typeof body.offtimes === "object" && !Array.isArray(body.offtimes)) {
    const offtimes = cleanOff(body.offtimes);
    await env.SCOUT_KV.put(OFFTIMES, JSON.stringify({ offtimes, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 분단 명단(divisions) 저장
  if (Array.isArray(body.divisions)) {
    const divisions = body.divisions.slice(0, 60).map(cleanDivision);
    await env.SCOUT_KV.put(DIVISIONS, JSON.stringify({ divisions, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 의전 일정(protocol) 저장
  if (Array.isArray(body.protocol)) {
    const protocol = body.protocol.slice(0, 200).map(cleanProtocol);
    await env.SCOUT_KV.put(PROTOCOL, JSON.stringify({ protocol, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 운영요원 발대식(launch) 저장 — 객체(배열 아님)
  if (body.launch && typeof body.launch === "object" && !Array.isArray(body.launch)) {
    const launch = cleanLaunch(body.launch);
    await env.SCOUT_KV.put(LAUNCH, JSON.stringify({ launch, updatedAt: now }));
    return json({ ok: true, updatedAt: now });
  }

  // 카드(슬롯) 저장
  const slotKey = (body.slotKey || "").toString().slice(0, 120);
  if (!slotKey) return json({ error: "slotKey required" }, 400);

  let rec = { k: slotKey, edit: {}, history: [], notes: [], deleted: false };
  const raw = await env.SCOUT_KV.get(SLOT(slotKey));
  if (raw) { try { rec = JSON.parse(raw); } catch {} }

  if (body.edit && typeof body.edit === "object") rec.edit = cleanEdit(body.edit);
  if (typeof body.deleted === "boolean") rec.deleted = body.deleted;
  if (body.addHistory && (body.addHistory.html != null)) {
    rec.history = Array.isArray(rec.history) ? rec.history : [];
    rec.history.push({ ts: now, author, ip, html: (body.addHistory.html || "").toString().slice(0, 30000) });
    rec.history = rec.history.slice(-200);
  }
  if (body.addNote && (body.addNote.text != null)) {
    rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
    rec.notes.push({ ts: now, author, ip, text: (body.addNote.text || "").toString().slice(0, 2000) });
    rec.notes = rec.notes.slice(-300);
  }
  // 일정 이동(드래그앤드랍)용: 히스토리/메모 배열 통째로 설정
  if (Array.isArray(body.setHistory)) {
    rec.history = body.setHistory.slice(-200).map((h) => ({ ts: (h && h.ts) || now, author: (h && h.author) || author, ip: (h && h.ip) || ip, html: ((h && h.html) || "").toString().slice(0, 30000) }));
  }
  if (Array.isArray(body.setNotes)) {
    rec.notes = body.setNotes.slice(-300).map((n) => ({ ts: (n && n.ts) || now, author: (n && n.author) || author, ip: (n && n.ip) || ip, text: ((n && n.text) || "").toString().slice(0, 2000) }));
  }
  rec.updatedAt = now; rec.author = author; rec.ip = ip;
  await env.SCOUT_KV.put(SLOT(slotKey), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jp.slot", count: 0, ip: clientIp(request) });
  return json({ ok: true, slot: rec });
}

export async function onRequestDelete({ request, env }) {
  const k = new URL(request.url).searchParams.get("slotKey");
  if (!k) return json({ error: "slotKey required" }, 400);
  await env.SCOUT_KV.delete(SLOT(k));
  await appendLog(env, { ts: new Date().toISOString(), action: "jp.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
