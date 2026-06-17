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

function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }
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

  return json({ slots, marketing, types, events });
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
