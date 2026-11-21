import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { HttpError, requireStaff } from "@/lib/auth/guards";
import { emitConversation, getConversation, mirrorMessage, preview } from "@/lib/conversations/service";
import { json, parseJson, route } from "@/lib/http";
import { recordMessageSchema } from "@/lib/widget/public";

/** Records an agent reply that was sent through the Chat SDK (mirror + first-response SLA). */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  if (conversation.assigneeId !== user.id) throw new HttpError(403, "Claim this conversation before replying", "not_assignee");
  const input = await parseJson(req, recordMessageSchema);
  const row = await mirrorMessage({
    conversationId: conversation.id,
    workspaceId: workspace.id,
    nexconnMessageId: input.nexconnMessageId,
    senderType: "agent",
    senderUserId: user.id,
    kind: input.kind,
    body: input.text,
    attachment: input.attachment ?? null,
  });
  if (row) {
    await db()
      .update(conversations)
      .set({ firstHumanResponseAt: row.createdAt, humanInvolved: true })
      .where(and(eq(conversations.id, conversation.id), isNull(conversations.firstHumanResponseAt)));
    await emitConversation(workspace, conversation.id, "message", {
      assigneeId: user.id,
      preview: preview(input.kind === "text" ? input.text : input.attachment?.name ?? "Attachment", 120),
    });
  }
  return json({ ok: true });
});
