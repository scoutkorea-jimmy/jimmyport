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
function cleanRoster(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    id: (e.id || "").toString().slice(0, 40),
    name: (e.name || "").toString().slice(0, 60),
    role: (e.role || "").toString().slice(0, 80),
    duty: (e.duty || "").toString().slice(0, 400),
    contact: (e.contact || "").toString().slice(0, 80),
    channel: (e.channel || "").toString().slice(0, 160),
    team: (e.team || "").toString().slice(0, 20),
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
// 도메인 저장 — 버전 가드 후 통짜 교체 또는 병합. 반환 {value, merged}. extra=추가 필드(roster.teams 등).
async function saveDomain(env, KEY, field, cleaned, baseVer, kind, now, cap, extra) {
  let stored = null, storedVer = null;
  const raw = await env.SCOUT_KV.get(KEY);
  if (raw) { try { const p = JSON.parse(raw); stored = p[field]; storedVer = p.updatedAt || null; } catch {} }
  let value = cleaned, merged = false;
  if (baseVer && storedVer && baseVer !== storedVer) {   // 충돌 — 내가 불러온 뒤 서버가 바뀜
    value = kind === "obj" ? mergeObj(stored, cleaned) : mergeArrById(stored, cleaned);
    merged = true;
    if (kind !== "obj" && cap && Array.isArray(value) && value.length > cap) value = value.slice(0, cap);
  }
  const wrap = Object.assign({ [field]: value, updatedAt: now }, extra || {});
  await env.SCOUT_KV.put(KEY, JSON.stringify(wrap));
  return { value, merged };
}

export async function onRequestGet(ctx) {
  const { env } = ctx;
  // 내부 운영 보드 — 연락처(전화·이메일)·인원 실명이 담기므로 로그인(회원 세션) 필수.
  // 캐시 조회보다 먼저 검사해야 무인증 요청이 캐시 히트로 새지 않는다.
  if (!(await memberOrAdmin(ctx.request, env))) return json({ error: "unauthorized" }, 401);
  const hit = await cacheMatch(ctx.request);  // the board GET takes no query params → one cache key
  if (hit) return hit;
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

  const resp = jsonCacheable({ slots, marketing, meals, shootlist, types, events, timetable, roster, teams, ttcats, offtimes, contacts, divisions, protocol, mappos, shoots, versions }, 30);  // short TTL; writes purge it
  cachePut(ctx, resp);
  return resp;
}

export async function onRequestPut(ctx) {
  // 과거 "작성자 이름 기반·토큰 없음" 설계(§16.5)의 잔재 — 개별 로그인 도입(v0.9.103) 후에도
  // 쓰기가 무인증이라 비로그인 상태로 보드 전체를 덮어쓸 수 있었다. 회원 세션 필수로 전환.
  if (!(await memberOrAdmin(ctx.request, ctx.env))) return json({ error: "unauthorized" }, 401);
  const resp = await putImpl(ctx);
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

  // 마케팅 저장
  const BV = (body.baseVer && typeof body.baseVer === "object") ? body.baseVer : {};

  if (Array.isArray(body.marketing)) {
    const r = await saveDomain(env, MKT, "marketing", body.marketing.slice(0, 300), BV.marketing, "arr", now, 300);
    await appendLog(env, { ts: now, action: "jp.marketing", count: 0, ip: clientIp(request) });
    return json({ ok: true, updatedAt: now, key: "marketing", merged: r.merged, value: r.value });
  }

  // 식사 메뉴 저장 (대원/운영요원 × 날짜 × 조·중·석식) — 객체
  if (body.meals && typeof body.meals === "object" && !Array.isArray(body.meals)) {
    const r = await saveDomain(env, MEALS, "meals", cleanMeals(body.meals), BV.meals, "obj", now);
    return json({ ok: true, updatedAt: now, key: "meals", merged: r.merged, value: r.value });
  }

  // 촬영 필요 리스트 저장
  if (Array.isArray(body.shootlist)) {
    const r = await saveDomain(env, SHOOTLIST, "shootlist", body.shootlist.slice(0, 500).map(cleanShoot2), BV.shootlist, "arr", now, 500);
    return json({ ok: true, updatedAt: now, key: "shootlist", merged: r.merged, value: r.value });
  }

  // 콘텐츠 종류 목록 저장 (문자열 배열 — id 없어 병합 불가 → 통짜)
  if (Array.isArray(body.types)) {
    const types = body.types.slice(0, 60).map((t) => (t || "").toString().slice(0, 40)).filter(Boolean);
    const r = await saveDomain(env, TYPES, "types", types, BV.types, "arr", now, 60);
    return json({ ok: true, updatedAt: now, key: "types", merged: r.merged, value: r.value });
  }

  // 운영 일정(events) 저장
  if (Array.isArray(body.events)) {
    const events = body.events.slice(0, 300).map(cleanEvent).filter((e) => e.start);
    const r = await saveDomain(env, EVENTS, "events", events, BV.events, "arr", now, 300);
    return json({ ok: true, updatedAt: now, key: "events", merged: r.merged, value: r.value });
  }

  // 일자별 시간 일정표(timetable) 저장
  if (Array.isArray(body.timetable)) {
    const timetable = body.timetable.slice(0, 400).map(cleanTT).filter((e) => e.day);
    const r = await saveDomain(env, TIMETABLE, "timetable", timetable, BV.timetable, "arr", now, 400);
    return json({ ok: true, updatedAt: now, key: "timetable", merged: r.merged, value: r.value });
  }

  // 홍보부 인원 R&R(roster) 저장 (+ 편집 가능한 팀명 teams)
  if (Array.isArray(body.roster)) {
    const roster = body.roster.slice(0, 100).map(cleanRoster);
    let teams = null;
    if (body.teams && typeof body.teams === "object") teams = cleanTeams(body.teams);
    else { try { teams = JSON.parse(await env.SCOUT_KV.get(ROSTER) || "{}").teams || null; } catch {} }
    const r = await saveDomain(env, ROSTER, "roster", roster, BV.roster, "arr", now, 100, { teams });
    return json({ ok: true, updatedAt: now, key: "roster", merged: r.merged, value: r.value, teams });
  }

  // 일정 종류(ttcats) 저장 (id 없어 통짜)
  if (Array.isArray(body.ttcats)) {
    const r = await saveDomain(env, TTCATS, "ttcats", cleanTtCats(body.ttcats), BV.ttcats, "arr", now, 60);
    return json({ ok: true, updatedAt: now, key: "ttcats", merged: r.merged, value: r.value });
  }

  // 취재 연락처(contacts) 저장
  if (Array.isArray(body.contacts)) {
    const contacts = body.contacts.slice(0, 300).map(cleanContact);
    const r = await saveDomain(env, CONTACTS, "contacts", contacts, BV.contacts, "arr", now, 300);
    return json({ ok: true, updatedAt: now, key: "contacts", merged: r.merged, value: r.value });
  }

  // 인원별 오프타임(offtimes) 저장 — 객체
  if (body.offtimes && typeof body.offtimes === "object" && !Array.isArray(body.offtimes)) {
    const r = await saveDomain(env, OFFTIMES, "offtimes", cleanOff(body.offtimes), BV.offtimes, "obj", now);
    return json({ ok: true, updatedAt: now, key: "offtimes", merged: r.merged, value: r.value });
  }

  // 분단 명단(divisions) 저장
  if (Array.isArray(body.divisions)) {
    const divisions = body.divisions.slice(0, 60).map(cleanDivision);
    const r = await saveDomain(env, DIVISIONS, "divisions", divisions, BV.divisions, "arr", now, 60);
    return json({ ok: true, updatedAt: now, key: "divisions", merged: r.merged, value: r.value });
  }

  // 의전 일정(protocol) 저장
  if (Array.isArray(body.protocol)) {
    const protocol = body.protocol.slice(0, 200).map(cleanProtocol);
    const r = await saveDomain(env, PROTOCOL, "protocol", protocol, BV.protocol, "arr", now, 200);
    return json({ ok: true, updatedAt: now, key: "protocol", merged: r.merged, value: r.value });
  }

  // 현장 위치 지도 — 수동 배치(mappos) 저장 — 객체
  if (body.mappos && typeof body.mappos === "object" && !Array.isArray(body.mappos)) {
    const r = await saveDomain(env, MAPPOS, "mappos", cleanMapPos(body.mappos), BV.mappos, "obj", now);
    return json({ ok: true, updatedAt: now, key: "mappos", merged: r.merged, value: r.value });
  }

  // 현장 지도 — 촬영 요청(shoots) 저장
  if (Array.isArray(body.shoots)) {
    const shoots = body.shoots.slice(0, 200).map(cleanShoot);
    const r = await saveDomain(env, SHOOTS, "shoots", shoots, BV.shoots, "arr", now, 200);
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
