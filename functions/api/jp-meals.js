/* 식사 메뉴 읽기 전용 (v0.9.253)
 *
 *  GET /api/jp-meals → { ok, meals, updatedAt }
 *
 * 홍보부 운영보드(/krjam-planning)의 '식사 메뉴'와 급식편의본부 안내(/krjam-fnc)가
 * **같은 데이터를 본다**. 원본은 하나뿐 — KV "jp:meals" 이고, 쓰기는 지금까지처럼
 * /api/jamboree-plan 한 곳에서만 한다(두 곳에서 쓰면 서로 덮어쓴다).
 *
 * ⚠️ 이 엔드포인트는 **로그인 없이 읽을 수 있다.** /krjam-fnc 는 로그인 없는 안내 화면이라
 *    그렇게 하지 않으면 메뉴를 보여 줄 수 없다. 대신 **메뉴 텍스트만** 내보낸다 —
 *    /api/jamboree-plan 이 로그인 뒤에 있는 이유(연락처·인원 실명)는 여기에 담기지 않는다.
 * ⚠️ 쓰기 경로 없음(GET 전용). 운영 KV 파괴적 쓰기 금지 규칙과 같은 방향이다.
 */
import { json } from "./_lib.js";

const KEY = "jp:meals";
export const MEAL_GROUPS = ["crew_n", "crew_s", "staff"];

/* 저장된 값에서 메뉴 텍스트만 추린다 — 형태가 어긋나도 화면이 깨지지 않게 빈 값으로 떨어뜨린다. */
export const pickMeals = (m) => {
  const out = {};
  for (const g of MEAL_GROUPS) {
    const src = m && m[g] && typeof m[g] === "object" ? m[g] : {};
    const days = {};
    for (const d of Object.keys(src).slice(0, 31)) {
      const date = String(d || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const r = src[d] && typeof src[d] === "object" ? src[d] : {};
      days[date] = {
        b: String(r.b || "").slice(0, 400),
        l: String(r.l || "").slice(0, 400),
        d: String(r.d || "").slice(0, 400),
      };
    }
    out[g] = days;
  }
  return out;
};

export async function onRequestGet({ env }) {
  let meals = {}, updatedAt = null;
  try {
    const raw = await env.SCOUT_KV.get(KEY);
    if (raw) { const p = JSON.parse(raw); meals = pickMeals(p.meals); updatedAt = p.updatedAt || null; }
    else meals = pickMeals(null);
  } catch { meals = pickMeals(null); }
  // json() 은 no-store 를 붙인다 — 메뉴는 바꾸면 곧 반영돼야 하므로 그대로 둔다(자주 부르는 값도 아니다).
  return json({ ok: true, meals, updatedAt });
}
