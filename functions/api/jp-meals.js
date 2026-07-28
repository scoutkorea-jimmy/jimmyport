/* 식사 메뉴 (v0.9.283)
 *
 *  GET /api/jp-meals → { ok, meals, updatedAt }                         (공개)
 *  PUT /api/jp-meals { group, date, meal, value }                        (memberOrAdmin ∥ fncAdmin)
 *      급식보드에서 관리자가 셀 단위 인라인 편집 → 셀 하나만 read-modify-write(비파괴).
 *
 * 홍보부 운영보드(/krjam-planning)의 '식사 메뉴'와 급식편의본부 안내(/krjam-fnc)가
 * **같은 데이터를 본다**. 원본은 하나뿐 — KV "jp:meals". 홍보부는 /api/jamboree-plan 으로
 * 통째 저장하고, 급식보드는 이 PUT 으로 셀 단위만 고친다(양방향, 같은 KV).
 *
 * ⚠️ 이 엔드포인트는 **로그인 없이 읽을 수 있다.** /krjam-fnc 는 로그인 없는 안내 화면이라
 *    그렇게 하지 않으면 메뉴를 보여 줄 수 없다. 대신 **메뉴 텍스트만** 내보낸다 —
 *    /api/jamboree-plan 이 로그인 뒤에 있는 이유(연락처·인원 실명)는 여기에 담기지 않는다.
 * ⚠️ PUT 은 셀 단위 RMW(다른 칸 미덮어씀)만 허용 — 통째 덮어쓰기 금지(운영 KV 파괴적 쓰기 방지).
 */
import { json, memberOrAdmin, fncAdmin } from "./_lib.js";

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

/* 셀 단위 편집 (v0.9.271) — 홍보부·급식(fnc) 어느 쪽에서든 식사 메뉴를 고칠 수 있게 한다(양방향, 같은 KV).
 *  PUT /api/jp-meals { group, date, meal:'b'|'l'|'d', value }
 *  권한: 홍보부 회원세션(memberOrAdmin) 또는 급식 관리자(fncAdmin).
 *  ⚠️ 셀 단위 read-modify-write 로 다른 칸을 덮어쓰지 않는다(홍보부 통짜 저장과 충돌 최소화). */
export async function onRequestPut({ request, env }) {
  const who = (await memberOrAdmin(request, env)) || (await fncAdmin(request, env));
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let b = {};
  try { b = await request.json(); } catch {}
  const group = String(b.group || "");
  const date = String(b.date || "").slice(0, 10);
  const meal = String(b.meal || "");
  if (MEAL_GROUPS.indexOf(group) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || ["b", "l", "d"].indexOf(meal) < 0)
    return json({ ok: false, error: "bad request" }, 400);
  const value = String(b.value == null ? "" : b.value).slice(0, 400);
  let rec = {}, cur = {};
  try { const raw = await env.SCOUT_KV.get(KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object") { rec = p; cur = p.meals && typeof p.meals === "object" ? p.meals : {}; } } } catch {}

  /* ⚠️ 예전엔 pickMeals(cur) 로 **정규화한 결과**를 통째로 다시 저장했다. 그러면 이 API 가 모르는
     그룹(구버전 crew 등)이나 31일을 넘는 날짜가 셀 하나 고칠 때마다 조용히 사라진다.
     "셀 단위 비파괴 RMW" 라고 적어 놨으면 실제로도 그래야 한다 → 저장된 구조를 그대로 두고
     **건드리는 칸만** 바꾼다. 레코드의 다른 필드(author/client 등)도 보존한다. */
  const meals = Object.assign({}, cur);
  const g = Object.assign({}, meals[group] && typeof meals[group] === "object" ? meals[group] : {});
  const day = Object.assign({ b: "", l: "", d: "" }, g[date] && typeof g[date] === "object" ? g[date] : {});
  day[meal] = value;
  g[date] = day;
  meals[group] = g;

  /* ⚠️ **홍보부 통짜 저장이 이 편집을 조용히 덮어쓰던 경로를 막는다.**
     /api/jamboree-plan 은 conflictByOther(baseVer, storedVer, storedAuthor, author, storedClient, client)
     로 "내가 불러온 뒤 남이 바꿨나"를 판정해 바뀌었으면 병합한다. 그런데 예전 이 PUT 은
     **저장돼 있던 author 를 그대로 다시 써 넣고** client 는 아예 지웠다. 그래서 홍보부 화면에는
     '아무도 안 바꾼 것'으로 보였고, 급식보드에서 고친 메뉴가 홍보부의 다음 저장 한 번에 사라졌다.
     실제 작성자와 편집 맥락(fnc-board)을 남겨야 홍보부가 충돌을 알아채고 병합한다. */
  const updatedAt = new Date().toISOString();
  const author = String(who.name || who.username || "급식 관리자").slice(0, 40);
  await env.SCOUT_KV.put(KEY, JSON.stringify(Object.assign({}, rec, { meals, updatedAt, author, client: "fnc-board" })));
  return json({ ok: true, meals: pickMeals(meals), updatedAt });
}
