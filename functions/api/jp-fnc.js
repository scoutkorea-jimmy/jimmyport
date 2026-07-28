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
import { json, memberOrAdmin, appendLog, clientIp } from "./_lib.js";
import { snapPush, shrankTooMuch } from "./_save-guard.js";

const KEY = "jp:fnc";
const SNAP_KEY = "jp:fnc:snap";

/* ⚠️ v0.9.280 부터 급식보드 화면은 이 엔드포인트를 쓰지 않는다(담당 배정 = 조직표 jp-fnc-org).
   그런데 PUT 은 여전히 **홍보부 회원 세션이면 누구나** 배정을 통째로 덮어쓸 수 있다.
   화면에서 안 쓴다고 방치하면 옛 탭·옛 캐시가 저장하는 순간 조용히 지워진다 → 같은 보호를 건다. */

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

/* ⚠️ 이 PUT 은 배정표를 **통째로** 덮어쓴다. 두 사람이 같은 시간에 저장하면 앞사람 배정이 사라진다.
   그래서 baseVer(불러올 때 받은 updatedAt)를 함께 받아, 그 사이 다른 사람이 저장했으면 막고 최신본을 돌려준다.
   ⚠️ 배정이 있는데 전부 빈 값이 오면(불러오기 실패 후 저장 등) 막는다 — 의도한 초기화는 confirmEmpty. */
export async function onRequestPut({ request, env }) {
  const who = await memberOrAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const duties = cleanDuties(body.duties);

  const cur = await read(env);
  const storedVer = cur.updatedAt || "";
  const baseVer = String(body.baseVer == null ? "" : body.baseVer);
  if (storedVer && baseVer !== storedVer) {
    return json({ ok: false, error: "conflict", duties: cur.duties, updatedAt: storedVer, by: cur.by,
      message: "그 사이 다른 사람이 저장했습니다. 최신 배정을 불러왔습니다." }, 409);
  }
  const had = Object.keys(cur.duties || {}).length;
  const now = Object.keys(duties).length;
  if (had > 0 && now === 0 && body.confirmEmpty !== true) {
    return json({ ok: false, error: "empty_guard", had,
      message: "배정 " + had + "건이 있는데 빈 배정이 올라왔습니다." }, 409);
  }
  // 부분 전멸 — 절반 미만으로 줄면 멈춘다(전멸이 아니면 empty_guard 는 통과해 버린다).
  if (shrankTooMuch(had, now) && body.confirmShrink !== true) {
    return json({ ok: false, error: "shrink_guard", had, now,
      message: "배정이 " + had + "건에서 " + now + "건으로 줄어듭니다. 의도한 정리라면 다시 저장해 주세요." }, 409);
  }

  const by = String(who.name || who.username || "").slice(0, 40);
  const updatedAt = new Date().toISOString();
  if (had > 0) await snapPush(env, SNAP_KEY, { at: updatedAt, by, duties: cur.duties });   // 덮어쓰기 직전 상태
  await env.SCOUT_KV.put(KEY, JSON.stringify({ duties, updatedAt, by }));
  try { await appendLog(env, { ts: updatedAt, action: "fnc.duty.save", count: now, ip: clientIp(request) }); } catch {}
  return json({ ok: true, duties, updatedAt, by });
}
