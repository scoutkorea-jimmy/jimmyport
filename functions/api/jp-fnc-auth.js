/* 급식편의본부(fnc) 보드 전용 관리자 로그인 (v0.9.270)
 *
 *  POST /api/jp-fnc-auth { id, pw }  → id/pw 가 admin/admin 이면 서명 토큰 발급
 *      성공: { ok:true, token, exp }   실패: 401 { ok:false }
 *
 * ⚠️ 내부 운영 보드용 단순 게이트다(사용자 지시: id/pw = admin 통일). 강한 보안이 아니라,
 *    전화번호 전체 열람·운영요원/텍스트 편집을 '관리자'로만 제한하기 위한 서버측 확인이다.
 *    토큰은 홍보부 회원세션 인프라(HMAC 서명·만료)를 그대로 재사용하되 payload.fnc=1 로 표식한다.
 *    이 토큰의 검증은 _lib.js 의 fncAdmin(request, env) 이 담당한다(jp-fnc-staff·jp-meals 서버 게이트).
 */
import { json, issueMemberSession, clientIp } from "./_lib.js";

/* ⚠️ id/pw 가 단순하다(사용자 지시). 그래서 최소한 **시도 횟수**는 막는다 —
   자동화된 대량 시도로 세션이 계속 발급되면 편집 권한이 사실상 공개된다.
   IP 당 10분에 20회. 넘으면 429. */
const RL_MAX = 20, RL_TTL = 600;
async function rateOk(env, request) {
  const key = "fncauth:rl:" + (clientIp(request) || "noip");
  let n = 0;
  try { n = parseInt((await env.SCOUT_KV.get(key)) || "0", 10) || 0; } catch {}
  if (n >= RL_MAX) return false;
  try { await env.SCOUT_KV.put(key, String(n + 1), { expirationTtl: RL_TTL }); } catch {}
  return true;
}

export async function onRequestPost({ request, env }) {
  if (!(await rateOk(env, request))) return json({ ok: false, error: "too_many", message: "시도가 너무 많습니다. 잠시 뒤 다시 해 주세요." });
  let b = {};
  try { b = await request.json(); } catch {}
  const id = String(b.id == null ? "" : b.id).trim();
  const pw = String(b.pw == null ? "" : b.pw);
  // 실패도 200 {ok:false} 로 응답한다(401 은 브라우저 콘솔에 리소스 오류로 찍혀, '콘솔 에러 0' 기준을 깬다).
  if (id !== "admin" || pw !== "admin") return json({ ok: false, error: "invalid" });
  const s = await issueMemberSession(env, { fnc: 1, name: "급식 관리자" });
  return json({ ok: true, token: s.token, exp: s.exp });
}
