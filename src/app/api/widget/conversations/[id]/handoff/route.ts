import { HttpError } from "@/lib/auth/guards";
import { requireVisitor } from "@/lib/auth/visitor";
import { requestHandoff, reopenConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";
import { getVisitorConversation } from "@/lib/widget/service";

export const maxDuration = 30;

/** "Talk to a person": moves the conversation to the human queue (and auto-assigns if enabled). */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { visitor, workspace } = await requireVisitor(req);
  let conversation = await getVisitorConversation(visitor, id);
  if (!conversation) throw new HttpError(404, "Conversation not found", "not_found");
  if (conversation.status === "resolved") conversation = await reopenConversation(workspace, conversation, { type: "visitor" });
  const updated = await requestHandoff(workspace, conversation, "customer_button");
  return json({ status: updated.status });
});
