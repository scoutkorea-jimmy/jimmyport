/* 콘텐츠 현황 — 관리자 대시보드용 집계 (v0.9.258)
 *
 *  GET /api/admin-content   (관리자 TOTP 세션) → { ok, counts, latest }
 *
 * ⚠️ **읽기 전용**이고 개수·제목만 센다. 본문·연락처·개인정보는 내보내지 않는다.
 * ⚠️ KV prefix list 로 세므로 항목이 아주 많아지면 느려진다(지금 규모에서는 문제없다).
 */
import { json, isAdmin } from "./_lib.js";

const GROUPS = [
  { key: "news",    prefix: "jpn:",  label: "기사" },
  { key: "press",   prefix: "jpp:",  label: "보도자료" },
  { key: "tips",    prefix: "jpt:",  label: "소식 제보" },
  { key: "members", prefix: "jpm:",  label: "회원" },
  { key: "assets",  prefix: "jpa:",  label: "자료실" },
];

async function countPrefix(env, prefix) {
  let cursor, n = 0, names = [];
  do {
    const res = await env.SCOUT_KV.list({ prefix, cursor });
    n += res.keys.length;
    if (names.length < 400) names = names.concat(res.keys.map((k) => k.name));
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  return { n, names };
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  // 다섯 묶음을 동시에 센다(하나씩 기다리면 화면이 늦게 뜬다)
  const counts = await Promise.all(GROUPS.map(async (g) => {
    try { const r = await countPrefix(env, g.prefix); return { key: g.key, label: g.label, n: r.n }; }
    catch { return { key: g.key, label: g.label, n: null }; }
  }));
  // 최근 기사 5건 — 제목·단계·작성일만(본문 없음)
  let latest = [];
  try {
    const r = await countPrefix(env, "jpn:");
    // 최근 몇 건만 보여 주면 되므로 12개만, 그것도 동시에 읽는다
    const items = (await Promise.all(r.names.slice(0, 12).map(async (name) => {
      try { const raw = await env.SCOUT_KV.get(name); if (!raw) return null; const a = JSON.parse(raw);
        return { title: String(a.title || "").slice(0, 80), stage: String(a.stage || ""), at: a.createdAt || "" }; }
      catch { return null; }
    }))).filter(Boolean);
    items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    latest = items.slice(0, 5);
  } catch {}
  return json({ ok: true, counts, latest });
}
