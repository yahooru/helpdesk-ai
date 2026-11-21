import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, visitors, type Conversation, type MessageAttachment, type Visitor, type Workspace } from "@/lib/db/schema";
import { randomSecret, sha256 } from "@/lib/auth/tokens";
import { visitorCredential } from "@/lib/auth/visitor";
import { createGroup, issueToken, newNexconnId } from "@/lib/nexconn/server";
import { emitConversation, mirrorMessage, preview, reopenConversation } from "@/lib/conversations/service";

export async function createVisitor(workspace: Workspace, input: { name: string; email?: string | null }) {
  const secret = randomSecret(24);
  const [visitor] = await db()
    .insert(visitors)
    .values({
      workspaceId: workspace.id,
      nexconnUserId: newNexconnId(),
      name: input.name,
      email: input.email || null,
      secretHash: sha256(secret),
    })
    .returning();
  return { visitor, credential: visitorCredential(visitor.id, secret) };
}

export async function visitorNexconnToken(visitor: Visitor) {
  return issueToken(visitor.nexconnUserId, visitor.name);
}

export async function visitorConversations(visitorId: string) {
  return db()
    .select({
      id: conversations.id,
      channelId: conversations.channelId,
      status: conversations.status,
      subject: conversations.subject,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageAt: conversations.lastMessageAt,
      csatRating: conversations.csatRating,
      csatMessageId: conversations.csatMessageId,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(eq(conversations.visitorId, visitorId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(20);
}

/** Creates the Nexconn group (owner: workspace bot, member: customer) and the conversation row. */
export async function startConversation(
  workspace: Workspace,
  visitor: Visitor,
  input: { pageUrl?: string | null; pageTitle?: string | null; source: "widget" | "page" },
): Promise<Conversation> {
  const channelId = newNexconnId();
  await createGroup({
    channelId,
    name: `${visitor.name} at ${workspace.name}`,
    owner: workspace.botUserId,
    userIds: [visitor.nexconnUserId],
  });
  const [conversation] = await db()
    .insert(conversations)
    .values({
      workspaceId: workspace.id,
      visitorId: visitor.id,
      channelId,
      status: workspace.aiEnabled ? "ai" : "queued",
      pageUrl: input.pageUrl?.slice(0, 1000) || null,
      pageTitle: input.pageTitle?.slice(0, 200) || null,
      source: input.source,
      ...(workspace.aiEnabled ? {} : { handoffRequestedAt: new Date(), handoffReason: "ai_disabled" as const }),
    })
    .returning();
  await emitConversation(workspace, conversation.id, "created");
  return conversation;
}

export async function getVisitorConversation(visitor: Visitor, conversationId: string): Promise<Conversation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return null;
  const [row] = await db()
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.visitorId, visitor.id)))
    .limit(1);
  return row ?? null;
}

/**
 * Records a message the customer already sent through the Chat SDK. Reopens resolved
 * conversations, sets the subject, and tells the inbox. Returns the mirrored row (null if dup).
 */
export async function recordVisitorMessage(
  workspace: Workspace,
  conversation: Conversation,
  input: { nexconnMessageId: string; kind: "text" | "image" | "file"; text: string; attachment?: MessageAttachment | null },
) {
  let current = conversation;
  if (current.status === "resolved") current = await reopenConversation(workspace, current, { type: "visitor" });
  const row = await mirrorMessage({
    conversationId: current.id,
    workspaceId: workspace.id,
    nexconnMessageId: input.nexconnMessageId,
    senderType: "visitor",
    kind: input.kind,
    body: input.text,
    attachment: input.attachment ?? null,
  });
  if (!row) return { row: null, conversation: current };
  if (!current.subject && input.kind === "text" && input.text.trim()) {
    await db().update(conversations).set({ subject: preview(input.text, 120) }).where(eq(conversations.id, current.id));
  }
  await db().update(visitors).set({ lastSeenAt: new Date() }).where(eq(visitors.id, current.visitorId));
  await emitConversation(workspace, current.id, "message", {
    assigneeId: current.assigneeId,
    preview: preview(input.kind === "text" ? input.text : input.kind === "image" ? "Image" : `File: ${input.attachment?.name ?? ""}`, 120),
  });
  return { row, conversation: current };
}
