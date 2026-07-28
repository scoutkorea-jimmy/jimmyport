/* 급식편의본부 저장 보호 공용 모듈 (v0.9.286)
 *
 * 급식 데이터(조직표 jp:fnc-org · 담당 배정 jp:fnc · 운영요원 jp:fnc-staff)는 전부
 * **통째 덮어쓰기** PUT 이다. 낙관적 잠금(baseVer)과 전멸 가드(empty_guard)는 이미 있지만
 * 같은 보호 코드를 세 파일에 복사해 두면 한 곳만 고치는 사고가 난다 → 여기 한 곳에 모은다.
 *
 *  · snapPush(env, key, entry)   덮어쓰기 직전 상태 보관(최근 SNAP_MAX 개 · 30일)
 *  · snapList(env, key)          보관 목록 그대로
 *  · snapFind(env, key, at)      시각으로 한 건 찾기
 *  · shrankTooMuch(had, now)     '부분 전멸' 판정
 *
 * ⚠️ **왜 부분 전멸 가드가 따로 필요한가**: empty_guard 는 딱 0 일 때만 막는다.
 *    실제로 무서운 사고는 40명 → 3명 처럼 **일부만 남는** 경우다(화면이 덜 그려진 상태에서 저장,
 *    편집 중 실수로 대량 삭제). 개수가 그대로면 잠금도 전멸 가드도 통과해 조용히 저장된다.
 *    그래서 절반 미만으로 줄면 confirmShrink 를 요구한다 — 의도한 정리는 한 번 더 누르면 되고,
 *    사고는 여기서 멈춘다.
 */

export const SNAP_MAX = 10;
const SNAP_TTL = 30 * 86400;

export async function snapList(env, key) {
  try {
    const raw = await env.SCOUT_KV.get(key);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  return [];
}

export async function snapFind(env, key, at) {
  const list = await snapList(env, key);
  return list.filter((x) => x && x.at === String(at))[0] || null;
}

/* 직전 상태를 목록 맨 앞에 넣는다. 스냅샷 저장이 실패해도 **본 저장은 진행**한다 —
   되돌리기 보관은 보조 장치라, 이것 때문에 정상 저장이 막히면 그게 더 큰 사고다. */
export async function snapPush(env, key, entry) {
  try {
    const list = await snapList(env, key);
    list.unshift(entry);
    await env.SCOUT_KV.put(key, JSON.stringify(list.slice(0, SNAP_MAX)), { expirationTtl: SNAP_TTL });
    return true;
  } catch { return false; }
}

/* 절반 미만으로 줄었는가. had 가 아주 적을 때(4 이하)는 정상 편집에서도 흔히 절반이 되므로
   가드하지 않는다 — 매번 확인을 요구하면 사람이 확인 버튼을 습관적으로 누르게 되고,
   그러면 가드가 있으나 마나가 된다. */
export function shrankTooMuch(had, now) {
  const a = Number(had) || 0, b = Number(now) || 0;
  if (a < 5) return false;
  return b < Math.ceil(a / 2);
}

/* 저장을 **중단**시키는 예외. 홍보부(/api/jamboree-plan)처럼 도메인 저장이 한 함수(saveDomain)를
   지나는 곳에서 쓴다 — 15개 호출부마다 if 를 붙이면 한 곳을 빠뜨리고, 그 도메인만 보호가 없어진다.
   핸들러 맨 바깥에서 한 번 잡아 409 로 바꾼다. */
export class GuardError extends Error {
  constructor(payload) { super(payload && payload.error || "guard"); this.payload = payload || {}; }
}

/* 도메인 값의 '항목 수' — 배열은 길이, 객체는 키 수. 부분 전멸 판정의 기준. */
export function countOf(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return 0;
}
