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
import { json, fncAdmin, appendLog, clientIp } from "./_lib.js";
import { snapPush, snapList, snapFind, shrankTooMuch } from "./_save-guard.js";

const KEY = "jp:fnc-org";
const SNAP_KEY = "jp:fnc-org:snap";   // 되돌리기용 직전 상태 보관

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

/* 조직표가 담고 있는 '사람 수' — 부분 전멸(팀 하나가 통째로 날아감 등)을 재는 기준.
   부서 수만 세면 팀·팀원이 전부 지워져도 알아채지 못한다. */
export function orgHeadcount(org) {
  if (!org || !Array.isArray(org.depts)) return 0;
  let n = org.head ? 1 : 0;
  for (const d of org.depts) {
    if (d && d.chief) n++;
    for (const t of (d && Array.isArray(d.teams) ? d.teams : [])) {
      if (t && t.lead) n++;
      n += (t && Array.isArray(t.members) ? t.members.length : 0);
    }
  }
  return n;
}

async function read(env) {
  try {
    const raw = await env.SCOUT_KV.get(KEY);
    if (!raw) return { org: null, updatedAt: null, by: "" };
    const p = JSON.parse(raw);
    return { org: p.org ? cleanOrg(p.org) : null, updatedAt: p.updatedAt || null, by: String(p.by || "") };
  } catch { return { org: null, updatedAt: null, by: "" }; }
}

export async function onRequestGet({ request, env }) {
  // 스냅샷 목록(내용은 빼고 시각·작성자·인원수만) — 관리자만. 되돌릴 지점을 고르는 화면이 쓴다.
  if (request && new URL(request.url).searchParams.get("snapshots")) {
    if (!(await fncAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
    const snaps = await snapList(env, SNAP_KEY);
    return json({ ok: true, snapshots: snaps.map((x) => ({ at: x.at, by: x.by, count: orgHeadcount(x.org) })) });
  }
  const r = await read(env);
  return json({ ok: true, org: r.org, updatedAt: r.updatedAt, by: r.by });
}

export async function onRequestPut({ request, env }) {
  const who = await fncAdmin(request, env);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const byName = String(who.name || "급식 관리자").slice(0, 40);

  /* 되돌리기 — 조직표는 담당 배정·근무 후보가 모두 참조하는 **인적 데이터의 단일 원본**이다.
     보호를 다 걸어도 사람은 실수하므로(팀 하나를 통째로 지우고 저장 등) 돌아갈 길을 둔다. */
  if (body.restore) {
    const hit = await snapFind(env, SNAP_KEY, body.restore);
    if (!hit) return json({ ok: false, error: "snapshot_not_found" }, 404);
    const cur0 = await read(env);
    const at = new Date().toISOString();
    if (cur0.org) await snapPush(env, SNAP_KEY, { at, by: byName, org: cur0.org });
    const org0 = cleanOrg(hit.org);
    await env.SCOUT_KV.put(KEY, JSON.stringify({ org: org0, updatedAt: at, by: byName }));
    try { await appendLog(env, { ts: at, action: "fnc.org.restore", count: orgHeadcount(org0), ip: clientIp(request) }); } catch {}
    return json({ ok: true, restored: hit.at, org: org0, updatedAt: at, by: byName });
  }

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
  /* ⚠️ **부분 전멸 가드** — 부서가 남아 있으면 empty_guard 는 통과한다. 팀·팀원이 대량으로
     사라진 저장(편집 중 실수, 화면이 덜 그려진 상태)은 여기서만 잡힌다. */
  const hadN = orgHeadcount(cur.org), nowN = orgHeadcount(org);
  if (shrankTooMuch(hadN, nowN) && body.confirmShrink !== true) {
    return json({ ok: false, error: "shrink_guard", had: hadN, now: nowN,
      message: "조직표 인원이 " + hadN + "명에서 " + nowN + "명으로 줄어듭니다. 의도한 정리라면 다시 저장해 주세요." }, 409);
  }

  const updatedAt = new Date().toISOString();
  if (cur.org) await snapPush(env, SNAP_KEY, { at: updatedAt, by: byName, org: cur.org });   // 덮어쓰기 직전 상태 보관
  await env.SCOUT_KV.put(KEY, JSON.stringify({ org, updatedAt, by: byName }));
  try { await appendLog(env, { ts: updatedAt, action: "fnc.org.save", count: nowN, ip: clientIp(request) }); } catch {}
  return json({ ok: true, org, updatedAt, by: byName });
}
