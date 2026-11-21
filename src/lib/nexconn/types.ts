/**
 * Custom Nexconn message types shared by server (Platform Chat API) and browser (Chat SDK).
 * Custom types must not start with RC:/NC: and must be <= 32 chars. They are registered in the
 * browser with NCEngine.registerCustomMessages before connect (see lib/nexconn/client.ts).
 */
export const HD_TYPES = {
  /** System line in a conversation: handoff, agent joined/left, transfer, resolved, reopened. */
  event: "HD:Event",
  /** CSAT rating card; the rating is written back as message metadata. */
  csat: "HD:Csat",
  /** Typing indicator for group channels (status message: not stored, not counted). */
  typing: "HD:Typing",
  /** Live inbox event on the staff channel (status message). */
  inbox: "HD:Inbox",
  /** Internal note broadcast on the staff channel (stored, never sent to customer channels). */
  note: "HD:Note",
  /**
   * Announces a new RC:StreamMsg (status message). The Web SDK does not deliver stream messages
   * through onMessageReceived, so clients fetch it by id and call requestStreamMessage().
   */
  stream: "HD:Stream",
} as const;

export const NC_TYPES = {
  text: "RC:TxtMsg",
  image: "RC:ImgMsg",
  file: "RC:FileMsg",
  stream: "RC:StreamMsg",
} as const;

export type ConversationEventKind =
  | "started"
  | "handoff_requested"
  | "no_agents"
  | "agent_joined"
  | "agent_left"
  | "transferred"
  | "resolved"
  | "reopened";

export type ConversationEventContent = {
  kind: ConversationEventKind;
  text: string;
  actorName?: string;
  conversationId: string;
};

export type CsatContent = {
  conversationId: string;
  prompt: string;
};

export type StreamAnnounceContent = { messageId: string; conversationId: string };

export type TypingContent = {
  name: string;
  role: "visitor" | "agent" | "ai";
};

export type InboxEventContent =
  | {
      kind: "conversation";
      conversationId: string;
      action:
        | "created"
        | "message"
        | "handoff"
        | "assigned"
        | "transferred"
        | "resolved"
        | "reopened"
        | "csat"
        | "updated";
      assigneeId?: string | null;
      preview?: string;
      at: number;
    }
  | { kind: "note"; conversationId: string; noteId: string; at: number }
  | { kind: "presence"; userId: string; availability: "available" | "away"; at: number };

export type NoteContent = {
  conversationId: string;
  noteId: string;
  text: string;
  authorName: string;
};

/** Message metadata keys (Nexconn message expansion). */
export const META = {
  sources: "sources",
  answer: "answer",
  feedback: "feedback",
  rating: "rating",
  comment: "comment",
} as const;
