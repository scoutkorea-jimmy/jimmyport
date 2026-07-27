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
import { json, issueMemberSession } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch {}
  const id = String(b.id == null ? "" : b.id).trim();
  const pw = String(b.pw == null ? "" : b.pw);
  // 실패도 200 {ok:false} 로 응답한다(401 은 브라우저 콘솔에 리소스 오류로 찍혀, '콘솔 에러 0' 기준을 깬다).
  if (id !== "admin" || pw !== "admin") return json({ ok: false, error: "invalid" });
  const s = await issueMemberSession(env, { fnc: 1, name: "급식 관리자" });
  return json({ ok: true, token: s.token, exp: s.exp });
}
