import { after } from "next/server";
import { HttpError } from "@/lib/auth/guards";
import { requireVisitor } from "@/lib/auth/visitor";
import { json, parseJson, route } from "@/lib/http";
import { runAiReply } from "@/lib/ai/reply";
import { recordMessageSchema } from "@/lib/widget/public";
import { getVisitorConversation, recordVisitorMessage } from "@/lib/widget/service";

export const maxDuration = 60;

/**
 * Called by the customer's browser right after a successful Chat SDK send. The server verifies the
 * customer owns the conversation, mirrors the message, and (in AI mode) answers via the bot user.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { visitor, workspace } = await requireVisitor(req);
  const conversation = await getVisitorConversation(visitor, id);
  if (!conversation) throw new HttpError(404, "Conversation not found", "not_found");
  const input = await parseJson(req, recordMessageSchema);
  if (input.kind === "text" && !input.text.trim()) throw new HttpError(400, "Message is empty", "empty");

  const { row, conversation: current } = await recordVisitorMessage(workspace, conversation, {
    nexconnMessageId: input.nexconnMessageId,
    kind: input.kind,
    text: input.text,
    attachment: input.attachment ?? null,
  });
  const aiWillReply = Boolean(row) && current.status === "ai";
  if (row && aiWillReply) {
    after(() => runAiReply(current.id, row.id));
  }
  return json({ ok: true, status: current.status, aiWillReply });
});
