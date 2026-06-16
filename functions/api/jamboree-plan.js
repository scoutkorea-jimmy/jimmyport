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

function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }
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
    status: ["planned", "draft", "ready"].indexOf(e.status) >= 0 ? e.status : "planned",
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

  return json({ slots, marketing });
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

  // 카드(슬롯) 저장
  const slotKey = (body.slotKey || "").toString().slice(0, 120);
  if (!slotKey) return json({ error: "slotKey required" }, 400);

  let rec = { k: slotKey, edit: {}, history: [], deleted: false };
  const raw = await env.SCOUT_KV.get(SLOT(slotKey));
  if (raw) { try { rec = JSON.parse(raw); } catch {} }

  if (body.edit && typeof body.edit === "object") rec.edit = cleanEdit(body.edit);
  if (typeof body.deleted === "boolean") rec.deleted = body.deleted;
  if (body.addHistory && (body.addHistory.html != null)) {
    rec.history = Array.isArray(rec.history) ? rec.history : [];
    rec.history.push({ ts: now, author, ip, html: (body.addHistory.html || "").toString().slice(0, 30000) });
    rec.history = rec.history.slice(-200);
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
