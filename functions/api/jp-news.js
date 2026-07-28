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
 * version/history(v0.9.251): 기사를 고칠 때마다 version 이 1씩 오르고 history 에 그 판이 통째로 쌓인다.
 *   ⚠️ 단계(stage)·플래그 변경은 '내용 수정'이 아니므로 버전을 올리지 않는다. 내용(제목·부제목·본문·사진·태그)이
 *      실제로 달라졌을 때만 올린다 — 안 그러면 저장 한 번에 V가 튀어 기록이 의미를 잃는다.
 *   ⚠️ 검수 코멘트는 rec.comments 에 그대로 남고(버전이 올라도 유실 없음), 코멘트마다 v(달릴 당시 버전)를 찍는다.
 *      옛 코멘트에 v 가 없으면 **읽을 때** 시각으로 역산한다(KV 파괴적 쓰기 금지).
 *
 * photographer(v0.9.251): 사진 담당자 이름(홍보부 인원에서 고르거나 직접 입력). 배정은 '내용 수정'이 아니라
 *   담당 지정이므로 **버전을 올리지 않는다**(단계와 같은 축). 인원 id 가 아니라 이름을 저장한다 —
 *   명단에서 빠져도 "누가 찍기로 했는지"는 남아야 한다.
 *
 * priority(v0.9.252): 우선순위 별점 0~5, **0.5 단위**. 배정·단계와 같은 축이라 **버전을 올리지 않는다**.
 *   0 은 '미지정'이다 — 같은 별을 다시 누르면 0 으로 지운다(클라이언트 규칙).
 *
 * en(v0.9.252): 영문 가공 검토 — '' 미검토 | 'need' 영문 필요 | 'done' 영문 완료 | 'skip' 불필요.
 *   카드뉴스 가공과 같은 축(가공 트랙)이라 **버전을 올리지 않는다**. 모르는 값은 '' 로 떨어뜨린다.
 *
 * reporter/depts(v0.9.253): 취재 담당자 이름 + 협조부서 목록. 사진 담당자와 같은 축(담당 지정)이라
 *   **버전을 올리지 않는다**. 협조부서는 이름 문자열 배열(최대 10개) — id 로 묶으면 부서 목록이 바뀔 때 끊긴다.
 *
 * stage(v0.9.250): 'draft'(초안) | 'reviewed'(최종검수 완료) | 'published'(퍼블리싱 완료)
 *   ⚠️ 그 전에는 published(boolean) 하나로 '퍼블리싱 여부'만 있었다. 기존 레코드에 stage 가 없으면
 *      **읽을 때** published→'published' / 아니면 'draft' 로 유도한다(운영 KV 파괴적 쓰기 금지).
 *      저장하면 그때 stage 가 굳는다. cardnewsDone(카드뉴스 가공)은 단계와 다른 축이라 그대로 둔다.
 *     body 는 리치텍스트 HTML — 표시 시 클라이언트가 sanitizeHtml 로 정화(저장은 원문).
 *     (prefix list로 전체 조회 — jamboree-plan.js slot 패턴과 동일)
 */
import { json, memberOrAdmin, newId, clientIp, maskIp, appendLog, listRecords, byNewest } from "./_lib.js";
import { fanoutComment } from "./jp-noti.js";

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
export const EN_STATES = ["", "need", "done", "skip"];
export const cleanEn = (v) => { const s = String(v == null ? "" : v); return EN_STATES.indexOf(s) >= 0 ? s : ""; };
/* 별점 — 0~5, 0.5 단위로 스냅. 문자열·NaN·범위 밖은 0 으로 떨어뜨린다(조용히 이상한 값이 굳지 않게). */
export const cleanPriority = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(5, Math.round(n * 2) / 2);
};
export const cleanPerson = (v) => String(v || "").trim().replace(/\s+/g, " ").slice(0, 40);
/* 협조부서 — 이름 배열. 태그와 같은 방식이지만 길이를 넉넉히 준다(부서 이름은 길다). */
export const cleanDepts = (v) => {
  const raw = Array.isArray(v) ? v : String(v || "").split(",");
  const out = [];
  for (const t of raw) {
    const s = String(t || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (s && out.indexOf(s) < 0) out.push(s);
    if (out.length >= 10) break;
  }
  return out;
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

/* ── 기사 버전 (v0.9.251) ──
   history 는 "그 버전의 내용 전체"를 담는다(되돌려 보려면 그 판이 통째로 있어야 한다).
   ⚠️ KV 값 상한(25MB)이 있으므로 오래된 판부터 버린다 — 버릴 때는 historyTrimmed 에 몇 개를 버렸는지 남긴다.
      조용히 줄이면 "전부 남는다"고 믿게 된다. */
const HISTORY_MAX = 40;
const HISTORY_BYTES = 1_500_000;
export const snapOf = (rec, v, who) => ({
  v, title: rec.title || "", subtitle: rec.subtitle || "", body: rec.body || "",
  images: Array.isArray(rec.images) ? rec.images.slice() : [], tags: Array.isArray(rec.tags) ? rec.tags.slice() : [],
  at: rec.updatedAt || rec.createdAt || new Date().toISOString(),
  by: (who && who.username) || rec.author || "", byName: (who && who.name) || rec.authorName || "",
});
// 내용이 실제로 달라졌는가 — 단계·플래그만 바뀐 저장은 버전을 올리지 않는다
export const sameContent = (a, b) =>
  String(a.title || "") === String(b.title || "") &&
  String(a.subtitle || "") === String(b.subtitle || "") &&
  String(a.body || "") === String(b.body || "") &&
  JSON.stringify(a.images || []) === JSON.stringify(b.images || []) &&
  JSON.stringify(a.tags || []) === JSON.stringify(b.tags || []);
// 그 시각에 살아 있던 버전 — v 가 없는 옛 코멘트를 읽을 때 역산한다
export const versionAt = (hist, ts) => {
  if (!Array.isArray(hist) || !hist.length) return 1;
  let v = hist[0].v || 1;
  for (const h of hist) { if (String(h.at || "") <= String(ts || "")) v = h.v; else break; }
  return v;
};
const trimHistory = (rec) => {
  let dropped = 0;
  while (rec.history.length > HISTORY_MAX) { rec.history.shift(); dropped++; }
  while (rec.history.length > 1 && JSON.stringify(rec).length > HISTORY_BYTES) { rec.history.shift(); dropped++; }
  if (dropped) rec.historyTrimmed = (rec.historyTrimmed || 0) + dropped;
};
/* 옛 레코드(version 없음)를 읽을 때만 채운다 — KV 는 건드리지 않는다.
   첫 수정이 들어오면 그때 '수정 전 내용'이 V1 로 굳는다. */
const deriveVersion = (rec) => {
  if (!Array.isArray(rec.history) || !rec.history.length) { rec.version = rec.version || 1; rec.history = [snapOf(rec, rec.version, null)]; }
  if (!rec.version) rec.version = rec.history[rec.history.length - 1].v || 1;
  if (Array.isArray(rec.comments)) for (const c of rec.comments) if (!c.v) c.v = versionAt(rec.history, c.ts);
  return rec;
};

// 읽을 때만 유도하는 기본값 채우기 — KV 는 건드리지 않는다(구 레코드 호환).
const hydrate = (a) => {
  a.stage = cleanStage(a.stage, a);
  if (!Array.isArray(a.tags)) a.tags = [];
  if (typeof a.subtitle !== "string") a.subtitle = "";
  if (typeof a.photographer !== "string") a.photographer = "";
  if (typeof a.reporter !== "string") a.reporter = "";
  if (!Array.isArray(a.depts)) a.depts = [];
  a.priority = cleanPriority(a.priority);
  a.en = cleanEn(a.en);
  return deriveVersion(a);
};

/* 목록용으로 history 를 **가볍게** 만든다 (v0.9.287).
   ⚠️ history 에는 판마다 본문·사진이 통째로 들어 있다(레코드 1건이 최대 1.5MB). 목록에 그대로 실으면
      기사 수 × 판 수 만큼의 본문이 매번 브라우저로 내려간다 — 화면이 느린 두 번째 이유였다.
   화면의 '버전 기록' 목록은 v · 제목 · 작성자 · 시각만 쓴다(renderNewsHistory). 옛 판의 **본문**은
   사용자가 그 판을 실제로 열 때만 필요하므로, 그때 `GET ?id=` 로 한 건만 받아 간다. */
const lightHistory = (a) => {
  if (!Array.isArray(a.history)) return a;
  a.history = a.history.map((h) => ({ v: h.v, at: h.at, by: h.by, byName: h.byName, title: h.title }));
  return a;
};

export async function onRequestGet({ request, env }) {
  // 내부 보드 기사 — 로그인(회원 세션) 필수. 비로그인 목록 노출 차단(홍보부 전용은 아니고 회원 전체 열람).
  if (!(await memberOrAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);

  // 한 건 조회 — 옛 판 본문까지 통째로. 목록에서 뺀 것을 필요할 때 여기서 받아 간다.
  const one = new URL(request.url).searchParams.get("id");
  if (one) {
    const rec = await readArticle(env, one);
    if (!rec) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, article: hydrate(rec) });
  }

  // ⚠️ 기사 1건당 순차 KV get 이던 것을 병렬로(listRecords). 기사가 쌓일수록 화면이 느려지던 원인.
  const articles = await listRecords(env, PREFIX);
  articles.sort(byNewest);
  for (const a of articles) lightHistory(hydrate(a));
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
    // 장문 검수 의견 — 줄바꿈을 그대로 보존한다(표시는 클라이언트가 <br> 로 바꾼다)
    const ctext = String(body.text || "").replace(/\r\n/g, "\n").trim().slice(0, 4000);
    if (!ctext) return json({ ok: false, error: "empty" }, 400);
    if (!Array.isArray(rec.comments)) rec.comments = [];
    // 표시명은 세션에 서명된 name 만 신뢰 — body.authorName 은 '관리자' 사칭에 쓰일 수 있어 무시
    deriveVersion(rec);
    // 어느 판을 보고 쓴 검수 의견인지 남긴다 — 버전이 올라도 코멘트는 지우지 않는다
    rec.comments.push({ id: newId(), text: ctext, v: rec.version, author: who.username ? String(who.name || who.username).slice(0, 40) : "관리자", username: who.username || "admin", ts: new Date().toISOString(), ip: maskIp(clientIp(request)) });
    rec.comments = rec.comments.slice(-200);
    await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
    // 알림은 부수 효과다 — 여기서 터져도 코멘트 저장은 이미 끝났고, 실패가 응답을 망치면 안 된다
    try { await fanoutComment(env, rec, rec.comments[rec.comments.length - 1], who.username || "admin"); } catch {}
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
    if (body.photographer !== undefined) rec.photographer = cleanPerson(body.photographer);
    if (body.reporter !== undefined) rec.reporter = cleanPerson(body.reporter);
    if (body.depts !== undefined) rec.depts = cleanDepts(body.depts);
    if (body.priority !== undefined) rec.priority = cleanPriority(body.priority);
    if (body.en !== undefined) rec.en = cleanEn(body.en);
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
    photographer: cleanPerson(body.photographer), reporter: cleanPerson(body.reporter), depts: cleanDepts(body.depts),
    priority: cleanPriority(body.priority), en: cleanEn(body.en),
    author: who.username || "admin",
    authorName: who.username ? String(who.name || who.username).slice(0, 40) : "관리자",   // 세션 서명값만 — body.authorName 무시(사칭 차단)
    published: cleanStage(body.stage, null) === "published", cardnewsDone: false,
    version: 1, history: [],
    createdAt: now, updatedAt: now, ip: maskIp(clientIp(request)),
  };
  rec.history = [snapOf(rec, 1, who)];
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
  deriveVersion(rec);                       // 옛 레코드면 지금 내용이 V1 로 굳는다(수정 전 판이 남는다)
  const before = snapOf(rec, rec.version, null);
  rec.title = String(body.title || "").trim().slice(0, 160);
  rec.body = String(body.body || "").trim().slice(0, 20000);   // 카드뉴스 플래그는 action:'flags' 로만 변경(여기선 보존)
  rec.images = cleanImages(body.images);
  // 안 보낸 필드는 지우지 않는다 — 빈 값과 '보내지 않음'은 다르다(빈 배열/빈 문자열은 그대로 반영된다)
  if (body.subtitle !== undefined) rec.subtitle = String(body.subtitle || "").trim().slice(0, 200);
  if (body.tags !== undefined) rec.tags = cleanTags(body.tags);
  if (body.photographer !== undefined) rec.photographer = cleanPerson(body.photographer);
  if (body.reporter !== undefined) rec.reporter = cleanPerson(body.reporter);
  if (body.depts !== undefined) rec.depts = cleanDepts(body.depts);
  if (body.priority !== undefined) rec.priority = cleanPriority(body.priority);
  if (body.en !== undefined) rec.en = cleanEn(body.en);
  if (body.stage !== undefined) { rec.stage = cleanStage(body.stage, rec); rec.published = rec.stage === "published"; }
  rec.updatedAt = new Date().toISOString();
  // 단계만 바꾼 저장은 버전을 올리지 않는다 — 내용이 실제로 달라졌을 때만
  if (!sameContent(before, rec)) {
    rec.version = (rec.version || 1) + 1;
    rec.history.push(snapOf(rec, rec.version, who));
    trimHistory(rec);
  }
  await env.SCOUT_KV.put(KEY(rec.id), JSON.stringify(rec));
  await appendLog(env, { ts: rec.updatedAt, action: "jpn.edit", count: rec.version, ip: clientIp(request) });
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
