/* 제16회 한국잼버리 · 미디어부 SNS 운영 캘린더 — 콘텐츠(카드)별 저장 + 업데이트 히스토리
 *  카드(콘텐츠 계획) 단위로 KV에 개별 저장 → 보드 전체를 한 덩어리로 덮어쓰지 않음.
 *   - 슬롯(카드):  "jp:s:<slotKey>" = { k, edit, history:[{ts,author,html}], deleted, updatedAt, author }
 *        slotKey 예: "2026-06-26#dcount" (시드) / "2026-07-01#extra#<id>" (추가 카드)
 *   - 마케팅:      "jp:marketing"     = { marketing:[...], updatedAt }
 *
 *  - GET  /api/jamboree-plan              → { slots:{<slotKey>:rec}, marketing }
 *  - PUT  /api/jamboree-plan  (카드 저장) → body { slotKey, edit?, deleted?, addHistory?:{html}, author }
 *  - PUT  /api/jamboree-plan  (마케팅)    → body { marketing:[...], author }
 *  - DELETE /api/jamboree-plan?slotKey=…  → 카드 KV 삭제(완전 제거)
 */
import { json, jsonCacheable, cacheMatch, cachePut, cachePurge, clientIp, maskIp, appendLog, memberOrAdmin } from "./_lib.js";
import { snapPush, snapList, snapFind, shrankTooMuch, countOf, GuardError } from "./_save-guard.js";

const PREFIX = "jp:s:";
const SLOT = (k) => PREFIX + k;
const MKT = "jp:marketing";
const MEALS = "jp:meals";
const SHOOTLIST = "jp:shootlist";
const TYPES = "jp:types";
const EVENTS = "jp:events";
const TIMETABLE = "jp:timetable";
const ROSTER = "jp:roster";
const TTCATS = "jp:ttcats";
const OFFTIMES = "jp:offtimes";
const CONTACTS = "jp:contacts";
const DIVISIONS = "jp:divisions";
const PROTOCOL = "jp:protocol";
const MAPPOS = "jp:mappos";
const SHOOTS = "jp:shoots";

/* 도메인 이름 → KV 키. 되돌리기(restoreDomain)·스냅샷 조회가 쓴다.
   ⚠️ 새 도메인을 추가하면 여기에도 넣어야 그 도메인을 되돌릴 수 있다(빠뜨리면 보호만 있고 복구가 없다).
   슬롯(jp:s:*)은 키가 동적이라 여기 없다 — 슬롯은 원래 통짜 저장이 아니라 개별 저장이다. */
const DOMAIN_KEY = {
  marketing: MKT, meals: MEALS, shootlist: SHOOTLIST, types: TYPES, events: EVENTS,
  timetable: TIMETABLE, roster: ROSTER, ttcats: TTCATS, offtimes: OFFTIMES,
  contacts: CONTACTS, divisions: DIVISIONS, protocol: PROTOCOL, mappos: MAPPOS, shoots: SHOOTS,
};

function cleanMapPos(o) {
  o = o && typeof o === "object" ? o : {};
  const out = {};
  Object.keys(o).slice(0, 300).forEach((pid) => {
    const v = o[pid];
    const key = pid.toString().slice(0, 40);
    if (typeof v === "string") { const z = v.slice(0, 40); if (z) out[key] = { zone: z }; }
    else if (v && typeof v === "object") { const z = (v.zone || "").toString().slice(0, 40); if (z) out[key] = { zone: z, at: (v.at || "").toString().slice(0, 30) }; }
  });
  return out;
}
function cleanShoot(e) {
  e = e && typeof e === "object" ? e : {};
  const assignees = Array.isArray(e.assignees)
    ? e.assignees.slice(0, 20).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean)
    : [];
  return {
    id: (e.id || "").toString().slice(0, 40),
    zone: (e.zone || "").toString().slice(0, 30),
    title: (e.title || "").toString().slice(0, 200),
    time: (e.time || "").toString().slice(0, 40),
    note: (e.note || "").toString().slice(0, 500),
    status: ["open", "done"].indexOf(e.status) >= 0 ? e.status : "open",
    assignees,
    by: (e.by || "").toString().slice(0, 40),
    createdAt: (e.createdAt || "").toString().slice(0, 30),
  };
}

function cleanDivision(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    region: (e.region || "").toString().slice(0, 60),
    federations: (e.federations || "").toString().slice(0, 400),
    leader: (e.leader || "").toString().slice(0, 60),
    ops: (e.ops || "").toString().slice(0, 60),
    safety: (e.safety || "").toString().slice(0, 60),
    support: (e.support || "").toString().slice(0, 60),
  };
}
// 식사 메뉴: { crew_n/crew_s/staff:{ "YYYY-MM-DD":{b,l,d} } } — 그룹 3개·날짜 31개·끼니 3개로 제한(구버전 crew 호환)
function cleanMeals(m) {
  const out = {};
  ["crew_n", "crew_s", "staff", "crew"].forEach((g) => {
    if (!(m && m[g])) return;
    const src = m && m[g] && typeof m[g] === "object" ? m[g] : {};
    const days = {};
    Object.keys(src).slice(0, 31).forEach((d) => {
      const date = (d || "").toString().slice(0, 10);
      if (!date) return;
      const r = src[d] && typeof src[d] === "object" ? src[d] : {};
      days[date] = {
        b: (r.b || "").toString().slice(0, 400),
        l: (r.l || "").toString().slice(0, 400),
        d: (r.d || "").toString().slice(0, 400),
      };
    });
    out[g] = days;
  });
  return out;
}
// 촬영 필요 리스트 항목
function cleanShoot2(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    ttId: (e.ttId || "").toString().slice(0, 44),   // 캘린더(일정표) 연동 항목 표식 — 중복 로드 방지
    prId: (e.prId || "").toString().slice(0, 44),   // 의전 연동 항목 표식 — 담당은 의전 항목이 원본
    title: (e.title || "").toString().slice(0, 200),
    place: (e.place || "").toString().slice(0, 120),
    point: (e.point || "").toString().slice(0, 400),
    owner: (e.owner || "").toString().slice(0, 120),
    assignees: Array.isArray(e.assignees) ? e.assignees.slice(0, 20).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean) : [],   // 담당 인원 id(직접 추가 행) — 일정표 연동 행은 일정표가 원본
    sched: (e.sched || "").toString().slice(0, 40),
    doneDate: (e.doneDate || "").toString().slice(0, 20),
    done: !!e.done,
  };
}
function cleanProtocol(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    role: (e.role || "").toString().slice(0, 40),
    name: (e.name || e.person || "").toString().slice(0, 60),
    title: (e.title || "").toString().slice(0, 80),
    date: (e.date || "").toString().slice(0, 10),
    time: (e.time || "").toString().slice(0, 5),
    endTime: (e.endTime || "").toString().slice(0, 5),
    activity: (e.activity || "").toString().slice(0, 300),
    place: (e.place || "").toString().slice(0, 120),
    // 촬영 담당(홍보부 인원 id) — 여기 없으면 저장 시 조용히 사라진다(§16.53 cleanTT 와 같은 함정)
    assignees: Array.isArray(e.assignees) ? e.assignees.slice(0, 30).map((x) => (x || "").toString().slice(0, 40)) : [],
    memo: (e.memo || "").toString().slice(0, 400),
  };
}
function cleanContact(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    org: (e.org || "").toString().slice(0, 80),
    role: (e.role || "").toString().slice(0, 80),
    phone: (e.phone || "").toString().slice(0, 40),
    email: (e.email || "").toString().slice(0, 120),
    memo: (e.memo || "").toString().slice(0, 400),
  };
}

function cleanTtCats(arr) {
  return arr.slice(0, 40).map((p) => Array.isArray(p)
    ? [(p[0] || "").toString().slice(0, 30), (p[1] || "#7A6A57").toString().slice(0, 9)]
    : null).filter((x) => x && x[0]);
}
function cleanOff(o) {
  o = o && typeof o === "object" ? o : {};
  const out = {};
  Object.keys(o).slice(0, 200).forEach((pid) => {
    const days = o[pid]; if (!days || typeof days !== "object") return;
    const dd = {};
    Object.keys(days).slice(0, 40).forEach((d) => {
      const v = days[d]; if (!v || typeof v !== "object") return;
      const blk = {}; ["am", "pm", "eve"].forEach((k) => { if (v[k]) blk[k] = true; });
      if (Object.keys(blk).length) dd[d.toString().slice(0, 10)] = blk;
    });
    if (Object.keys(dd).length) out[pid.toString().slice(0, 40)] = dd;
  });
  return out;
}

function cleanName(s, fb) { return (s || "").toString().trim().slice(0, 80) || fb; }
function cleanTT(e) {
  e = e && typeof e === "object" ? e : {};
  const assignees = Array.isArray(e.assignees)
    ? e.assignees.slice(0, 30).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean)
    : [];
  const contacts = Array.isArray(e.contacts)
    ? e.contacts.slice(0, 30).map((x) => (x || "").toString().slice(0, 40)).filter(Boolean)
    : [];
  const rundown = Array.isArray(e.rundown)
    ? e.rundown.slice(0, 80).map((r) => {
        r = r && typeof r === "object" ? r : {};
        return { time: (r.time || "").toString().slice(0, 20), title: (r.title || "").toString().slice(0, 200), note: (r.note || "").toString().slice(0, 200) };
      })
    : [];
  return {
    id: (e.id || "").toString().slice(0, 40),
    day: (e.day || "").toString().slice(0, 10),
    start: (e.start || "").toString().slice(0, 5),
    end: (e.end || "").toString().slice(0, 5),
    title: (e.title || "").toString().slice(0, 200),
    place: (e.place || "").toString().slice(0, 120),
    zone: (e.zone || "").toString().slice(0, 30),
    cat: (e.cat || "").toString().slice(0, 20),
    assignees,
    contacts,
    memo: (e.memo || "").toString().slice(0, 500),
    rundown,
    series: (e.series || "").toString().slice(0, 40),
    tipId: (e.tipId || "").toString().slice(0, 40),   // 소식 제보에서 만들어진 취재 일정이면 그 제보 id
    track: (e.track || "").toString().slice(0, 16),   // 'cub'=컵 참관단 트랙(잼버리 일정·의전과 별도 열)
    batch: (e.batch === 2 || e.batch === "2") ? 2 : (e.batch === 1 || e.batch === "1") ? 1 : 0,  // 컵 참관단 기수(1·2)
    noCover: !!e.noCover,                              // 취재 불필요 — 일정표에서 흐리게 표시
  };
}
export function cleanRoster(e) {   // export=테스트용(입영 arrive 필드 보존 회귀 방지)
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    role: (e.role || "").toString().slice(0, 80),
    duty: (e.duty || "").toString().slice(0, 400),
    contact: (e.contact || "").toString().slice(0, 80),
    channel: (e.channel || "").toString().slice(0, 160),
    team: (e.team || "").toString().slice(0, 20),
    arrive: (e.arrive || "").toString().slice(0, 20),   // 입영 시점 "YYYY-MM-DDThh:mm" — 없으면 매 저장마다 서버가 버려 데이터 유실(v0.9.223 누락 버그)
  };
}
function cleanTeams(t) {
  t = t && typeof t === "object" && !Array.isArray(t) ? t : {};
  const out = {};
  ["t1", "t2"].forEach((k) => { if (t[k] != null) out[k] = (t[k] || "").toString().slice(0, 40); });
  return out;
}
function cleanEvent(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    title: (e.title || "").toString().slice(0, 200),
    kind: (e.kind || "기타").toString().slice(0, 20),
    start: (e.start || "").toString().slice(0, 10),
    end: (e.end || e.start || "").toString().slice(0, 10),
    owner: (e.owner || "").toString().slice(0, 60),
    memo: (e.memo || "").toString().slice(0, 1000),
  };
}
function cleanEdit(e) {
  e = e && typeof e === "object" ? e : {};
  let channels = Array.isArray(e.channels)
    ? e.channels.slice(0, 8).map((c) => (c || "").toString().slice(0, 40)).filter(Boolean)
    : (e.channel ? [String(e.channel).slice(0, 40)] : []);
  if (!channels.length) channels = ["페이스북"];
  const links = {};
  const src = e.links && typeof e.links === "object" ? e.links : (e.link ? { [channels[0]]: e.link } : {});
  Object.keys(src).slice(0, 12).forEach((k) => { links[k.slice(0, 40)] = (src[k] || "").toString().slice(0, 1000); });
  const files = Array.isArray(e.files) ? e.files.slice(0, 20).map((f) => ({
    name: (f && f.name || "file").toString().slice(0, 200),
    url: (f && f.url || "").toString().slice(0, 600),
    ct: (f && f.ct || "").toString().slice(0, 100),
  })).filter((f) => f.url) : [];
  return {
    title: (e.title || "").toString().slice(0, 400),
    ctype: (e.ctype || "").toString().slice(0, 40),
    status: ["planned", "draft", "ready"].indexOf(e.status) >= 0 ? e.status : "planned",
    time: (e.time || "").toString().slice(0, 5),
    owner: (e.owner || "").toString().slice(0, 60),
    tags: (e.tags || "").toString().slice(0, 600),
    posted: !!e.posted,
    postedAt: (e.postedAt || "").toString().slice(0, 30),
    channels,
    links,
    images: Array.isArray(e.images) ? e.images.slice(0, 10).map((u) => (u || "").toString().slice(0, 600)) : [],
    files,
    due: (e.due || "").toString().slice(0, 10),
    approval: (() => {
      const a = e.approval && typeof e.approval === "object" ? e.approval : {};
      return {
        state: ["none", "requested", "approved", "rejected"].indexOf(a.state) >= 0 ? a.state : "none",
        by: (a.by || "").toString().slice(0, 40),
        at: (a.at || "").toString().slice(0, 30),
        note: (a.note || "").toString().slice(0, 300),
      };
    })(),
    category: (e.category || "").toString().slice(0, 40),
  };
}

/* ===== 동시편집 유실 방지 (per-item 병합 + 버전 가드) =====
 * 문제: 14개 공유 도메인(timetable·roster·…)이 배열/객체 통째로 저장돼, 두 사람이 같은 도메인을
 *   동시에 편집하면 나중 PUT 이 앞 PUT 을 조용히 덮어썼다.
 * 해결: 각 키의 updatedAt 을 버전으로 삼아, 클라가 불러온 버전(baseVer)과 서버 현재 버전이
 *   - 같으면(=그 사이 아무도 안 바꿈): 통짜 교체(현행과 동일 — 삭제도 정상 동작, 테스트 불변).
 *   - 다르면(=누가 방금 저장함): id 기준 병합(들어온 값 우선 + 서버에만 있는 항목 보존).
 *     → 서로 다른 항목을 동시 편집하면 둘 다 살아남는다. 같은 항목이면 나중 값이 이긴다.
 *     ⚠️ 병합 시 상대가 방금 '삭제'한 항목은 되살아날 수 있다(충돌 창 안에서만·드묾·재삭제 가능).
 */
function mergeArrById(stored, incoming) {
  if (!Array.isArray(stored) || !stored.length) return incoming;
  if (!Array.isArray(incoming)) return incoming;
  if (!incoming.every((x) => x && x.id) || !stored.every((x) => x && x.id)) return incoming; // id 없으면 병합 불가 → 통짜
  const inIds = new Set(incoming.map((x) => x.id));
  const tail = stored.filter((x) => !inIds.has(x.id)); // 서버에만 있는 항목(다른 사람이 방금 추가)
  return incoming.concat(tail);
}
function mergeObj(stored, incoming) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return incoming;
  return Object.assign({}, stored, incoming); // 들어온 키가 이기고, 서버에만 있는 키는 보존
}
/* 병합('다른 사람이 편집 중')은 (1) 내가 불러온 버전과 서버 현재 버전이 다르고 (2) 그 변경을 **다른 편집 맥락**이
 * 했을 때만. 같은 맥락(=같은 탭의 연속 저장·레이스·캐시로 baseVer 만 옛것)이면 병합하지 않고 통짜 교체 → 오탐 방지.
 *
 * '다른 편집 맥락' = 작성자가 다르거나, **작성자가 같아도 편집 창(client)이 다를 때**.
 * 작성자만 보던 v0.9.226 판정은 한 사람이 PC·휴대폰(또는 두 탭)에서 같이 열어 두면 나중 저장이 앞 저장을
 * 경고 없이 통째로 덮어썼다(lost update). client 는 탭 단위 id(sessionStorage)라 같은 탭의 연속 저장은
 * 여전히 병합하지 않는다 = v0.9.226 이 잡은 오탐은 그대로 막힌다.
 * client 가 없는 구버전 클라/데이터는 예전 동작(작성자 비교)으로 떨어진다 — 안전측. export=테스트용. */
export function conflictByOther(baseVer, storedVer, storedAuthor, author, storedClient, client) {
  if (!(baseVer && storedVer && baseVer !== storedVer)) return false;   // 내가 본 버전 그대로면 충돌 아님
  if (storedAuthor && author && storedAuthor !== author) return true;   // 다른 사람
  if (storedClient && client && storedClient !== client) return true;   // 같은 사람 · 다른 창(기기·탭)
  return false;
}
// 도메인 저장 — 버전 가드 후 통짜 교체 또는 병합. 반환 {value, merged}. extra=추가 필드(roster.teams 등).
// W = { now, author, client } — 한 PUT 안의 모든 도메인이 공유하는 쓰기 맥락.
async function saveDomain(env, KEY, field, cleaned, baseVer, kind, W, cap, extra) {
  const { now, author, client, confirmShrink } = W;
  let stored = null, storedVer = null, storedAuthor = null, storedClient = null;
  const raw = await env.SCOUT_KV.get(KEY);
  if (raw) { try { const p = JSON.parse(raw); stored = p[field]; storedVer = p.updatedAt || null; storedAuthor = p.author || null; storedClient = p.client || null; } catch {} }
  let value = cleaned, merged = false;
  if (conflictByOther(baseVer, storedVer, storedAuthor, author, storedClient, client)) {   // 내가 불러온 뒤 '다른 창'이 바꿈
    value = kind === "obj" ? mergeObj(stored, cleaned) : mergeArrById(stored, cleaned);
    merged = true;
    if (kind !== "obj" && cap && Array.isArray(value) && value.length > cap) value = value.slice(0, cap);
  }

  /* ⚠️ **부분 전멸 가드**(v0.9.286) — 여기까지의 보호(낙관적 잠금·병합)는 "누가 먼저 바꿨나"만 본다.
     혼자 쓰는 중에 항목이 대량으로 사라지는 저장(화면이 덜 그려진 상태, 실수로 전체 선택 삭제,
     복원 실패 후 빈 배열 저장)은 충돌이 아니라서 그대로 통과했다. 절반 미만으로 줄면 멈춘다.
     의도한 정리라면 클라가 confirmShrink 로 다시 보낸다 — 그때는 **되돌릴 스냅샷을 남기고** 저장한다.
     ⚠️ 스냅샷은 이 '대량 삭제' 순간에만 남긴다. 매 저장마다 남기면 KV 쓰기가 두 배가 되고,
        정작 필요한 건 사고가 난 그 직전 상태 하나다. */
  const hadN = countOf(stored), nowN = countOf(value);
  if (shrankTooMuch(hadN, nowN)) {
    if (confirmShrink !== true) {
      throw new GuardError({ error: "shrink_guard", key: field, had: hadN, now: nowN,
        message: field + " 항목이 " + hadN + "개에서 " + nowN + "개로 줄어듭니다. 의도한 삭제가 맞는지 확인해 주세요." });
    }
    await snapPush(env, KEY + ":snap", { at: now, by: author || "", field, value: stored });
  }

  const wrap = Object.assign({ [field]: value, updatedAt: now, author, client }, extra || {});
  await env.SCOUT_KV.put(KEY, JSON.stringify(wrap));
  return { value, merged };
}

export async function onRequestGet(ctx) {
  const { env } = ctx;
  // 내부 운영 보드 — 연락처(전화·이메일)·인원 실명이 담기므로 로그인(회원 세션) 필수.
  // 캐시 조회보다 먼저 검사해야 무인증 요청이 캐시 히트로 새지 않는다.
  if (!(await memberOrAdmin(ctx.request, env))) return json({ error: "unauthorized" }, 401);

  /* 되돌릴 지점 목록 — GET ?snapshots=<도메인>. 대량 삭제 직전 상태만 쌓이므로 보통 비어 있고,
     사고가 났을 때만 항목이 있다. 캐시 조회 앞에 둔다(질의가 붙은 요청은 보드 GET 이 아니다). */
  const snapQ = new URL(ctx.request.url).searchParams.get("snapshots");
  if (snapQ) {
    const K = DOMAIN_KEY[snapQ];
    if (!K) return json({ ok: false, error: "unknown_domain" }, 400);
    const snaps = await snapList(env, K + ":snap");
    return json({ ok: true, key: snapQ, snapshots: snaps.map((x) => ({ at: x.at, by: x.by, count: countOf(x.value) })) });
  }

  const hit = await cacheMatch(ctx.request);  // the board GET takes no query params → one cache key
  if (hit) return privateJson(hit.body);
  let cursor, names = [];
  do {
    const res = await env.SCOUT_KV.list({ prefix: PREFIX, cursor });
    names = names.concat(res.keys.map((k) => k.name));
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  const slots = {};
  await Promise.all(names.map(async (name) => {
    const raw = await env.SCOUT_KV.get(name);
    if (!raw) return;
    try { slots[name.slice(PREFIX.length)] = JSON.parse(raw); } catch {}
  }));

  // 동시편집 병합용 — 각 도메인의 updatedAt(버전)을 클라에 함께 내려준다.
  const versions = {};
  const rd = async (KEY, field, vkey) => {
    const raw = await env.SCOUT_KV.get(KEY);
    if (!raw) return null;
    try { const p = JSON.parse(raw); versions[vkey] = p.updatedAt || null; return p[field] === undefined ? null : p[field]; }
    catch { return null; }
  };

  const marketing = await rd(MKT, "marketing", "marketing");
  const types = await rd(TYPES, "types", "types");
  const events = await rd(EVENTS, "events", "events");
  const timetable = await rd(TIMETABLE, "timetable", "timetable");

  let roster = null, teams = null;
  const rraw = await env.SCOUT_KV.get(ROSTER);
  if (rraw) { try { const rj = JSON.parse(rraw); roster = rj.roster; teams = rj.teams || null; versions.roster = rj.updatedAt || null; } catch {} }

  const ttcats = await rd(TTCATS, "ttcats", "ttcats");
  const offtimes = await rd(OFFTIMES, "offtimes", "offtimes");
  const contacts = await rd(CONTACTS, "contacts", "contacts");
  const divisions = await rd(DIVISIONS, "divisions", "divisions");
  const protocol = await rd(PROTOCOL, "protocol", "protocol");
  const mappos = await rd(MAPPOS, "mappos", "mappos");
  const shoots = await rd(SHOOTS, "shoots", "shoots");
  const meals = await rd(MEALS, "meals", "meals");
  const shootlist = await rd(SHOOTLIST, "shootlist", "shootlist");

  const payload = { slots, marketing, meals, shootlist, types, events, timetable, roster, teams, ttcats, offtimes, contacts, divisions, protocol, mappos, shoots, versions };
  // 엣지 캐시(Workers caches.default)에는 캐시 가능한 사본을 넣어 KV 읽기를 아끼고(30초, 쓰기 시 purge),
  // 브라우저·중간 캐시로는 저장되지 않게 한다 — 이 응답에는 인원 실명·전화·이메일이 들어 있어
  // 공용 PC 디스크 캐시에 남으면 안 된다(무인증 유출은 위 memberOrAdmin 이 이미 막는다).
  cachePut(ctx, jsonCacheable(payload, 30));
  return privateJson(JSON.stringify(payload));
}
// 개인정보가 담긴 응답을 사용자에게 돌려줄 때 쓰는 헤더 — 어떤 캐시에도 저장 금지.
function privateJson(body) {
  return new Response(body, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" } });
}

export async function onRequestPut(ctx) {
  // 과거 "작성자 이름 기반·토큰 없음" 설계(§16.5)의 잔재 — 개별 로그인 도입(v0.9.103) 후에도
  // 쓰기가 무인증이라 비로그인 상태로 보드 전체를 덮어쓸 수 있었다. 회원 세션 필수로 전환.
  if (!(await memberOrAdmin(ctx.request, ctx.env))) return json({ error: "unauthorized" }, 401);
  let resp;
  /* 부분 전멸 가드는 저장 한복판(saveDomain)에서 걸린다 — 15개 호출부마다 검사를 붙이면
     한 곳을 빠뜨리고 그 도메인만 무방비가 된다. 예외 하나로 올려 여기서 409 로 바꾼다. */
  try { resp = await putImpl(ctx); }
  catch (e) {
    if (e instanceof GuardError) return json(Object.assign({ ok: false }, e.payload), 409);
    throw e;
  }
  cachePurge(ctx, "/api/jamboree-plan");  // edits show on the next load (within the GET TTL)
  return resp;
}
async function putImpl(ctx) {
  const { request, env } = ctx;
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const author = cleanName(body.author, "익명");
  const now = new Date().toISOString();
  const ip = maskIp(clientIp(request));
  // 편집 창 id — 같은 사람이 PC·휴대폰(또는 두 탭)에서 열어 둔 경우를 구분해 병합 판정에 쓴다.
  const client = (body.client || "").toString().slice(0, 60);
  // confirmShrink = 사람이 "그 대량 삭제 맞다"고 한 번 더 확인한 저장(부분 전멸 가드 통과용)
  const W = { now, author, client, confirmShrink: body.confirmShrink === true };   // 이 PUT 안의 모든 도메인이 공유하는 쓰기 맥락

  // 마케팅 저장
  const BV = (body.baseVer && typeof body.baseVer === "object") ? body.baseVer : {};

  /* 되돌리기 — 대량 삭제 직전 상태로 그 도메인만 복구한다(다른 도메인은 건드리지 않는다).
     PUT { restoreDomain:"roster", at:"<스냅샷 시각>" } */
  if (body.restoreDomain) {
    const field = String(body.restoreDomain);
    const KEY = DOMAIN_KEY[field];
    if (!KEY) return json({ ok: false, error: "unknown_domain" }, 400);
    const hit = await snapFind(env, KEY + ":snap", body.at);
    if (!hit) return json({ ok: false, error: "snapshot_not_found" }, 404);
    let prev = null;
    const raw0 = await env.SCOUT_KV.get(KEY);
    if (raw0) { try { prev = JSON.parse(raw0); } catch {} }
    if (prev) await snapPush(env, KEY + ":snap", { at: now, by: author, field, value: prev[field] });
    const wrap = Object.assign({}, prev || {}, { [field]: hit.value, updatedAt: now, author, client });
    await env.SCOUT_KV.put(KEY, JSON.stringify(wrap));
    await appendLog(env, { ts: now, action: "jp.restore", key: field, count: countOf(hit.value), ip: clientIp(request) });
    return json({ ok: true, updatedAt: now, key: field, restored: hit.at, value: hit.value });
  }

  if (Array.isArray(body.marketing)) {
    const r = await saveDomain(env, MKT, "marketing", body.marketing.slice(0, 300), BV.marketing, "arr", W, 300);
    await appendLog(env, { ts: now, action: "jp.marketing", count: 0, ip: clientIp(request) });
    return json({ ok: true, updatedAt: now, key: "marketing", merged: r.merged, value: r.value });
  }

  // 식사 메뉴 저장 (대원/운영요원 × 날짜 × 조·중·석식) — 객체
  if (body.meals && typeof body.meals === "object" && !Array.isArray(body.meals)) {
    const r = await saveDomain(env, MEALS, "meals", cleanMeals(body.meals), BV.meals, "obj", W);
    return json({ ok: true, updatedAt: now, key: "meals", merged: r.merged, value: r.value });
  }

  // 촬영 필요 리스트 저장
  if (Array.isArray(body.shootlist)) {
    const r = await saveDomain(env, SHOOTLIST, "shootlist", body.shootlist.slice(0, 500).map(cleanShoot2), BV.shootlist, "arr", W, 500);
    return json({ ok: true, updatedAt: now, key: "shootlist", merged: r.merged, value: r.value });
  }

  // 콘텐츠 종류 목록 저장 (문자열 배열 — id 없어 병합 불가 → 통짜)
  if (Array.isArray(body.types)) {
    const types = body.types.slice(0, 60).map((t) => (t || "").toString().slice(0, 40)).filter(Boolean);
    const r = await saveDomain(env, TYPES, "types", types, BV.types, "arr", W, 60);
    return json({ ok: true, updatedAt: now, key: "types", merged: r.merged, value: r.value });
  }

  // 운영 일정(events) 저장
  if (Array.isArray(body.events)) {
    const events = body.events.slice(0, 300).map(cleanEvent).filter((e) => e.start);
    const r = await saveDomain(env, EVENTS, "events", events, BV.events, "arr", W, 300);
    return json({ ok: true, updatedAt: now, key: "events", merged: r.merged, value: r.value });
  }

  // 일자별 시간 일정표(timetable) 저장
  if (Array.isArray(body.timetable)) {
    const timetable = body.timetable.slice(0, 400).map(cleanTT).filter((e) => e.day);
    const r = await saveDomain(env, TIMETABLE, "timetable", timetable, BV.timetable, "arr", W, 400);
    return json({ ok: true, updatedAt: now, key: "timetable", merged: r.merged, value: r.value });
  }

  // 홍보부 인원 R&R(roster) 저장 (+ 편집 가능한 팀명 teams)
  if (Array.isArray(body.roster)) {
    const roster = body.roster.slice(0, 100).map(cleanRoster);
    let teams = null;
    if (body.teams && typeof body.teams === "object") teams = cleanTeams(body.teams);
    else { try { teams = JSON.parse(await env.SCOUT_KV.get(ROSTER) || "{}").teams || null; } catch {} }
    const r = await saveDomain(env, ROSTER, "roster", roster, BV.roster, "arr", W, 100, { teams });
    return json({ ok: true, updatedAt: now, key: "roster", merged: r.merged, value: r.value, teams });
  }

  // 일정 종류(ttcats) 저장 (id 없어 통짜)
  if (Array.isArray(body.ttcats)) {
    const r = await saveDomain(env, TTCATS, "ttcats", cleanTtCats(body.ttcats), BV.ttcats, "arr", W, 60);
    return json({ ok: true, updatedAt: now, key: "ttcats", merged: r.merged, value: r.value });
  }

  // 취재 연락처(contacts) 저장
  if (Array.isArray(body.contacts)) {
    const contacts = body.contacts.slice(0, 300).map(cleanContact);
    const r = await saveDomain(env, CONTACTS, "contacts", contacts, BV.contacts, "arr", W, 300);
    return json({ ok: true, updatedAt: now, key: "contacts", merged: r.merged, value: r.value });
  }

  // 인원별 오프타임(offtimes) 저장 — 객체
  if (body.offtimes && typeof body.offtimes === "object" && !Array.isArray(body.offtimes)) {
    const r = await saveDomain(env, OFFTIMES, "offtimes", cleanOff(body.offtimes), BV.offtimes, "obj", W);
    return json({ ok: true, updatedAt: now, key: "offtimes", merged: r.merged, value: r.value });
  }

  // 분단 명단(divisions) 저장
  if (Array.isArray(body.divisions)) {
    const divisions = body.divisions.slice(0, 60).map(cleanDivision);
    const r = await saveDomain(env, DIVISIONS, "divisions", divisions, BV.divisions, "arr", W, 60);
    return json({ ok: true, updatedAt: now, key: "divisions", merged: r.merged, value: r.value });
  }

  // 의전 일정(protocol) 저장
  if (Array.isArray(body.protocol)) {
    const protocol = body.protocol.slice(0, 200).map(cleanProtocol);
    const r = await saveDomain(env, PROTOCOL, "protocol", protocol, BV.protocol, "arr", W, 200);
    return json({ ok: true, updatedAt: now, key: "protocol", merged: r.merged, value: r.value });
  }

  // 현장 위치 지도 — 수동 배치(mappos) 저장 — 객체
  if (body.mappos && typeof body.mappos === "object" && !Array.isArray(body.mappos)) {
    const r = await saveDomain(env, MAPPOS, "mappos", cleanMapPos(body.mappos), BV.mappos, "obj", W);
    return json({ ok: true, updatedAt: now, key: "mappos", merged: r.merged, value: r.value });
  }

  // 현장 지도 — 촬영 요청(shoots) 저장
  if (Array.isArray(body.shoots)) {
    const shoots = body.shoots.slice(0, 200).map(cleanShoot);
    const r = await saveDomain(env, SHOOTS, "shoots", shoots, BV.shoots, "arr", W, 200);
    return json({ ok: true, updatedAt: now, key: "shoots", merged: r.merged, value: r.value });
  }

  // 카드(슬롯) 저장
  const slotKey = (body.slotKey || "").toString().slice(0, 120);
  if (!slotKey) return json({ error: "slotKey required" }, 400);

  let rec = { k: slotKey, edit: {}, history: [], notes: [], deleted: false };
  const raw = await env.SCOUT_KV.get(SLOT(slotKey));
  if (raw) { try { rec = JSON.parse(raw); } catch {} }

  if (body.edit && typeof body.edit === "object") rec.edit = cleanEdit(body.edit);
  if (typeof body.deleted === "boolean") rec.deleted = body.deleted;
  if (body.addHistory && (body.addHistory.html != null)) {
    rec.history = Array.isArray(rec.history) ? rec.history : [];
    rec.history.push({ ts: now, author, ip, html: (body.addHistory.html || "").toString().slice(0, 30000) });
    rec.history = rec.history.slice(-200);
  }
  if (body.addNote && (body.addNote.text != null)) {
    rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
    rec.notes.push({ ts: now, author, ip, text: (body.addNote.text || "").toString().slice(0, 2000) });
    rec.notes = rec.notes.slice(-300);
  }
  // 일정 이동(드래그앤드랍)용: 히스토리/메모 배열 통째로 설정
  if (Array.isArray(body.setHistory)) {
    rec.history = body.setHistory.slice(-200).map((h) => ({ ts: (h && h.ts) || now, author: (h && h.author) || author, ip: (h && h.ip) || ip, html: ((h && h.html) || "").toString().slice(0, 30000) }));
  }
  if (Array.isArray(body.setNotes)) {
    rec.notes = body.setNotes.slice(-300).map((n) => ({ ts: (n && n.ts) || now, author: (n && n.author) || author, ip: (n && n.ip) || ip, text: ((n && n.text) || "").toString().slice(0, 2000) }));
  }
  rec.updatedAt = now; rec.author = author; rec.ip = ip;
  await env.SCOUT_KV.put(SLOT(slotKey), JSON.stringify(rec));
  await appendLog(env, { ts: now, action: "jp.slot", count: 0, ip: clientIp(request) });
  return json({ ok: true, slot: rec });
}

export async function onRequestDelete(ctx) {
  const { request, env } = ctx;
  if (!(await memberOrAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  const k = new URL(request.url).searchParams.get("slotKey");
  if (!k) return json({ error: "slotKey required" }, 400);
  await env.SCOUT_KV.delete(SLOT(k));
  await appendLog(env, { ts: new Date().toISOString(), action: "jp.delete", count: 0, ip: clientIp(request) });
  cachePurge(ctx, "/api/jamboree-plan");
  return json({ ok: true });
}
