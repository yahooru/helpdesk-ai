import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 768;

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  nexconnUserId: text("nexconn_user_id").notNull().unique(),
  nexconnToken: text("nexconn_token"),
  createdAt: createdAt(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brandColor: text("brand_color").notNull(),
  logoUrl: text("logo_url"),
  greeting: text("greeting").notNull(),
  botUserId: text("bot_user_id").notNull().unique(),
  botName: text("bot_name").notNull(),
  staffChannelId: text("staff_channel_id").notNull().unique(),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  aiTone: text("ai_tone", { enum: ["friendly", "professional", "concise"] }).notNull().default("friendly"),
  handoffOnNoAnswer: text("handoff_on_no_answer", { enum: ["offer", "auto"] }).notNull().default("offer"),
  aiInstructions: text("ai_instructions").notNull().default(""),
  autoAssign: boolean("auto_assign").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "agent"] }).notNull(),
    availability: text("availability", { enum: ["available", "away"] }).notNull().default("available"),
    lastAssignedAt: timestamp("last_assigned_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_ws_user").on(t.workspaceId, t.userId)],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "agent"] }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("invites_ws").on(t.workspaceId)],
);

export const visitors = pgTable(
  "visitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    nexconnUserId: text("nexconn_user_id").notNull().unique(),
    name: text("name").notNull(),
    email: text("email"),
    secretHash: text("secret_hash").notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visitors_ws").on(t.workspaceId), index("visitors_ws_email").on(t.workspaceId, t.email)],
);

export const CONVERSATION_STATUSES = ["ai", "queued", "assigned", "resolved"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull().unique(),
    status: text("status", { enum: CONVERSATION_STATUSES }).notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    subject: text("subject"),
    pageUrl: text("page_url"),
    pageTitle: text("page_title"),
    source: text("source", { enum: ["widget", "page"] }).notNull().default("widget"),
    handoffRequestedAt: timestamp("handoff_requested_at", { withTimezone: true }),
    handoffReason: text("handoff_reason", {
      enum: ["customer_button", "customer_intent", "no_answer", "ai_disabled", "ai_error"],
    }),
    firstHumanResponseAt: timestamp("first_human_response_at", { withTimezone: true }),
    humanInvolved: boolean("human_involved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by", { enum: ["ai", "agent", "visitor"] }),
    csatRating: integer("csat_rating"),
    csatComment: text("csat_comment"),
    csatMessageId: text("csat_message_id"),
    aiReplyCount: integer("ai_reply_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessagePreview: text("last_message_preview"),
    lastMessageSender: text("last_message_sender", { enum: ["visitor", "ai", "agent", "system"] }),
    createdAt: createdAt(),
  },
  (t) => [
    index("conversations_ws_status").on(t.workspaceId, t.status, t.lastMessageAt),
    index("conversations_ws_assignee").on(t.workspaceId, t.assigneeId),
    index("conversations_visitor").on(t.visitorId),
    index("conversations_ws_created").on(t.workspaceId, t.createdAt),
  ],
);

export const MESSAGE_SENDERS = ["visitor", "ai", "agent", "system"] as const;
export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export type MessageAttachment = { url: string; name: string; size?: number; mime?: string };
export type MessageSource = { articleId: string; title: string; isPublic: boolean };

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    nexconnMessageId: text("nexconn_message_id").unique(),
    senderType: text("sender_type", { enum: MESSAGE_SENDERS }).notNull(),
    senderUserId: uuid("sender_user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["text", "image", "file", "event", "csat"] }).notNull(),
    body: text("body").notNull().default(""),
    attachment: jsonb("attachment").$type<MessageAttachment>(),
    sources: jsonb("sources").$type<MessageSource[]>(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation").on(t.conversationId, t.createdAt)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("notes_conversation").on(t.conversationId, t.createdAt)],
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sourceType: text("source_type", { enum: ["article", "text", "file"] }).notNull(),
    fileName: text("file_name"),
    fileUrl: text("file_url"),
    isPublic: boolean("is_public").notNull().default(true),
    indexStatus: text("index_status", { enum: ["pending", "ready", "failed"] }).notNull().default("pending"),
    indexError: text("index_error"),
    chunkCount: integer("chunk_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("articles_ws").on(t.workspaceId, t.updatedAt)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (t) => [
    index("chunks_ws").on(t.workspaceId),
    index("chunks_article").on(t.articleId),
    index("chunks_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const knowledgeGaps = pgTable(
  "knowledge_gaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    occurrences: integer("occurrences").notNull().default(1),
    lastConversationId: uuid("last_conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    articleId: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gaps_ws_status").on(t.workspaceId, t.status, t.occurrences)],
);

export const savedReplies = pgTable(
  "saved_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("saved_replies_ws").on(t.workspaceId)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().default(sql`now()`),
  count: integer("count").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Visitor = typeof visitors.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type SavedReply = typeof savedReplies.$inferSelect;
