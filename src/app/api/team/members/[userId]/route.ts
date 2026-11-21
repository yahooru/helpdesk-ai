import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, memberships } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { removeMember } from "@/lib/workspaces/service";

type Ctx = { params: Promise<{ userId: string }> };

async function otherAdmins(workspaceId: string, userId: string) {
  const [row] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.role, "admin"), ne(memberships.userId, userId)));
  return Number(row?.n ?? 0);
}

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { workspace } = await requireAdmin();
  const { userId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new HttpError(404, "Teammate not found", "not_found");
  const { role } = await parseJson(req, z.object({ role: z.enum(["admin", "agent"]) }));
  if (role === "agent" && (await otherAdmins(workspace.id, userId)) === 0) {
    throw new HttpError(409, "A workspace needs at least one admin. Make someone else an admin first.", "last_admin");
  }
  const rows = await db()
    .update(memberships)
    .set({ role })
    .where(and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, userId)))
    .returning({ id: memberships.id });
  if (rows.length === 0) throw new HttpError(404, "Teammate not found", "not_found");
  return json({ ok: true });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const { workspace } = await requireAdmin();
  const { userId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new HttpError(404, "Teammate not found", "not_found");
  if ((await otherAdmins(workspace.id, userId)) === 0) {
    throw new HttpError(409, "You can't remove the last admin of a workspace.", "last_admin");
  }
  await removeMember(workspace, userId);
  // Their open conversations go back to the unassigned queue.
  await db()
    .update(conversations)
    .set({ assigneeId: null, status: "queued" })
    .where(and(eq(conversations.workspaceId, workspace.id), eq(conversations.assigneeId, userId), ne(conversations.status, "resolved")));
  return json({ ok: true });
});
