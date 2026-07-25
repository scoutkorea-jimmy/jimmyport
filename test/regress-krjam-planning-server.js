/* krjam-planning 서버 로직 회귀 — 순수함수 단위 테스트(브라우저 불필요).
 * 실행: node test/regress-krjam-planning-server.js
 * 동시편집 병합('다른 사람이 편집 중')은 실제로 다른 작성자가 그 사이 바꿨을 때만 일어나야 한다
 * (혼자·같은 사람의 레이스/캐시로 baseVer 만 옛것인 경우 = 오탐 → 병합 금지). */
import { conflictByOther } from '../functions/api/jamboree-plan.js';

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

const ok = R.filter(Boolean).length;
console.log('=== ' + ok + '/' + R.length + ' PASS ===');
process.exit(ok === R.length ? 0 : 1);
