/* 급식편의본부 조직/인적 단일 저장소 (v0.9.280)
 *
 *  GET /api/jp-fnc-org                 (공개) → { ok, org, updatedAt, by }
 *  PUT /api/jp-fnc-org { org, baseVer, confirmEmpty? }  (fncAdmin) 조직표 통째 저장
 *
 * KV "jp:fnc-org" = { org: { head, depts:[ { name, chief, teams:[ { name, lead, members:[] } ] } ] }, updatedAt, by }
 *
 * ⚠️ 이 조직표가 인적 데이터의 **단일 원본**이다 — 담당 배정 표·운영요원 근무 후보가 모두 여기서 온다.
 *    읽기 공개(안내 화면). 쓰기는 급식 관리자(fncAdmin)만. 부서/팀 이름·부장/팀장·팀원까지 관리자가 편집한다.
 * ⚠️ PUT 은 통째 덮어쓰기라 baseVer(불러올 때 updatedAt) 로 동시 저장 충돌을 막고(409),
 *    부서가 있는데 빈 조직이 오면 confirmEmpty 없이는 막는다(불러오기 실패 후 백지 저장 방지).
 * ⚠️ 연락처(개인정보)는 담지 않는다. 이름만.
 */
import { json, fncAdmin } from "./_lib.js";

const KEY = "jp:fnc-org";

const nm = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n || 60);

export function cleanOrg(o) {
  const out = { head: nm(o && o.head, 60), depts: [] };
  const depts = o && Array.isArray(o.depts) ? o.depts : [];
  for (const d of depts.slice(0, 20)) {
    if (!d || typeof d !== "object") continue;
    const name = nm(d.name, 60);
    if (!name) continue;
    const dept = { name, chief: nm(d.chief, 60), teams: [] };
    const teams = Array.isArray(d.teams) ? d.teams : [];
    for (const t of teams.slice(0, 12)) {
      if (!t || typeof t !== "object") continue;
      const tname = nm(t.name, 60);
      if (!tname) continue;
      const members = (Array.isArray(t.members) ? t.members : [])
        .map((m) => nm(m, 60)).filter(Boolean).slice(0, 80);
      dept.teams.push({ name: tname, lead: nm(t.lead, 60), members });
    }
    out.depts.push(dept);
  }
  return out;
}

const isEmpty = (org) => !org || !Array.isArray(org.depts) || org.depts.length === 0;

async function read(env) {
  try {
    const raw = await env.SCOUT_KV.get(KEY);
    if (!raw) return { org: null, updatedAt: null, by: "" };
    const p = JSON.parse(raw);
    return { org: p.org ? cleanOrg(p.org) : null, updatedAt: p.updatedAt || null, by: String(p.by || "") };
  } catch { return { org: null, updatedAt: null, by: "" }; }
}

export async function onRequestGet({ env }) {
  const r = await read(env);
  return json({ ok: true, org: r.org, updatedAt: r.updatedAt, by: r.by });
}

export async function onRequestPut({ request, env }) {
  const who = await fncAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const org = cleanOrg(body.org);

  const cur = await read(env);
  const storedVer = cur.updatedAt || "";
  const baseVer = String(body.baseVer == null ? "" : body.baseVer);
  if (storedVer && baseVer !== storedVer) {
    return json({ ok: false, error: "conflict", org: cur.org, updatedAt: storedVer, by: cur.by,
      message: "그 사이 다른 사람이 저장했습니다. 최신 조직표를 불러왔습니다." }, 409);
  }
  if (!isEmpty(cur.org) && isEmpty(org) && body.confirmEmpty !== true) {
    return json({ ok: false, error: "empty_guard",
      message: "조직 데이터가 있는데 빈 조직표가 올라왔습니다." }, 409);
  }

  const rec = { org, updatedAt: new Date().toISOString(), by: String(who.name || "급식 관리자").slice(0, 40) };
  await env.SCOUT_KV.put(KEY, JSON.stringify(rec));
  return json({ ok: true, org: rec.org, updatedAt: rec.updatedAt, by: rec.by });
}
