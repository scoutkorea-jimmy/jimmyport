/* 회귀 실행 현황 — 작업자 컴퓨터 → 사이트 (v0.9.258)
 *
 *  POST /api/run-status   (Bearer RUN_TOKEN)  현재 진행 상황 갱신
 *  GET  /api/run-status   (관리자 TOTP 세션)   대시보드가 읽는다
 *
 * KV: "run:status" = { label, rounds, roundTotal, done, total, fails, items[], startedAt, updatedAt, finishedAt, ok }
 *
 * ⚠️ 회귀는 **작업자 노트북에서** 돈다. 사이트가 그걸 알 방법은 이 엔드포인트뿐이다.
 *    그래서 쓰기는 세션이 아니라 **전용 토큰(RUN_TOKEN)** 으로 받는다 — 스크립트가 TOTP 를 칠 수는 없다.
 *    토큰이 설정돼 있지 않으면 쓰기는 503 이고, 대시보드는 "연결 안 됨"으로 표시한다.
 * ⚠️ 여기 담기는 건 **검사 이름과 숫자뿐**이다. 소스도 로그 본문도 올리지 않는다.
 * ⚠️ 24시간 TTL — 오래된 실행 기록이 대시보드에 남아 "지금 돌고 있다"고 착각하게 만들지 않는다.
 */
import { json, isAdmin } from "./_lib.js";

const KEY = "run:status";
const TTL = 24 * 3600;
export const STALE_MS = 90 * 1000;      // 이 시간 넘게 갱신이 없으면 '끊김'으로 본다

const num = (v, max) => { const n = parseInt(v, 10); return isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const str = (v, n) => String(v == null ? "" : v).slice(0, n);

export const cleanRun = (b) => ({
  label: str(b && b.label, 60),
  rounds: num(b && b.rounds, 20),
  roundTotal: num(b && b.roundTotal, 20),
  done: num(b && b.done, 2000),
  total: num(b && b.total, 2000),
  fails: num(b && b.fails, 2000),
  checks: num(b && b.checks, 100000),
  items: Array.isArray(b && b.items) ? b.items.slice(-40).map((x) => ({
    round: num(x && x.round, 20),
    name: str(x && x.name, 60),
    pass: num(x && x.pass, 100000),
    total: num(x && x.total, 100000),
    ok: !!(x && x.ok),
  })) : [],
  /* 실패는 '어디서 · 무엇이 · 왜' 를 남긴다 — 숫자만 남기면 대시보드를 보고도 로그를 다시 뒤져야 한다. */
  failures: Array.isArray(b && b.failures) ? b.failures.slice(-40).map((x) => ({
    round: num(x && x.round, 20),
    file: str(x && x.file, 60),      // 어느 검사 파일에서
    check: str(x && x.check, 160),   // 어떤 케이스가
    detail: str(x && x.detail, 400), // 왜(측정값·메시지)
  })) : [],
  running: str(b && b.running, 80),
  startedAt: str(b && b.startedAt, 40),
  finishedAt: str(b && b.finishedAt, 40),
  ok: !!(b && b.ok),
});

export async function onRequestPost({ request, env }) {
  if (!env.RUN_TOKEN) return json({ ok: false, error: "run_token_not_configured" }, 503);
  const auth = request.headers.get("authorization") || "";
  if (auth !== "Bearer " + env.RUN_TOKEN) return json({ ok: false, error: "unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}
  const rec = cleanRun(body);
  rec.updatedAt = new Date().toISOString();
  await env.SCOUT_KV.put(KEY, JSON.stringify(rec), { expirationTtl: TTL });
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ ok: false, error: "unauthorized" }, 401);
  let run = null;
  try { const raw = await env.SCOUT_KV.get(KEY); if (raw) run = JSON.parse(raw); } catch {}
  const configured = !!env.RUN_TOKEN;
  return json({ ok: true, configured, run, staleMs: STALE_MS, now: new Date().toISOString() });
}
