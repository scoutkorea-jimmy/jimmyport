/* krjam-planning 서버 로직 회귀 — 순수함수 단위 테스트(브라우저 불필요).
 * 실행: node test/regress-krjam-planning-server.js
 * 동시편집 병합('다른 사람이 편집 중')은 실제로 다른 작성자가 그 사이 바꿨을 때만 일어나야 한다
 * (혼자·같은 사람의 레이스/캐시로 baseVer 만 옛것인 경우 = 오탐 → 병합 금지). */
import { conflictByOther, cleanRoster, cleanTT, cleanDivision } from '../functions/api/jamboree-plan.js';
import { shrankTooMuch, countOf } from '../functions/api/_save-guard.js';
import { issueMemberSession } from '../functions/api/_lib.js';

const R = [];
const chk = (n, got, exp) => { const p = got === exp; R.push(p); console.log((p ? '  PASS ' : '  FAIL ') + n + ' — ' + got); };

console.log('[동시편집 병합 판정 — conflictByOther]');
chk('같은 작성자 + 버전 다름 → 병합 안 함(오탐 방지)', conflictByOther('V1', 'V2', '김기자', '김기자'), false);
chk('다른 작성자 + 버전 다름 → 병합', conflictByOther('V1', 'V2', '김기자', '이사진'), true);
chk('버전 같음 → 병합 안 함', conflictByOther('V2', 'V2', '김기자', '이사진'), false);
chk('baseVer 없음(첫 저장) → 병합 안 함', conflictByOther(null, 'V2', '김기자', '이사진'), false);
chk('storedVer 없음(빈 키) → 병합 안 함', conflictByOther('V1', null, '김기자', '이사진'), false);
chk('구버전 데이터(작성자 없음) → 병합 안 함(통짜 저장)', conflictByOther('V1', 'V2', null, '이사진'), false);
chk('현재 작성자 미상 → 병합 안 함', conflictByOther('V1', 'V2', '김기자', ''), false);

/* 같은 사람이 PC·휴대폰(또는 두 탭)에서 같이 열어 두면, 작성자만 보던 판정은 나중 저장이 앞 저장을
 * 경고 없이 통째로 덮어썼다(lost update). client = 탭 단위 id → 창이 다르면 '다른 편집 맥락'으로 병합. */
console.log('\n[같은 작성자 · 다른 편집 창(client)]');
chk('같은 작성자 + 다른 창 → 병합(다기기 유실 방지)', conflictByOther('V1', 'V2', '김기자', '김기자', 'cA', 'cB'), true);
chk('같은 작성자 + 같은 창 → 병합 안 함(v0.9.226 오탐 방지 유지)', conflictByOther('V1', 'V2', '김기자', '김기자', 'cA', 'cA'), false);
chk('같은 작성자 + 저장본에 client 없음(구버전) → 병합 안 함', conflictByOther('V1', 'V2', '김기자', '김기자', null, 'cB'), false);
chk('같은 작성자 + 요청에 client 없음(구버전 클라) → 병합 안 함', conflictByOther('V1', 'V2', '김기자', '김기자', 'cA', ''), false);
chk('버전 같으면 창이 달라도 병합 안 함', conflictByOther('V2', 'V2', '김기자', '김기자', 'cA', 'cB'), false);
chk('다른 작성자면 창 정보 없어도 병합', conflictByOther('V1', 'V2', '김기자', '이사진', null, null), true);

console.log('\n[roster 저장 정리 — cleanRoster]');
chk('입영(arrive) 필드 보존(저장마다 유실 방지)', cleanRoster({ id: 'r1', name: '김', arrive: '2026-08-05T09:00' }).arrive, '2026-08-05T09:00');
chk('입영 없으면 빈 문자열(폭발 안 함)', cleanRoster({ id: 'r1', name: '김' }).arrive, '');
chk('기존 필드(name·team) 유지', cleanRoster({ id: 'r1', name: '김', team: 't1' }).name + '/' + cleanRoster({ id: 'r1', team: 't1' }).team, '김/t1');

/* 일정표 저장 정리 — 화이트리스트라 새 필드를 빠뜨리면 저장할 때마다 조용히 유실된다(roster.arrive 가 실제로 그랬다).
 * 입·퇴영 트랙은 dir('in'|'out')이 없으면 입영/퇴영 구분이 통째로 사라진다 → 여기서 못 박는다. */
console.log('\n[일정표 저장 정리 — cleanTT]');
chk('입·퇴영 track 보존', cleanTT({ id: 'b1', track: 'bus', dir: 'out' }).track, 'bus');
chk('입·퇴영 dir=out 보존(저장마다 유실 방지)', cleanTT({ id: 'b1', track: 'bus', dir: 'out' }).dir, 'out');
chk('입·퇴영 dir=in 보존', cleanTT({ id: 'b1', track: 'bus', dir: 'in' }).dir, 'in');
chk('dir 없으면 빈 문자열', cleanTT({ id: 't1', track: '' }).dir, '');
chk('dir 값이 이상하면 빈 문자열(임의값 저장 안 함)', cleanTT({ id: 't1', dir: '퇴영' }).dir, '');
chk('컵 트랙 track/batch 는 그대로', cleanTT({ id: 'c1', track: 'cub', batch: 2 }).track + '/' + cleanTT({ id: 'c1', track: 'cub', batch: 2 }).batch, 'cub/2');

/* 분단 명단 저장 정리 — fedver 는 '연맹 목록을 배치도 판으로 이미 맞췄다'는 표식이다(v0.9.292).
 * 화이트리스트에서 빠지면 저장할 때마다 표식이 날아가 같은 마이그레이션이 매 로드마다 반복된다
 * → 사용자가 나중에 더한 연맹이 로드할 때마다 조용히 지워진다. */
console.log('\n[분단 명단 저장 정리 — cleanDivision]');
chk('연맹 정본 표식 fedver 보존', cleanDivision({ id: 'd1', name: '큰물결분단', fedver: '2026-07-23' }).fedver, '2026-07-23');
chk('fedver 없으면 빈 문자열(폭발 안 함)', cleanDivision({ id: 'd1', name: '큰물결분단' }).fedver, '');
chk('연맹 목록·분단장 등 기존 필드 유지', cleanDivision({ id: 'd1', name: '큰물결분단', federations: '전북연맹, 대만', leader: '엄정영' }).federations + '/' + cleanDivision({ id: 'd1', leader: '엄정영' }).leader, '전북연맹, 대만/엄정영');

/* ── 부분 전멸 가드 (v0.9.286) ────────────────────────────────────────────────
 * 여기까지의 보호(낙관적 잠금·병합)는 "누가 먼저 바꿨나"만 본다. 혼자 편집하는 중에 항목이
 * 대량으로 사라지는 저장 — 화면이 덜 그려진 상태에서 저장, 실수로 전체 삭제 — 은 충돌이
 * 아니라서 그대로 통과했다. 그 경로를 막고, 확인하고 지웠으면 되돌릴 수 있어야 한다. */
console.log('\n[부분 전멸 판정 — shrankTooMuch]');
chk('40개 → 3개 = 사고로 본다', shrankTooMuch(40, 3), true);
chk('10개 → 5개 = 딱 절반은 통과(정상 편집 범위)', shrankTooMuch(10, 5), false);
chk('10개 → 4개 = 절반 미만이라 막는다', shrankTooMuch(10, 4), true);
chk('항목이 적으면(4개 이하) 가드하지 않는다 — 매번 물으면 확인이 습관이 된다', shrankTooMuch(4, 0), false);
chk('늘어나는 저장은 당연히 통과', shrankTooMuch(10, 20), false);
chk('처음 저장(had 0)은 통과', shrankTooMuch(0, 0), false);

console.log('\n[항목 수 세기 — countOf]');
chk('배열은 길이', countOf([1, 2, 3]), 3);
chk('객체는 키 수', countOf({ a: 1, b: 2 }), 2);
chk('없으면 0(폭발 안 함)', countOf(null), 0);

/* 실제 배포 모듈을 가짜 KV(Map)로 돌린다 — 운영 KV 는 읽지도 쓰지도 않는다. */
console.log('\n[실제 모듈 — 저장 가드·되돌리기]');
const KV = new Map();
const env = {
  TOTP_SECRET: 'test-secret-for-regression',
  SCOUT_KV: {
    get: async (k) => (KV.has(k) ? KV.get(k) : null),
    put: async (k, v) => { KV.set(k, v); },
    list: async () => ({ keys: [], list_complete: true }),
    delete: async (k) => { KV.delete(k); },
  },
};
const { token } = await issueMemberSession(env, { username: 'kim', name: '김기자', staff: true });
const plan = await import('../functions/api/jamboree-plan.js');
const ctxOf = (body) => ({
  request: new Request('https://x/api/jamboree-plan', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  }),
  env,
  waitUntil: () => {},
});
const put = async (body) => { const r = await plan.onRequestPut(ctxOf(body)); return { s: r.status, j: await r.json() }; };
const roster10 = Array.from({ length: 10 }, (_, i) => ({ id: 'r' + i, name: '요원' + i }));

let r = await put({ roster: roster10, author: '김기자', client: 'c1' });
chk('인원 10명 첫 저장 성공', r.s === 200 && r.j.value.length, 10);
const ver1 = r.j.updatedAt;
r = await put({ roster: roster10.slice(0, 2), author: '김기자', client: 'c1', baseVer: { roster: ver1 } });
chk('10명 → 2명 저장은 409 로 멈춘다', r.s === 409 && r.j.error, 'shrink_guard');
r = await plan.onRequestGet({ request: new Request('https://x/api/jamboree-plan', { headers: { Authorization: 'Bearer ' + token } }), env, waitUntil: () => {} });
chk('막힌 저장은 아무것도 지우지 않았다', (await r.json()).roster.length, 10);
r = await put({ roster: roster10.slice(0, 2), author: '김기자', client: 'c1', baseVer: { roster: ver1 }, confirmShrink: true });
chk('사람이 확인하면(confirmShrink) 저장된다', r.s === 200 && r.j.value.length, 2);

r = await plan.onRequestGet({ request: new Request('https://x/api/jamboree-plan?snapshots=roster', { headers: { Authorization: 'Bearer ' + token } }), env, waitUntil: () => {} });
const snaps = (await r.json()).snapshots || [];
chk('대량 삭제 직전 상태가 보관된다', snaps.length >= 1 && snaps[0].count, 10);
r = await put({ restoreDomain: 'roster', at: snaps[0].at, author: '김기자', client: 'c1' });
chk('그 시점으로 되돌릴 수 있다', r.s === 200 && r.j.value.length, 10);
r = await plan.onRequestGet({ request: new Request('https://x/api/jamboree-plan?snapshots=nosuch', { headers: { Authorization: 'Bearer ' + token } }), env, waitUntil: () => {} });
chk('모르는 도메인은 되돌리기 대상이 아니다', r.status, 400);
r = await put({ restoreDomain: 'roster', at: '없는시각', author: '김기자', client: 'c1' });
chk('없는 스냅샷은 404(조용히 덮어쓰지 않는다)', r.s, 404);
chk('되돌리기가 감사 기록에 남는다',
  JSON.parse(KV.get('log') || '[]').some((x) => x.action === 'jp.restore'), true);

/* ── 목록 조회는 병렬로 읽는다 (v0.9.287) ────────────────────────────────────
 * 사용자: "기사 불러오는게 화가 날 정도로 오래걸리네."
 * 원인은 `for (const k of res.keys) { await SCOUT_KV.get(k.name) }` — 레코드 1건당 왕복 1회를
 * **줄 세워** 기다렸다. 기사가 쌓일수록 정직하게 느려진다.
 * ⚠️ 시간(ms)으로 검사하면 기계 상태에 따라 흔들린다(플레이키 = 결함). 대신 가짜 KV 가
 *    **동시에 떠 있던 get 개수**를 세게 해서, 순차로 되돌아가면 반드시 깨지게 만든다. */
console.log('\n[목록 조회 — 병렬 KV 읽기]');
const mkKV = (prefix, n) => {
  const map = new Map();
  for (let i = 0; i < n; i++) {
    const id = 'r' + String(i).padStart(3, '0');
    map.set(prefix + id, JSON.stringify({ id, title: 't' + i, createdAt: '2026-07-28T00:00:0' + (i % 10) + 'Z', staff: true }));
  }
  let inFlight = 0, peak = 0, gets = 0;
  return {
    peak: () => peak, gets: () => gets,
    env: {
      TOTP_SECRET: 'test-secret-for-regression',
      SCOUT_KV: {
        list: async ({ prefix: p }) => ({ keys: [...map.keys()].filter((k) => k.startsWith(p)).map((name) => ({ name })), list_complete: true }),
        get: async (k) => {
          if (!String(k).startsWith(prefix)) return null;      // 세션 키 등은 계측에서 제외
          inFlight++; gets++; peak = peak > inFlight ? peak : inFlight;
          await new Promise((r) => setTimeout(r, 3));
          inFlight--;
          return map.has(k) ? map.get(k) : null;
        },
        put: async () => {},
        delete: async () => {},
      },
    },
  };
};
const N = 30;
const ENDPOINTS = [
  ['jp-news', 'jpn:', 'articles'],
  ['jp-assets', 'jpa:', 'assets'],
  ['jp-press', 'jpp:', 'press'],
  ['jp-tips', 'jpt:', 'tips'],
];
for (const [mod, prefix, key] of ENDPOINTS) {
  const h = mkKV(prefix, N);
  const tok = (await issueMemberSession(h.env, { username: 'kim', name: '김기자', staff: true, master: true })).token;
  const m = await import('../functions/api/' + mod + '.js');
  const r = await m.onRequestGet({ request: new Request('https://x/api/' + mod, { headers: { Authorization: 'Bearer ' + tok } }), env: h.env });
  const j = await r.json();
  chk(mod + ': ' + N + '건을 모두 읽는다', (j[key] || []).length, N);
  chk(mod + ': 순차가 아니라 병렬로 읽는다(동시 get 최대 ' + h.peak() + ')', h.peak() >= 10, true);
}

/* 목록 응답 무게 (v0.9.287) — history 에는 판마다 본문·사진이 통째로 들어 있다(레코드 1건 최대 1.5MB).
   목록에 그대로 실으면 기사 수 × 판 수 만큼의 본문이 매번 브라우저로 내려간다. 화면의 '버전 기록'
   목록은 v·제목·작성자·시각만 쓰므로 목록에서는 본문을 빼고, 옛 판을 실제로 열 때 ?id= 로 받는다. */
console.log('\n[기사 목록 — 옛 판 본문은 빼고 보낸다]');
{
  const map = new Map();
  map.set('jpn:a1', JSON.stringify({
    id: 'a1', title: '개영식', body: '<p>현재 본문</p>', createdAt: '2026-07-01T10:00:00Z', version: 2,
    history: [
      { v: 1, title: '개영식(초안)', body: '<p>첫 판 본문</p>', images: ['/api/image?id=x'], at: '2026-07-01T10:00:00Z', by: 'kim', byName: '김기자' },
      { v: 2, title: '개영식', body: '<p>현재 본문</p>', images: [], at: '2026-07-02T10:00:00Z', by: 'kim', byName: '김기자' },
    ],
  }));
  const env2 = { TOTP_SECRET: 'test-secret-for-regression', SCOUT_KV: {
    list: async ({ prefix }) => ({ keys: [...map.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
    get: async (k) => (map.has(k) ? map.get(k) : null), put: async () => {}, delete: async () => {},
  } };
  const t = (await issueMemberSession(env2, { username: 'kim', name: '김기자', staff: true })).token;
  const nm = await import('../functions/api/jp-news.js');
  const call = async (q) => (await (await nm.onRequestGet({ request: new Request('https://x/api/jp-news' + q, { headers: { Authorization: 'Bearer ' + t } }), env: env2 })).json());

  const list = await call('');
  const h = list.articles[0].history;
  chk('목록에도 버전 기록은 남는다(판 수)', h.length, 2);
  chk('목록의 옛 판에는 본문이 없다', h.every((x) => x.body === undefined), true);
  chk('목록의 옛 판에는 사진도 없다', h.every((x) => x.images === undefined), true);
  chk('버전 목록에 필요한 것은 남는다(v·제목·작성자·시각)',
    !!(h[0].v && h[0].title && h[0].byName && h[0].at), true);
  chk('현재 판 본문은 목록에 그대로 있다(목록 화면이 본문을 쓴다)', list.articles[0].body, '<p>현재 본문</p>');

  const one = await call('?id=a1');
  chk('한 건 조회는 옛 판 본문까지 준다', one.article.history[0].body, '<p>첫 판 본문</p>');
  chk('한 건 조회는 옛 판 사진까지 준다', (one.article.history[0].images || []).length, 1);
  const miss = await nm.onRequestGet({ request: new Request('https://x/api/jp-news?id=nope', { headers: { Authorization: 'Bearer ' + t } }), env: env2 });
  chk('없는 기사는 404', miss.status, 404);
  const noAuth = await nm.onRequestGet({ request: new Request('https://x/api/jp-news?id=a1'), env: env2 });
  chk('한 건 조회도 로그인 필수', noAuth.status, 401);
}

/* 병렬로 읽으면 담기는 순서가 매번 다르다 → 정렬이 동점을 안 가르면 새로고침마다 목록이 뒤바뀐다. */
const h2 = mkKV('jpn:', N);
const tok2 = (await issueMemberSession(h2.env, { username: 'kim', name: '김기자', staff: true })).token;
const news = await import('../functions/api/jp-news.js');
const reqNews = () => news.onRequestGet({ request: new Request('https://x/api/jp-news', { headers: { Authorization: 'Bearer ' + tok2 } }), env: h2.env })
  .then((r) => r.json()).then((j) => (j.articles || []).map((a) => a.id).join(','));
const o1 = await reqNews(), o2 = await reqNews();
chk('두 번 불러도 목록 순서가 같다(동점 id 로 고정)', o1 === o2, true);
chk('최신순 정렬은 유지된다', o1.split(',')[0], 'r009');

const ok = R.filter(Boolean).length;
console.log('=== ' + ok + '/' + R.length + ' PASS ===');
process.exit(ok === R.length ? 0 : 1);
