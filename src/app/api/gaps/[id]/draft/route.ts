import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeGaps } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { draftArticleFromGap } from "@/lib/ai/assist";
import { json, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 45;

/** Draft an article for an unanswered question, using the human agent's reply when there is one. */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireAdmin();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Question not found", "not_found");
  const [gap] = await db()
    .select()
    .from(knowledgeGaps)
    .where(and(eq(knowledgeGaps.id, id), eq(knowledgeGaps.workspaceId, workspace.id)))
    .limit(1);
  if (!gap) throw new HttpError(404, "Question not found", "not_found");
  if (!(await rateLimit(`draft:${workspace.id}`, 30, 3600))) return json({ title: gap.question, body: "", gapId: gap.id });
  const draft = await draftArticleFromGap(workspace, gap).catch(() => ({ title: gap.question, body: "" }));
  return json({ ...draft, gapId: gap.id });
});
