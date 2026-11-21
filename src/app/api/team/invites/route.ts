import { z } from "zod";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { randomSecret, sha256 } from "@/lib/auth/tokens";
import { json, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

const INVITE_DAYS = 7;

/** Creates a single-use invite link (only the SHA-256 of the token is stored). */
export const POST = route(async (req: Request) => {
  const { workspace, user } = await requireAdmin();
  if (!(await rateLimit(`invite:${workspace.id}`, 30, 3600))) throw new HttpError(429, "Too many invites. Try again later.", "rate_limited");
  const input = await parseJson(req, z.object({ email: emailSchema, role: z.enum(["admin", "agent"]) }));
  const token = randomSecret(24);
  const [invite] = await db()
    .insert(invites)
    .values({
      workspaceId: workspace.id,
      email: input.email,
      role: input.role,
      tokenHash: sha256(token),
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000),
    })
    .returning({ id: invites.id, email: invites.email, role: invites.role, expiresAt: invites.expiresAt });
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  return json({ invite, inviteUrl: `${origin}/invite/${token}` }, 201);
});
