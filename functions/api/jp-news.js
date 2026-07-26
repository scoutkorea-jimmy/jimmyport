/* 대원 기사 — jamboree-plan "기사" 탭
 * 사진 2~3장 + 본문 기사. 즉시 게시 · 작성자 본인 수정 · 삭제는 관리자만.
 *
 *  GET    /api/jp-news                                       (공개) → { articles } 최신순
 *  POST   /api/jp-news   { title, body(HTML), images[] }      (대원/관리자 세션) 새 기사
 *  POST   /api/jp-news   { action:'flags', id, published?, cardnewsDone?, stage? }  (작성자·홍보부·관리자) 목차 토글·단계
 *  PUT    /api/jp-news   { id, title, body(HTML), images[] }  (작성자 본인 또는 관리자)
 *  DELETE /api/jp-news?id=<id>                                 (관리자만)
 *
 * KV: 기사 "jpn:<id>" = {id,title,subtitle,body,images,tags,stage,author,authorName,published,cardnewsDone,createdAt,updatedAt,ip}
 *
 * stage(v0.9.250): 'draft'(초안) | 'reviewed'(최종검수 완료) | 'published'(퍼블리싱 완료)
 *   ⚠️ 그 전에는 published(boolean) 하나로 '퍼블리싱 여부'만 있었다. 기존 레코드에 stage 가 없으면
 *      **읽을 때** published→'published' / 아니면 'draft' 로 유도한다(운영 KV 파괴적 쓰기 금지).
 *      저장하면 그때 stage 가 굳는다. cardnewsDone(카드뉴스 가공)은 단계와 다른 축이라 그대로 둔다.
 *     body 는 리치텍스트 HTML — 표시 시 클라이언트가 sanitizeHtml 로 정화(저장은 원문).
 *     (prefix list로 전체 조회 — jamboree-plan.js slot 패턴과 동일)
 */
import { json, memberOrAdmin, newId, clientIp, maskIp, appendLog } from "./_lib.js";

const PREFIX = "jpn:";
const KEY = (id) => PREFIX + id;
const MAX_IMG = 3;

function cleanImages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((u) => typeof u === "string" && /^\/api\/image\?id=/.test(u))
    .slice(0, MAX_IMG);
}

async function readArticle(env, id) {
  try { const raw = await env.SCOUT_KV.get(KEY(id)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

/* 단계 · 부제목 · 태그 (v0.9.250)
   ⚠️ 여기 화이트리스트에 없는 필드는 저장 때 조용히 사라진다. 클라이언트에 새 입력칸을
      추가하면 반드시 이 파일도 같이 고쳐야 한다(rules/handoff.md 데이터 소실 패턴 ①). */
export const NEWS_STAGES = ["draft", "reviewed", "published"];
export const cleanStage = (v, rec) => {
  const s = String(v || "");
  if (NEWS_STAGES.indexOf(s) >= 0) return s;
  if (rec && typeof rec.published === "boolean") return rec.published ? "published" : "draft";  // 구 boolean 유도
  return "draft";
};
const cleanTags = (v) => {
  const raw = Array.isArray(v) ? v : String(v || "").split(",");
  const out = [];
  for (const t of raw) {
    const s = String(t || "").trim().replace(/^#/, "").slice(0, 24);
    if (s && out.indexOf(s) < 0) out.push(s);
    if (out.length >= 10) break;                                   // 태그는 10개까지
  }
  return out;
};

export async function onRequestGet({ request, env }) {
  // 내부 보드 기사 — 로그인(회원 세션) 필수. 비로그인 목록 노출 차단(홍보부 전용은 아니고 회원 전체 열람).
  if (!(await memberOrAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  const articles = [];
  let cursor;
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    for (const k of res.keys) {
      const raw = await env.SCOUT_KV.get(k.name);
      if (raw) { try { articles.push(JSON.parse(raw)); } catch {} }
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  articles.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  // 구 레코드(stage 없음)를 읽을 때만 유도한다 — KV 는 건드리지 않는다
  for (const a of articles) { a.stage = cleanStage(a.stage, a); if (!Array.isArray(a.tags)) a.tags = []; if (typeof a.subtitle !== "string") a.subtitle = ""; }
  return json({ ok: true, articles });
}

export async function onRequestPost({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  if (body.action === "comment") {   // 검수 코멘트 추가
    const rec = await readArticle(env, String(body.id || ""));
    if (!rec) return json({ ok: false, error: "not_found" }, 404);
    const ctext = String(body.text || "").trim().slice(0, 1000);
    if (!ctext) return json({ ok: false, error: "empty" }, 400);
    if (!Array.isArray(rec.comments)) rec.comments = [];
    // 표시명은 세션에 서명된 name 만 신뢰 — body.authorName 은 '관리자' 사칭에 쓰일 수 있어 무시
    rec.comments.push({ id: newId(), text: ctext, author: who.username ? String(who.name || who.username).slice(0, 40) : "관리자", username: who.username || "admin", ts: new Date().toISOString(), ip: maskIp(clientIp(request)) });
    rec.comments = rec.comments.slice(-200);
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    await appendLog(env, { ts: new Date().toISOString(), action: "jpn.comment", count: 0, ip: clientIp(request) });
    return json({ ok: true, article: rec });
  }
  if (body.action === "comment_delete") {   // 코멘트 삭제(본인 또는 관리자)
    const rec = await readArticle(env, String(body.id || ""));
    if (!rec || !Array.isArray(rec.comments)) return json({ ok: false, error: "not_found" }, 404);
    const c = rec.comments.find((x) => x.id === body.commentId);
    if (!c) return json({ ok: false, error: "not_found" }, 404);
    if (!who.admin && c.username !== who.username) return json({ ok: false, error: "forbidden" }, 403);
    rec.comments = rec.comments.filter((x) => x.id !== body.commentId);
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    return json({ ok: true, article: rec });
  }
  if (body.action === "flags") {   // 목차 토글 — 퍼블리싱 여부 · 카드뉴스 가공 여부 (작성자·홍보부·관리자)
    const rec = await readArticle(env, String(body.id || ""));
    if (!rec) return json({ ok: false, error: "not_found" }, 404);
    if (!who.admin && !who.staff && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
    if (typeof body.published === "boolean") rec.published = body.published;
    if (typeof body.cardnewsDone === "boolean") rec.cardnewsDone = body.cardnewsDone;
    if (body.stage !== undefined) { rec.stage = cleanStage(body.stage, rec); rec.published = rec.stage === "published"; }
    rec.updatedAt = new Date().toISOString();
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    return json({ ok: true, article: rec });
  }
  const title = String(body.title || "").trim().slice(0, 160);
  const text = String(body.body || "").trim().slice(0, 20000);   // HTML 리치텍스트라 여유 있게
  if (!title && !text) return json({ ok: false, error: "empty" }, 400);
  const now = new Date().toISOString();
  const rec = {
    id: newId(), title, subtitle: String(body.subtitle || "").trim().slice(0, 200),
    body: text, images: cleanImages(body.images), tags: cleanTags(body.tags), stage: cleanStage(body.stage, null),
    author: who.username || "admin",
    authorName: who.username ? String(who.name || who.username).slice(0, 40) : "관리자",   // 세션 서명값만 — body.authorName 무시(사칭 차단)
    published: cleanStage(body.stage, null) === "published", cardnewsDone: false,
    createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
  };
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jpn.create", count: 0, ip: clientIp(request) });
  return json({ ok: true, article: rec });
}

export async function onRequestPut({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const rec = await readArticle(env, String(body.id || ""));
  if (!rec) return json({ ok: false, error: "not_found" }, 404);
  if (!who.admin && rec.author !== who.username) return json({ ok: false, error: "forbidden" }, 403);
  rec.title = String(body.title || "").trim().slice(0, 160);
  rec.body = String(body.body || "").trim().slice(0, 20000);   // 카드뉴스 플래그는 action:'flags' 로만 변경(여기선 보존)
  rec.images = cleanImages(body.images);
  // 안 보낸 필드는 지우지 않는다 — 빈 값과 '보내지 않음'은 다르다(빈 배열/빈 문자열은 그대로 반영된다)
  if (body.subtitle !== undefined) rec.subtitle = String(body.subtitle || "").trim().slice(0, 200);
  if (body.tags !== undefined) rec.tags = cleanTags(body.tags);
  if (body.stage !== undefined) { rec.stage = cleanStage(body.stage, rec); rec.published = rec.stage === "published"; }
  rec.updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: rec.updatedAt, action: "jpn.edit", count: 0, ip: clientIp(request) });
  return json({ ok: true, article: rec });
}

export async function onRequestDelete({ request, env }) {
  // ⚠️ 과거 adminUser(TOTP 세션 전용) 게이트라, 마스터 '회원' 세션은 401 → 클라 authExpired() 로 로그아웃되는 버그였다.
  // memberOrAdmin 으로 통일: 세션 없으면 401(재로그인), 로그인했지만 관리자/마스터 아니면 403(권한 안내, 로그아웃 아님).
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  if (!who.admin) return json({ ok: false, error: "forbidden" }, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "missing_id" }, 400);
  await env.SCOUT_KV.delete(KEY(id));
  await appendLog(env, { ts: new Date().toISOString(), action: "jpn.delete", count: 0, ip: clientIp(request) });
  return json({ ok: true });
}
