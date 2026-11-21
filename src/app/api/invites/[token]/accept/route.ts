import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { HttpError, requireUser } from "@/lib/auth/guards";
import { setWorkspaceCookie } from "@/lib/auth/session";
import { json, route } from "@/lib/http";
import { findInvite } from "@/lib/workspaces/invites";
import { addMember } from "@/lib/workspaces/service";

/** Accepts an invite for the signed-in user (joins the workspace and its staff channel). */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const user = await requireUser();
  const { token } = await ctx.params;
  const found = await findInvite(token);
  if (!found) throw new HttpError(404, "This invite link is invalid, expired or already used.", "invalid_invite");
  const claimed = await db()
    .update(invites)
    .set({ acceptedAt: new Date() })
    .where(and(eq(invites.id, found.invite.id), isNull(invites.acceptedAt)))
    .returning({ id: invites.id });
  if (claimed.length === 0) throw new HttpError(409, "This invite was just used.", "invite_used");
  try {
    await addMember(found.workspace, user, found.invite.role);
  } catch (err) {
    // Joining failed (for example Nexconn was unreachable): give the invite back so the link still works.
    await db().update(invites).set({ acceptedAt: null }).where(eq(invites.id, found.invite.id));
    throw err;
  }
  await setWorkspaceCookie(found.workspace.id);
  return json({ ok: true, workspace: { id: found.workspace.id, name: found.workspace.name } });
});
