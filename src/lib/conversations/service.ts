import "server-only";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  memberships,
  messages,
  users,
  type Conversation,
  type MessageAttachment,
  type MessageSender,
  type MessageSource,
  type Workspace,
} from "@/lib/db/schema";
import { HttpError } from "@/lib/auth/guards";
import {
  isUserOnline,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  sendStaffEvent,
  setGroupMessageMetadata,
} from "@/lib/nexconn/server";
import {
  HD_TYPES,
  type ConversationEventContent,
  type ConversationEventKind,
  type InboxEventContent,
} from "@/lib/nexconn/types";

export function preview(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Fire-and-forget live inbox event on the workspace staff channel. Never throws. */
export async function emitInbox(workspace: Workspace, event: InboxEventContent) {
  try {
    await sendStaffEvent({ botUserId: workspace.botUserId, staffChannelId: workspace.staffChannelId, event });
  } catch (err) {
    console.warn("[inbox] staff event failed", err instanceof Error ? err.message : err);
  }
}

export async function emitConversation(
  workspace: Workspace,
  conversationId: string,
  action: Extract<InboxEventContent, { kind: "conversation" }>["action"],
  extra: { assigneeId?: string | null; preview?: string } = {},
) {
  await emitInbox(workspace, { kind: "conversation", conversationId, action, at: Date.now(), ...extra });
}

type MirrorInput = {
  conversationId: string;
  workspaceId: string;
  nexconnMessageId?: string | null;
  senderType: MessageSender;
  senderUserId?: string | null;
  kind: "text" | "image" | "file" | "event" | "csat";
  body: string;
  attachment?: MessageAttachment | null;
  sources?: MessageSource[] | null;
};

/** Stores a copy of a Nexconn message (idempotent on the Nexconn message id). */
export async function mirrorMessage(input: MirrorInput) {
  const [row] = await db()
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      workspaceId: input.workspaceId,
      nexconnMessageId: input.nexconnMessageId ?? null,
      senderType: input.senderType,
      senderUserId: input.senderUserId ?? null,
      kind: input.kind,
      body: input.body,
      attachment: input.attachment ?? null,
      sources: input.sources ?? null,
    })
    .onConflictDoNothing({ target: messages.nexconnMessageId })
    .returning();
  if (row && input.kind !== "event") {
    const label =
      input.kind === "image" ? "Image" : input.kind === "file" ? `File: ${input.attachment?.name ?? ""}` : input.body;
    await db()
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: preview(label || "Message"),
        lastMessageSender: input.senderType,
      })
      .where(eq(conversations.id, input.conversationId));
  }
  return row ?? null;
}

/** Sends a persisted system line (HD:Event) into the customer channel and mirrors it. */
export async function sendConversationEvent(
  workspace: Workspace,
  conversation: Conversation,
  kind: ConversationEventKind,
  text: string,
  actorName?: string,
) {
  const content: ConversationEventContent = { kind, text, actorName, conversationId: conversation.id };
  let messageId: string | undefined;
  try {
    messageId = await sendGroupMessage({
      fromUserId: workspace.botUserId,
      channelId: conversation.channelId,
      messageType: HD_TYPES.event,
      content,
      pushContent: text,
    });
  } catch (err) {
    console.warn("[conversation] event send failed", err instanceof Error ? err.message : err);
  }
  await mirrorMessage({
    conversationId: conversation.id,
    workspaceId: workspace.id,
    nexconnMessageId: messageId,
    senderType: "system",
    kind: "event",
    body: text,
  });
}

export async function getConversation(workspaceId: string, conversationId: string): Promise<Conversation> {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) throw new HttpError(404, "Conversation not found", "not_found");
  const [row] = await db()
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new HttpError(404, "Conversation not found", "not_found");
  return row;
}

type AgentPick = { userId: string; nexconnUserId: string; name: string };

/**
 * Round-robin among teammates who marked themselves available AND are online in Nexconn
 * (server presence check). Least-recently-assigned first; optimistic update avoids double picks.
 */
export async function pickAgent(workspace: Workspace, excludeUserId?: string): Promise<AgentPick | null> {
  const rows = await db()
    .select({
      membershipId: memberships.id,
      lastAssignedAt: memberships.lastAssignedAt,
      userId: users.id,
      nexconnUserId: users.nexconnUserId,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.workspaceId, workspace.id),
        eq(memberships.availability, "available"),
        excludeUserId ? ne(memberships.userId, excludeUserId) : undefined,
      ),
    )
    .orderBy(sql`${memberships.lastAssignedAt} asc nulls first`, asc(memberships.createdAt))
    .limit(25);
  if (rows.length === 0) return null;
  const online = await Promise.all(rows.map((r) => isUserOnline(r.nexconnUserId).catch(() => false)));
  for (let i = 0; i < rows.length; i++) {
    if (!online[i]) continue;
    const r = rows[i];
    const updated = await db()
      .update(memberships)
      .set({ lastAssignedAt: new Date() })
      .where(
        and(
          eq(memberships.id, r.membershipId),
          r.lastAssignedAt ? eq(memberships.lastAssignedAt, r.lastAssignedAt) : isNull(memberships.lastAssignedAt),
        ),
      )
      .returning({ id: memberships.id });
    if (updated.length > 0) return { userId: r.userId, nexconnUserId: r.nexconnUserId, name: r.name };
  }
  return null;
}

export async function anyTeammateOnline(workspace: Workspace): Promise<boolean> {
  const rows = await db()
    .select({ nexconnUserId: users.nexconnUserId })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspace.id))
    .limit(25);
  const online = await Promise.all(rows.map((r) => isUserOnline(r.nexconnUserId).catch(() => false)));
  return online.some(Boolean);
}

async function assignTo(workspace: Workspace, conversation: Conversation, agent: AgentPick, how: "claimed" | "auto") {
  await joinGroup(conversation.channelId, [agent.nexconnUserId]);
  const [updated] = await db()
    .update(conversations)
    .set({ assigneeId: agent.userId, status: "assigned", humanInvolved: true })
    .where(eq(conversations.id, conversation.id))
    .returning();
  await sendConversationEvent(workspace, updated, "agent_joined", `${agent.name} joined the conversation`, agent.name);
  await emitConversation(workspace, conversation.id, "assigned", { assigneeId: agent.userId });
  void how;
  return updated;
}

export type HandoffReason = NonNullable<Conversation["handoffReason"]>;

/** Moves a conversation from the AI to the human queue and tries round-robin assignment. */
export async function requestHandoff(workspace: Workspace, conversation: Conversation, reason: HandoffReason) {
  if (conversation.status === "queued" || conversation.status === "assigned") return conversation;
  const [queued] = await db()
    .update(conversations)
    .set({
      status: "queued",
      handoffRequestedAt: conversation.handoffRequestedAt ?? new Date(),
      handoffReason: conversation.handoffReason ?? reason,
      resolvedAt: null,
      resolvedBy: null,
    })
    .where(and(eq(conversations.id, conversation.id), ne(conversations.status, "queued"), ne(conversations.status, "assigned")))
    .returning();
  if (!queued) return conversation;

  await sendConversationEvent(
    workspace,
    queued,
    "handoff_requested",
    "Connecting you with a person from the team. You can keep writing here.",
  );
  await emitConversation(workspace, queued.id, "handoff", { preview: queued.lastMessagePreview ?? undefined });

  if (workspace.autoAssign) {
    const agent = await pickAgent(workspace);
    if (agent) return assignTo(workspace, queued, agent, "auto");
  }
  if (!(await anyTeammateOnline(workspace))) {
    await sendConversationEvent(
      workspace,
      queued,
      "no_agents",
      "No one from the team is online right now. Your message is in the queue and they will reply here.",
    );
  }
  return queued;
}

export async function claimConversation(
  workspace: Workspace,
  conversation: Conversation,
  agent: { id: string; name: string; nexconnUserId: string },
) {
  if (conversation.status === "resolved") throw new HttpError(409, "Reopen the conversation before claiming it", "resolved");
  if (conversation.assigneeId === agent.id) return conversation;
  if (conversation.assigneeId) throw new HttpError(409, "A teammate already took this conversation", "already_assigned");
  const [locked] = await db()
    .update(conversations)
    .set({ assigneeId: agent.id })
    .where(and(eq(conversations.id, conversation.id), isNull(conversations.assigneeId)))
    .returning();
  if (!locked) throw new HttpError(409, "A teammate already took this conversation", "already_assigned");
  return assignTo(workspace, locked, { userId: agent.id, name: agent.name, nexconnUserId: agent.nexconnUserId }, "claimed");
}

export async function transferConversation(
  workspace: Workspace,
  conversation: Conversation,
  actor: { id: string; name: string },
  targetUserId: string,
) {
  if (conversation.status === "resolved") throw new HttpError(409, "Reopen the conversation before transferring it", "resolved");
  const [target] = await db()
    .select({ id: users.id, name: users.name, nexconnUserId: users.nexconnUserId })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, targetUserId)))
    .limit(1);
  if (!target) throw new HttpError(404, "That teammate is not in this workspace", "not_found");
  if (conversation.assigneeId === target.id) return conversation;

  let previousNexconnId: string | null = null;
  if (conversation.assigneeId) {
    const [prev] = await db()
      .select({ nexconnUserId: users.nexconnUserId })
      .from(users)
      .where(eq(users.id, conversation.assigneeId))
      .limit(1);
    previousNexconnId = prev?.nexconnUserId ?? null;
  }
  await joinGroup(conversation.channelId, [target.nexconnUserId]);
  if (previousNexconnId) await leaveGroup(conversation.channelId, [previousNexconnId]);
  const [updated] = await db()
    .update(conversations)
    .set({
      assigneeId: target.id,
      status: "assigned",
      humanInvolved: true,
      handoffRequestedAt: conversation.handoffRequestedAt ?? new Date(),
      handoffReason: conversation.handoffReason ?? "customer_button",
    })
    .where(eq(conversations.id, conversation.id))
    .returning();
  const text =
    actor.id === target.id ? `${target.name} joined the conversation` : `${actor.name} transferred the conversation to ${target.name}`;
  await sendConversationEvent(workspace, updated, actor.id === target.id ? "agent_joined" : "transferred", text, target.name);
  await emitConversation(workspace, updated.id, "transferred", { assigneeId: target.id });
  return updated;
}

const CSAT_PROMPT = "How did we do? Rate this conversation.";

export async function resolveConversation(
  workspace: Workspace,
  conversation: Conversation,
  by: { type: "agent"; name: string } | { type: "visitor" },
) {
  if (conversation.status === "resolved") return conversation;
  const [updated] = await db()
    .update(conversations)
    .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: by.type === "agent" ? "agent" : conversation.handoffRequestedAt ? "visitor" : "ai" })
    .where(eq(conversations.id, conversation.id))
    .returning();
  await sendConversationEvent(
    workspace,
    updated,
    "resolved",
    by.type === "agent" ? `${by.name} marked this conversation as resolved` : "Glad that helped. This conversation is resolved.",
    by.type === "agent" ? by.name : undefined,
  );
  let csatMessageId: string | undefined;
  try {
    csatMessageId = await sendGroupMessage({
      fromUserId: workspace.botUserId,
      channelId: updated.channelId,
      messageType: HD_TYPES.csat,
      content: { conversationId: updated.id, prompt: CSAT_PROMPT },
      pushContent: CSAT_PROMPT,
      metadata: { state: "pending" },
    });
  } catch (err) {
    console.warn("[csat] card send failed", err instanceof Error ? err.message : err);
  }
  if (csatMessageId) {
    await db()
      .update(conversations)
      .set({ csatMessageId, csatRating: null, csatComment: null })
      .where(eq(conversations.id, updated.id));
    await mirrorMessage({
      conversationId: updated.id,
      workspaceId: workspace.id,
      nexconnMessageId: csatMessageId,
      senderType: "system",
      kind: "csat",
      body: CSAT_PROMPT,
    });
  }
  await emitConversation(workspace, updated.id, "resolved", { assigneeId: updated.assigneeId });
  return { ...updated, csatMessageId: csatMessageId ?? null };
}

export async function reopenConversation(
  workspace: Workspace,
  conversation: Conversation,
  by: { type: "agent"; name: string } | { type: "visitor" },
) {
  if (conversation.status !== "resolved") return conversation;
  const status = conversation.assigneeId ? "assigned" : conversation.handoffRequestedAt ? "queued" : workspace.aiEnabled ? "ai" : "queued";
  const [updated] = await db()
    .update(conversations)
    .set({ status, resolvedAt: null, resolvedBy: null })
    .where(eq(conversations.id, conversation.id))
    .returning();
  await sendConversationEvent(
    workspace,
    updated,
    "reopened",
    by.type === "agent" ? `${by.name} reopened the conversation` : "The conversation was reopened",
    by.type === "agent" ? by.name : undefined,
  );
  await emitConversation(workspace, updated.id, "reopened", { assigneeId: updated.assigneeId });
  return updated;
}

export async function submitCsat(workspace: Workspace, conversation: Conversation, rating: number, comment: string | null) {
  if (!conversation.csatMessageId) throw new HttpError(409, "This conversation has no rating request", "no_csat");
  await db()
    .update(conversations)
    .set({ csatRating: rating, csatComment: comment })
    .where(eq(conversations.id, conversation.id));
  try {
    await setGroupMessageMetadata({
      messageId: conversation.csatMessageId,
      operatorUserId: workspace.botUserId,
      channelId: conversation.channelId,
      metadata: { state: "done", rating: String(rating), comment: (comment ?? "").slice(0, 1000) },
    });
  } catch (err) {
    console.warn("[csat] metadata update failed", err instanceof Error ? err.message : err);
  }
  await emitConversation(workspace, conversation.id, "csat");
}
