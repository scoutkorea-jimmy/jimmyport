/* GET /api/log → 관리자: 변경 로그 (수정일시·동작·IP) */
import { json, isAdmin, getArr } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  return json({ log: await getArr(env, "log") });
}
