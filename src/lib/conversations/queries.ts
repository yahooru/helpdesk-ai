import "server-only";
import { and, asc, desc, eq, isNull, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, memberships, messages, notes, users, visitors } from "@/lib/db/schema";

export const QUEUES = ["unassigned", "mine", "open", "resolved"] as const;
export type Queue = (typeof QUEUES)[number];

function queueFilter(queue: Queue, workspaceId: string, userId: string): SQL {
  const ws = eq(conversations.workspaceId, workspaceId);
  switch (queue) {
    case "unassigned":
      return and(ws, eq(conversations.status, "queued"), isNull(conversations.assigneeId))!;
    case "mine":
      return and(ws, eq(conversations.assigneeId, userId), ne(conversations.status, "resolved"))!;
    case "open":
      return and(ws, ne(conversations.status, "resolved"))!;
    case "resolved":
      return and(ws, eq(conversations.status, "resolved"))!;
  }
}

export async function listConversations(workspaceId: string, userId: string, queue: Queue, search?: string) {
  const assignee = sql<string | null>`(select name from users where users.id = ${conversations.assigneeId})`;
  const filters = [queueFilter(queue, workspaceId, userId)];
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    filters.push(sql`(${visitors.name} ilike ${like} or ${visitors.email} ilike ${like} or ${conversations.subject} ilike ${like})`);
  }
  const rows = await db()
    .select({
      id: conversations.id,
      channelId: conversations.channelId,
      status: conversations.status,
      subject: conversations.subject,
      assigneeId: conversations.assigneeId,
      assigneeName: assignee,
      visitorName: visitors.name,
      visitorEmail: visitors.email,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageSender: conversations.lastMessageSender,
      handoffRequestedAt: conversations.handoffRequestedAt,
      firstHumanResponseAt: conversations.firstHumanResponseAt,
      resolvedAt: conversations.resolvedAt,
      csatRating: conversations.csatRating,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(visitors, eq(visitors.id, conversations.visitorId))
    .where(and(...filters))
    .orderBy(queue === "unassigned" ? asc(conversations.handoffRequestedAt) : desc(conversations.lastMessageAt))
    .limit(150);
  return rows;
}

export async function queueCounts(workspaceId: string, userId: string) {
  const [row] = await db()
    .select({
      unassigned: sql<number>`count(*) filter (where ${conversations.status} = 'queued' and ${conversations.assigneeId} is null)`,
      mine: sql<number>`count(*) filter (where ${conversations.assigneeId} = ${userId} and ${conversations.status} <> 'resolved')`,
      open: sql<number>`count(*) filter (where ${conversations.status} <> 'resolved')`,
      resolved: sql<number>`count(*) filter (where ${conversations.status} = 'resolved')`,
    })
    .from(conversations)
    .where(eq(conversations.workspaceId, workspaceId));
  return {
    unassigned: Number(row?.unassigned ?? 0),
    mine: Number(row?.mine ?? 0),
    open: Number(row?.open ?? 0),
    resolved: Number(row?.resolved ?? 0),
  };
}

export async function conversationDetail(workspaceId: string, conversationId: string) {
  const [row] = await db()
    .select({ conversation: conversations, visitor: visitors })
    .from(conversations)
    .innerJoin(visitors, eq(visitors.id, conversations.visitorId))
    .where(and(eq(conversations.id, conversationId), eq(conversations.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return null;
  const [transcript, noteRows, past, team] = await Promise.all([
    db()
      .select({
        id: messages.id,
        nexconnMessageId: messages.nexconnMessageId,
        senderType: messages.senderType,
        senderUserId: messages.senderUserId,
        senderName: sql<string | null>`(select name from users where users.id = ${messages.senderUserId})`,
        kind: messages.kind,
        body: messages.body,
        attachment: messages.attachment,
        sources: messages.sources,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(500),
    db()
      .select({
        id: notes.id,
        body: notes.body,
        createdAt: notes.createdAt,
        authorId: notes.authorId,
        authorName: sql<string | null>`(select name from users where users.id = ${notes.authorId})`,
      })
      .from(notes)
      .where(eq(notes.conversationId, conversationId))
      .orderBy(asc(notes.createdAt)),
    db()
      .select({
        id: conversations.id,
        status: conversations.status,
        subject: conversations.subject,
        createdAt: conversations.createdAt,
        csatRating: conversations.csatRating,
      })
      .from(conversations)
      .where(and(eq(conversations.visitorId, row.visitor.id), ne(conversations.id, conversationId)))
      .orderBy(desc(conversations.createdAt))
      .limit(10),
    db()
      .select({
        userId: users.id,
        name: users.name,
        nexconnUserId: users.nexconnUserId,
        role: memberships.role,
        availability: memberships.availability,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.workspaceId, workspaceId))
      .orderBy(asc(users.name)),
  ]);
  const { secretHash: _secret, ...visitor } = row.visitor;
  void _secret;
  return { conversation: row.conversation, visitor, transcript, notes: noteRows, past, team };
}

export type ConversationDetail = NonNullable<Awaited<ReturnType<typeof conversationDetail>>>;
export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];
