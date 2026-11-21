import { z } from "zod";
import { HttpError } from "@/lib/auth/guards";
import { requireVisitor } from "@/lib/auth/visitor";
import { markAnswerHelpful } from "@/lib/ai/reply";
import { json, parseJson, route } from "@/lib/http";
import { getVisitorConversation } from "@/lib/widget/service";

/** Customer confirmed an AI answer solved the question: marks it and resolves (AI-resolved). */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { visitor, workspace } = await requireVisitor(req);
  const conversation = await getVisitorConversation(visitor, id);
  if (!conversation) throw new HttpError(404, "Conversation not found", "not_found");
  const { messageId } = await parseJson(req, z.object({ messageId: z.string().regex(/^[A-Za-z0-9-]{6,64}$/) }));
  await markAnswerHelpful(workspace, conversation, messageId);
  return json({ ok: true });
});
