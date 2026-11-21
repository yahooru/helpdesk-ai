import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { HttpError } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { emailSchema } from "@/lib/validation";

const body = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) });

export const POST = route(async (req: Request) => {
  const input = await parseJson(req, body);
  const allowed =
    (await rateLimit(`login:ip:${clientIp(req)}`, 30, 900)) && (await rateLimit(`login:email:${input.email}`, 10, 900));
  if (!allowed) throw new HttpError(429, "Too many sign-in attempts. Wait 15 minutes and try again.", "rate_limited");
  const [user] = await db().select().from(users).where(eq(users.email, input.email)).limit(1);
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "That email and password don't match an account.", "bad_credentials");
  await setSessionCookie(user.id);
  return json({ ok: true });
});
