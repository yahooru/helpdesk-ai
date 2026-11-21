import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";

/** Revokes a pending invite. */
export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireAdmin();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Invite not found", "not_found");
  const rows = await db()
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, id), eq(invites.workspaceId, workspace.id)))
    .returning({ id: invites.id });
  if (rows.length === 0) throw new HttpError(404, "Invite not found", "not_found");
  return json({ ok: true });
});
