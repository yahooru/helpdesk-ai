import { clearSessionCookie } from "@/lib/auth/session";
import { json, route } from "@/lib/http";

export const POST = route(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
