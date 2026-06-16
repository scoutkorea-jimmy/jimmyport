/* 제16회 한국잼버리 · 미디어부 SNS 운영 캘린더 (콘텐츠 계획 보드) 저장 — KV
 *  단일 공유 보드(팀 전체가 같은 캘린더 편집). 토큰 없이 작성자 이름 기반.
 *  - state = {
 *      edits:     { "<date>#<type>": { title, link, images:[url], status, memo } },
 *      extra:     { "<date>": [ { id, type, category, title, link, images, status, memo } ] },
 *      marketing: [ { id, date, title, channel, memo } ],
 *      header:    { title, slogan, place, period }
 *    }
 *  - GET  /api/jamboree-plan        → { state, author, updatedAt }
 *  - PUT  /api/jamboree-plan        → 저장: body { state, author? }
 */
import { json, clientIp, appendLog } from "./_lib.js";

const KEY = "jamboree-plan";

function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }

export async function onRequestGet({ env }) {
  const raw = await env.SCOUT_KV.get(KEY);
  if (!raw) return json({ state: null, author: null, updatedAt: null });
  try { return json(JSON.parse(raw)); }
  catch { return json({ state: null, author: null, updatedAt: null }); }
}

export async function onRequestPut({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const state = body && typeof body.state === "object" && body.state ? body.state : null;
  if (!state) return json({ error: "state object required" }, 400);
  const author = cleanName(body.author, "익명");
  const updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY, JSON.stringify({ state, author, updatedAt }));
  await appendLog(env, { ts: updatedAt, action: "jamboree-plan.save", count: 0, ip: clientIp(request) });
  return json({ ok: true, author, updatedAt });
}
