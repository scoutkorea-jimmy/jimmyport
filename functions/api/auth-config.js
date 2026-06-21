/* GET /api/auth-config → public: tells the admin page which auth mode is active
 * and whether the server is configured. The TOTP secret itself never leaves the server. */
import { json } from "./_lib.js";

export async function onRequestGet({ env }) {
  return json({ mode: "totp", configured: !!env.TOTP_SECRET });
}
