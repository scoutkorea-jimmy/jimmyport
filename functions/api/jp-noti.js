/* 알림함 (v0.9.252) — 홍보부원 기사에 달린 검수 코멘트를 사람별로 쌓아 둔다.
 *
 *  GET  /api/jp-noti                     (회원 세션) → { items[], readAt }
 *  POST /api/jp-noti { action:'read' }   (회원 세션) → 지금까지를 읽음 처리
 *  POST /api/jp-noti { action:'clear' }  (회원 세션) → 내 알림함 비우기
 *
 * KV: "jpnt:<username>" = { items:[{id,articleId,title,who,whoName,text,ts,v}], readAt }
 *
 * ⚠️ 왜 사람별 저장소인가 — v0.9.251 의 알림은 기사 레코드에서 그때그때 뽑아 냈고 읽음 시각만
 *    기기별 localStorage 에 뒀다. 그래서 다른 기기에서 다시 안 읽음으로 보였다. 읽음 상태를
 *    서버에 두어야 기기 간에 맞는다.
 * ⚠️ 알림은 **부수 효과**다. 알림 쓰기가 실패해도 코멘트 저장은 성공해야 한다 —
 *    jp-news 쪽에서 try/catch 로 감싸 부른다(알림 때문에 본문이 안 저장되면 본말전도).
 * ⚠️ 기존 데이터를 건드리지 않는다. 새 키(jpnt:)만 쓴다.
 */
import { json, memberOrAdmin } from "./_lib.js";

const PREFIX = "jpnt:";
const KEY = (u) => PREFIX + String(u || "").slice(0, 64);
export const NOTI_MAX = 100;          // 사람당 보관 개수 — 넘으면 오래된 것부터 버린다

export async function readBox(env, username) {
  try {
    const raw = await env.SCOUT_KV.get(KEY(username));
    const box = raw ? JSON.parse(raw) : null;
    if (!box || typeof box !== "object") return { items: [], readAt: "" };
    return { items: Array.isArray(box.items) ? box.items : [], readAt: String(box.readAt || "") };
  } catch { return { items: [], readAt: "" }; }
}

/* 받는 사람 목록 — 기사 작성자 + 그 기사에 코멘트를 단 사람들. 방금 쓴 본인은 뺀다.
   (본인 코멘트가 본인에게 오면 소음이다. v0.9.251 화면 규칙과 같다.) */
export const recipientsOf = (article, actor) => {
  const out = [];
  const add = (u) => { const s = String(u || "").trim(); if (s && s !== actor && out.indexOf(s) < 0) out.push(s); };
  add(article && article.author);
  for (const c of (article && article.comments) || []) add(c.username);
  return out;
};

export const notiOf = (article, comment) => ({
  id: comment.id, articleId: article.id, title: String(article.title || "(제목 없음)").slice(0, 160),
  who: comment.username || "", whoName: String(comment.author || "").slice(0, 40),
  text: String(comment.text || "").replace(/\s+/g, " ").slice(0, 200),
  ts: comment.ts, v: comment.v || 0,
});

/* 한 사람의 알림함에 한 건 추가 — 실패해도 던지지 않는다(부수 효과이므로 호출부를 막지 않는다). */
export async function pushNoti(env, username, item) {
  try {
    const box = await readBox(env, username);
    if (box.items.some((x) => x.id === item.id)) return false;       // 같은 코멘트를 두 번 쌓지 않는다
    box.items.unshift(item);
    box.items = box.items.slice(0, NOTI_MAX);
    await env.SCOUT_KV.put(KEY(username), JSON.stringify(box));
    return true;
  } catch { return false; }
}

export async function fanoutComment(env, article, comment, actor) {
  const item = notiOf(article, comment);
  const to = recipientsOf(article, actor);
  for (const u of to) await pushNoti(env, u, item);
  return to.length;
}

export async function onRequestGet({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const box = await readBox(env, who.username || "admin");
  return json({ ok: true, items: box.items, readAt: box.readAt });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const u = who.username || "admin";
  const box = await readBox(env, u);
  if (body.action === "clear") box.items = [];
  box.readAt = new Date().toISOString();                              // read · clear 모두 읽음 시각을 올린다
  await env.SCOUT_KV.put(KEY(u), JSON.stringify(box));
  return json({ ok: true, items: box.items, readAt: box.readAt });
}
