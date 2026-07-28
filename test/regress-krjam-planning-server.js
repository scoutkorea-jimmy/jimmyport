/* krjam-planning 서버 로직 회귀 — 순수함수 단위 테스트(브라우저 불필요).
 * 실행: node test/regress-krjam-planning-server.js
 * 동시편집 병합('다른 사람이 편집 중')은 실제로 다른 작성자가 그 사이 바꿨을 때만 일어나야 한다
 * (혼자·같은 사람의 레이스/캐시로 baseVer 만 옛것인 경우 = 오탐 → 병합 금지). */
import { conflictByOther, cleanRoster } from '../functions/api/jamboree-plan.js';
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

const ok = R.filter(Boolean).length;
console.log('=== ' + ok + '/' + R.length + ' PASS ===');
process.exit(ok === R.length ? 0 : 1);
