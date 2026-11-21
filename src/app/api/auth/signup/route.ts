import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { HttpError } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { newNexconnId } from "@/lib/nexconn/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { emailSchema, passwordSchema, personNameSchema } from "@/lib/validation";

const body = z.object({ name: personNameSchema, email: emailSchema, password: passwordSchema });

export const POST = route(async (req: Request) => {
  if (!(await rateLimit(`signup:${clientIp(req)}`, 30, 3600))) {
    throw new HttpError(429, "Too many sign-up attempts. Try again in an hour.", "rate_limited");
  }
  const input = await parseJson(req, body);
  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw new HttpError(409, "An account with this email already exists. Sign in instead.", "email_taken");
  const [user] = await db()
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      nexconnUserId: newNexconnId(),
    })
    .returning({ id: users.id });
  await setSessionCookie(user.id);
  return json({ ok: true }, 201);
});
