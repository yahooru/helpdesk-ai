import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeGaps } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireAdmin();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Question not found", "not_found");
  await db()
    .update(knowledgeGaps)
    .set({ status: "dismissed" })
    .where(and(eq(knowledgeGaps.id, id), eq(knowledgeGaps.workspaceId, workspace.id)));
  return json({ ok: true });
});
