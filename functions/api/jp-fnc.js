/* 급식편의본부 담당 배정 (v0.9.253)
 *
 *  GET /api/jp-fnc                       (공개) → { ok, duties, updatedAt, by }
 *  PUT /api/jp-fnc { duties }            (회원 세션) 담당 배정 저장
 *
 * KV: "jp:fnc" = { duties: { <업무키>: { main, sub, note } }, updatedAt, by }
 *
 * ⚠️ **읽기는 공개**다. /krjam-fnc 는 로그인 없는 안내 화면이라 그래야 담당자가 보인다.
 *    본부 인원 이름은 이미 그 화면(조직도)에 있는 것과 같은 성격이고, 연락처는 담지 않는다.
 * ⚠️ **쓰기는 회원 세션**만. 홍보부 보드(/krjam-planning)에 로그인해 두면 같은 세션으로 배정할 수 있다.
 * ⚠️ 업무키는 서버 화이트리스트(DUTY_KEYS)로 막는다 — 목록에 없는 키는 조용히 버린다.
 *    (없는 키를 받아 주면 화면에 안 보이는 값이 쌓이고, 그게 '저장됐는데 안 보인다'가 된다.)
 */
import { json, memberOrAdmin } from "./_lib.js";

const KEY = "jp:fnc";

/* 배정 대상 — 화면(krjam-fnc/board.js DUTIES)과 같은 순서·같은 키여야 한다. */
export const DUTY_KEYS = [
  "supply",     // 식자재 보급소
  "hall1",      // 1식당(본 식당)
  "hall2",      // 2식당(패스트트랙·특별식)
  "hall3",      // 3식당(중식 보급·보관)
  "bookcafe",   // 잼버리 북카페(IST라운지)
  "cu",         // 편의점 CU
  "coffee",     // 이디야 커피차
  "lounge",     // 소모임(미니 라운지)
  "inout",      // 입·퇴영 지원
  "safety",     // 상황 보고 · 안전
];

const person = (v) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, 60);
const note = (v) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, 120);

export const cleanDuties = (d) => {
  const out = {};
  if (!d || typeof d !== "object") return out;
  for (const k of DUTY_KEYS) {
    const r = d[k] && typeof d[k] === "object" ? d[k] : null;
    if (!r) continue;
    const main = person(r.main), sub = person(r.sub), nt = note(r.note);
    if (!main && !sub && !nt) continue;          // 빈 배정은 저장하지 않는다(지우기 = 빈 값 보내기)
    out[k] = { main: main, sub: sub, note: nt };
  }
  return out;
};

async function read(env) {
  try {
    const raw = await env.SCOUT_KV.get(KEY);
    if (!raw) return { duties: {}, updatedAt: null, by: "" };
    const p = JSON.parse(raw);
    return { duties: cleanDuties(p.duties), updatedAt: p.updatedAt || null, by: String(p.by || "") };
  } catch { return { duties: {}, updatedAt: null, by: "" }; }
}

export async function onRequestGet({ env }) {
  const r = await read(env);
  return json({ ok: true, duties: r.duties, updatedAt: r.updatedAt, by: r.by });
}

export async function onRequestPut({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const duties = cleanDuties(body.duties);
  const rec = { duties, updatedAt: new Date().toISOString(), by: String(who.name || who.username || "").slice(0, 40) };
  await env.SCOUT_KV.put(KEY, JSON.stringify(rec));
  return json({ ok: true, duties: rec.duties, updatedAt: rec.updatedAt, by: rec.by });
}
