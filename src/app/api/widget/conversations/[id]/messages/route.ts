import { asc, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { messages, users } from "@/lib/db/schema";
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

/**
 * The customer's own transcript from the Postgres mirror. The chat only asks for it when Nexconn
 * has no history for the conversation (for example after the help desk moved to a new Nexconn app).
 * Internal notes live in another table and are never included.
 */
export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { visitor, workspace } = await requireVisitor(req);
  const conversation = await getVisitorConversation(visitor, id);
  if (!conversation) throw new HttpError(404, "Conversation not found", "not_found");
  const rows = await db()
    .select({
      id: messages.id,
      nexconnMessageId: messages.nexconnMessageId,
      senderType: messages.senderType,
      kind: messages.kind,
      body: messages.body,
      attachment: messages.attachment,
      sources: messages.sources,
      createdAt: messages.createdAt,
      agentNexconnId: users.nexconnUserId,
      agentName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderUserId))
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt))
    .limit(200);
  return json({
    messages: rows.map((r) => ({
      id: r.nexconnMessageId ?? r.id,
      senderId:
        r.senderType === "visitor" ? visitor.nexconnUserId : r.senderType === "agent" ? (r.agentNexconnId ?? "agent") : workspace.botUserId,
      senderName: r.senderType === "agent" ? (r.agentName ?? undefined) : undefined,
      kind: r.kind,
      text: r.body,
      attachment: r.attachment,
      sources: r.sources ?? [],
      sentTime: r.createdAt.getTime(),
    })),
    csat: { rating: conversation.csatRating, messageId: conversation.csatMessageId },
  });
});
