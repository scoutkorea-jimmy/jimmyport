/* GET  /api/units                → 공개: 현재 단위대 목록 (KV 비어있으면 units:null → 클라가 data.js 폴백)
 * GET  /api/units?snapshots=1    → 관리자: 되돌리기용 스냅샷 목록
 * PUT  /api/units                → 관리자: 전체 단위대 저장 + updatedAt + 변경 로그
 * PUT  /api/units {restore:"<at>"} → 관리자: 그 시점으로 되돌리기
 *
 * ⚠️ 이 PUT 은 지도 데이터를 **통째로** 덮어쓴다. 되돌릴 방법이 없으면 한 번의 실수가 끝이다.
 *    실제로 두 가지 길로 전부 날아갈 수 있었다 —
 *      ① 관리자 화면이 불러오기에 실패하면 units 가 빈 배열이 되고, 다음 편집이 그대로 저장된다
 *      ② CSV '덮어쓰기' 업로드에 잘못된 파일을 올린다
 *    그래서 ⓐ 빈 목록 차단 ⓑ 대량 감소 차단 ⓒ 덮어쓰기 전 스냅샷 ⓓ 되돌리기 를 둔다.
 *    막기만 하면 정상 작업까지 막히므로, 의도한 경우엔 confirmEmpty / confirmShrink 로 통과시킨다.
 */
import { json, isAdmin, clientIp, appendLog } from "./_lib.js";

const KEY = "units";
const SNAP_KEY = "units:snap";
const SNAP_MAX = 10;
const SNAP_TTL = 30 * 86400;
const SHRINK_MIN = 10;    // 이보다 적으면 감소 비율을 따지지 않는다
const SHRINK_RATIO = 0.5; // 절반 아래로 줄면 확인을 받는다

async function readSnaps(env) {
  try { const raw = await env.SCOUT_KV.get(SNAP_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  return [];
}
async function pushSnap(env, units, at, by) {
  try {
    const list = await readSnaps(env);
    list.unshift({ at, by: by || "", count: units.length, units });
    await env.SCOUT_KV.put(SNAP_KEY, JSON.stringify(list.slice(0, SNAP_MAX)), { expirationTtl: SNAP_TTL });
  } catch {}   // 스냅샷 실패가 저장 자체를 막지는 않는다
}
async function readCur(env) {
  try { const raw = await env.SCOUT_KV.get(KEY); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.units)) return p; } } catch {}
  return null;
}

// Served live (no edge cache) so admin edits to places appear immediately. This is only ~1 KV
// read per visit; the read-heavy endpoint that we cache is /api/jamboree-plan.
export async function onRequestGet({ request, env }) {
  // 스냅샷 목록 — 내용(units)은 빼고 시각·개수만. 관리자만.
  if (request && new URL(request.url).searchParams.get("snapshots")) {
    if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
    const snaps = await readSnaps(env);
    return json({ ok: true, snapshots: snaps.map((s) => ({ at: s.at, by: s.by, count: s.count })) });
  }
  const raw = await env.SCOUT_KV.get(KEY);
  if (!raw) return json({ units: null, updatedAt: null });
  try { return json(JSON.parse(raw)); }
  catch { return json({ units: null, updatedAt: null }); }
}

export async function onRequestPut({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }

  // 되돌리기 — 지금 상태도 스냅샷으로 남기고 그 시점으로 복구한다
  if (body.restore) {
    const snaps = await readSnaps(env);
    const hit = snaps.filter((s) => s.at === String(body.restore))[0];
    if (!hit) return json({ ok: false, error: "snapshot_not_found" }, 404);
    const cur = await readCur(env);
    const updatedAt = new Date().toISOString();
    if (cur) await pushSnap(env, cur.units, updatedAt, "restore 직전");
    await env.SCOUT_KV.put(KEY, JSON.stringify({ units: hit.units || [], updatedAt }));
    await appendLog(env, { ts: updatedAt, action: "units.restore", count: (hit.units || []).length, from: hit.at, ip: clientIp(request) });
    return json({ ok: true, restored: hit.at, updatedAt, count: (hit.units || []).length });
  }

  const units = Array.isArray(body.units) ? body.units : (Array.isArray(body) ? body : null);
  if (!units) return json({ error: "units array required" }, 400);

  const cur = await readCur(env);
  const had = cur ? cur.units.length : 0;
  if (had > 0 && units.length === 0 && body.confirmEmpty !== true) {
    return json({ ok: false, error: "empty_guard", had,
      message: "저장된 단위대가 " + had + "곳인데 빈 목록이 올라왔습니다. 화면이 데이터를 못 불러왔을 수 있습니다." }, 409);
  }
  if (had >= SHRINK_MIN && units.length < Math.floor(had * SHRINK_RATIO) && body.confirmShrink !== true) {
    return json({ ok: false, error: "shrink_guard", had, incoming: units.length,
      message: "단위대가 " + had + "곳에서 " + units.length + "곳으로 크게 줄어듭니다. 의도한 것이면 다시 확인해 주세요." }, 409);
  }

  const updatedAt = new Date().toISOString();
  if (cur) await pushSnap(env, cur.units, updatedAt, "저장 직전");
  await env.SCOUT_KV.put(KEY, JSON.stringify({ units, updatedAt }));
  await appendLog(env, { ts: updatedAt, action: "units.save", count: units.length, prev: had, ip: clientIp(request) });
  return json({ ok: true, updatedAt, count: units.length });
}
