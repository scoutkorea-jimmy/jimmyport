/* GET /api/auth-config → public: Google Sign-In client id for the admin page.
 * (Client IDs are not secrets; the email allowlist (ADMIN_EMAILS) stays server-side.) */
import { json } from "./_lib.js";

export async function onRequestGet({ env }) {
  return json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
}
