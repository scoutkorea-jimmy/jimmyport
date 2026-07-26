/* krjam-planning 서버 로직 회귀 — 순수함수 단위 테스트(브라우저 불필요).
 * 실행: node test/regress-krjam-planning-server.js
 * 동시편집 병합('다른 사람이 편집 중')은 실제로 다른 작성자가 그 사이 바꿨을 때만 일어나야 한다
 * (혼자·같은 사람의 레이스/캐시로 baseVer 만 옛것인 경우 = 오탐 → 병합 금지). */
import { conflictByOther, cleanRoster } from '../functions/api/jamboree-plan.js';

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

const ok = R.filter(Boolean).length;
console.log('=== ' + ok + '/' + R.length + ' PASS ===');
process.exit(ok === R.length ? 0 : 1);
