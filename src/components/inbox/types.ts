import type { ConversationStatus } from "@/lib/db/schema";

export type Queue = "unassigned" | "mine" | "open" | "resolved";

export type ListItem = {
  id: string;
  channelId: string;
  status: ConversationStatus;
  subject: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  visitorName: string;
  visitorEmail: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageSender: "visitor" | "ai" | "agent" | "system" | null;
  handoffRequestedAt: string | null;
  firstHumanResponseAt: string | null;
  resolvedAt: string | null;
  csatRating: number | null;
  createdAt: string;
};

export type Counts = Record<Queue, number>;

export type Attachment = { url: string; name: string; size?: number; mime?: string };
export type Source = { articleId: string; title: string; isPublic: boolean };

export type TranscriptRow = {
  id: string;
  nexconnMessageId: string | null;
  senderType: "visitor" | "ai" | "agent" | "system";
  senderUserId: string | null;
  senderName: string | null;
  kind: "text" | "image" | "file" | "event" | "csat";
  body: string;
  attachment: Attachment | null;
  sources: Source[] | null;
  createdAt: string;
};

export type NoteRow = { id: string; body: string; createdAt: string; authorId: string | null; authorName: string | null };

export type Teammate = { userId: string; name: string; nexconnUserId: string; role: "admin" | "agent"; availability: "available" | "away" };

export type Detail = {
  conversation: {
    id: string;
    channelId: string;
    status: ConversationStatus;
    assigneeId: string | null;
    subject: string | null;
    pageUrl: string | null;
    pageTitle: string | null;
    source: "widget" | "page";
    handoffRequestedAt: string | null;
    handoffReason: string | null;
    firstHumanResponseAt: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
    csatRating: number | null;
    csatComment: string | null;
    csatMessageId: string | null;
    aiReplyCount: number;
    createdAt: string;
  };
  visitor: { id: string; name: string; email: string | null; nexconnUserId: string; createdAt: string; lastSeenAt: string };
  transcript: TranscriptRow[];
  notes: NoteRow[];
  past: { id: string; status: ConversationStatus; subject: string | null; createdAt: string; csatRating: number | null }[];
  team: Teammate[];
};

/** One rendered line in the agent transcript (from Postgres mirror or live Nexconn). */
export type TItem = {
  key: string;
  nexconnId: string | null;
  sender: "visitor" | "ai" | "agent" | "system";
  senderUserId?: string | null;
  senderName?: string | null;
  kind: "text" | "image" | "file" | "event" | "csat" | "note";
  body: string;
  attachment?: Attachment | null;
  sources?: Source[] | null;
  at: number;
  status?: "sending" | "sent" | "failed";
  streaming?: boolean;
  progress?: number;
  localFile?: File;
};
