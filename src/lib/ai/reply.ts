import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, workspaces, type Conversation, type MessageSource, type Workspace } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { ensureConversationChannel } from "@/lib/nexconn/provision";
import {
  sendGroupMessage,
  sendGroupStreamChunk,
  setGroupMessageMetadata,
} from "@/lib/nexconn/server";
import { HD_TYPES, NC_TYPES } from "@/lib/nexconn/types";
import { mirrorMessage, requestHandoff, resolveConversation, emitConversation } from "@/lib/conversations/service";
import { AiBusyError, aiConfigured, embedQuery, generateJson, openTextStream } from "./gemini";
import {
  answerSystemPrompt,
  citedSourceNumbers,
  isNoAnswer,
  looksLikeHumanRequest,
  mayBeNoAnswer,
  smallTalkSystemPrompt,
  TRIAGE_SCHEMA,
  triagePrompt,
  type PromptSource,
  type Triage,
} from "./prompts";
import { recordKnowledgeGap, RELEVANCE_THRESHOLD, retrieveChunks } from "./retrieval";

type HistoryItem = { role: "customer" | "assistant" | "agent"; text: string };

async function loadHistory(conversationId: string, limit = 14): Promise<HistoryItem[]> {
  const rows = await db()
    .select({ senderType: messages.senderType, body: messages.body, kind: messages.kind })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows
    .reverse()
    .filter((r) => r.kind === "text" && r.body.trim())
    .map((r) => ({
      role: r.senderType === "visitor" ? "customer" : r.senderType === "agent" ? "agent" : "assistant",
      text: r.body,
    }));
}

/**
 * Streams model output into one Nexconn RC:StreamMsg. Chunks are coalesced (>= 280 ms apart) to
 * stay well inside Platform API rate limits. Returns the Nexconn message id. If the first chunk
 * comes back without a message id, later chunks could not be attached to it, so the writer stops
 * streaming and sends the whole answer as one ordinary message instead.
 */
class NexconnStreamWriter {
  private seq = 0;
  private messageId: string | undefined;
  private pending = "";
  private lastSent = 0;
  private unstreamed = false;
  text = "";

  constructor(
    private readonly workspace: Workspace,
    private readonly channelId: string,
    private readonly conversationId: string,
  ) {}

  get id() {
    return this.messageId;
  }

  async write(delta: string) {
    this.pending += delta;
    this.text += delta;
    if (this.unstreamed) return;
    if (Date.now() - this.lastSent >= 280 || this.pending.length > 400) await this.flush(false);
  }

  private async flush(complete: boolean) {
    if (!complete && !this.pending) return;
    if (this.unstreamed) return;
    this.seq += 1;
    const content = this.pending;
    this.pending = "";
    this.lastSent = Date.now();
    const id = await sendGroupStreamChunk({
      fromUserId: this.workspace.botUserId,
      channelId: this.channelId,
      chunk: {
        content,
        seq: this.seq,
        complete,
        ...(this.messageId ? { messageId: this.messageId } : { type: "text" }),
      },
      ...(this.messageId ? {} : { metadata: { answer: "streaming" } }),
    });
    if (!this.messageId && !id) {
      console.warn("[ai] stream start returned no message id; sending the answer as one message");
      this.unstreamed = true;
      return;
    }
    if (!this.messageId && id) {
      this.messageId = id;
      // The Web SDK does not push RC:StreamMsg through onMessageReceived; announce it so clients
      // fetch it by id and call requestStreamMessage() for live chunks.
      await sendGroupMessage({
        fromUserId: this.workspace.botUserId,
        channelId: this.channelId,
        messageType: HD_TYPES.stream,
        content: { messageId: id, conversationId: this.conversationId },
        persist: false,
      }).catch((err) => console.warn("[ai] stream announce failed", err instanceof Error ? err.message : err));
    }
  }

  async complete() {
    if (!this.unstreamed) await this.flush(true);
    if (this.unstreamed) {
      this.messageId = await sendGroupMessage({
        fromUserId: this.workspace.botUserId,
        channelId: this.channelId,
        messageType: NC_TYPES.text,
        content: { content: this.text.trim() },
        pushContent: this.text.trim().slice(0, 80),
        metadata: { answer: "text" },
      });
    }
    return this.messageId;
  }
}

async function sendBotText(workspace: Workspace, conversation: Conversation, text: string, metadata?: Record<string, string>) {
  const messageId = await sendGroupMessage({
    fromUserId: workspace.botUserId,
    channelId: conversation.channelId,
    messageType: NC_TYPES.text,
    content: { content: text },
    pushContent: text.slice(0, 80),
    metadata: metadata ?? { answer: "text" },
  });
  await mirrorMessage({
    conversationId: conversation.id,
    workspaceId: workspace.id,
    nexconnMessageId: messageId,
    senderType: "ai",
    kind: "text",
    body: text,
  });
  return messageId;
}

async function sendBotTyping(workspace: Workspace, conversation: Conversation) {
  try {
    await sendGroupMessage({
      fromUserId: workspace.botUserId,
      channelId: conversation.channelId,
      messageType: HD_TYPES.typing,
      content: { name: workspace.botName, role: "ai" },
      persist: false,
    });
  } catch {
    /* typing is best-effort */
  }
}

async function bumpAiCount(conversationId: string, current: number) {
  await db().update(conversations).set({ aiReplyCount: current + 1 }).where(eq(conversations.id, conversationId));
}

async function handleNoAnswer(workspace: Workspace, conversation: Conversation, question: string, embedding: number[] | null) {
  await recordKnowledgeGap({ workspaceId: workspace.id, conversationId: conversation.id, question, embedding });
  if (workspace.handoffOnNoAnswer === "auto") {
    await sendBotText(workspace, conversation, "I couldn't find that in our help articles, so I'm bringing in a person from the team.", {
      answer: "none",
    });
    await requestHandoff(workspace, conversation, "no_answer");
  } else {
    await sendBotText(
      workspace,
      conversation,
      "I couldn't find an answer to that in our help articles. Would you like to talk to a person from the team?",
      { answer: "none" },
    );
  }
}

/**
 * The AI reply pipeline for one customer message. Runs inside `after()` so the customer's
 * request returns immediately; all output reaches the customer through Nexconn.
 */
export async function runAiReply(conversationId: string, visitorMessageRowId: string) {
  const [row] = await db()
    .select({ conversation: conversations, workspace: workspaces })
    .from(conversations)
    .innerJoin(workspaces, eq(workspaces.id, conversations.workspaceId))
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!row) return;
  const { workspace } = row;
  let conversation = row.conversation;
  if (conversation.status !== "ai") return;

  // Only answer the newest customer message; a newer one triggers its own run with full context.
  const [latest] = await db()
    .select({ id: messages.id, body: messages.body, kind: messages.kind })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.senderType, "visitor")))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  if (!latest || latest.id !== visitorMessageRowId) return;

  // Everything below is sent into the conversation's group, which must exist in the current app.
  await ensureConversationChannel(workspace, conversation).catch((err) =>
    console.warn("[ai] conversation provisioning failed", err instanceof Error ? err.message : err),
  );

  if (!workspace.aiEnabled) {
    await requestHandoff(workspace, conversation, "ai_disabled");
    return;
  }
  if (latest.kind !== "text") {
    await sendBotText(
      workspace,
      conversation,
      "Thanks, I received your attachment. I can only read text, so a person from the team will take a look.",
    );
    await requestHandoff(workspace, conversation, "no_answer");
    return;
  }

  const question = latest.body.trim();
  if (looksLikeHumanRequest(question)) {
    await requestHandoff(workspace, conversation, "customer_intent");
    return;
  }

  if (!aiConfigured()) {
    await requestHandoff(workspace, conversation, "ai_error");
    return;
  }

  const allowedVisitor = await rateLimit(`ai:visitor:${conversation.visitorId}`, 12, 600);
  const allowedWorkspace = await rateLimit(`ai:ws:${workspace.id}`, 400, 86_400);
  if (!allowedVisitor || !allowedWorkspace) {
    await sendBotText(workspace, conversation, "I've answered a lot of questions in a short time, so I'm passing you to a person from the team.");
    await requestHandoff(workspace, conversation, "ai_error");
    return;
  }

  await sendBotTyping(workspace, conversation);
  const history = await loadHistory(conversationId);
  const prior = history.slice(0, -1);

  try {
    let triage: Triage = { intent: "question", search_query: question };
    try {
      triage = await generateJson<Triage>({
        system: "You route customer support messages. Respond with JSON only.",
        prompt: triagePrompt(prior, question),
        schema: TRIAGE_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: 200,
        temperature: 0,
        timeoutMs: 12_000,
      });
    } catch (err) {
      console.warn("[ai] triage failed, treating as question", err instanceof Error ? err.message : err);
    }

    if (triage.intent === "human_request") {
      await requestHandoff(workspace, conversation, "customer_intent");
      return;
    }

    if (triage.intent === "small_talk" || triage.intent === "resolved") {
      const writer = new NexconnStreamWriter(workspace, conversation.channelId, conversation.id);
      const stream = await openTextStream({
        system: smallTalkSystemPrompt({ businessName: workspace.name, botName: workspace.botName, tone: workspace.aiTone }),
        contents: [{ role: "user", text: question }],
        maxOutputTokens: 120,
      });
      for await (const delta of stream) await writer.write(delta);
      const messageId = await writer.complete();
      const text = writer.text.trim();
      if (messageId) {
        await setGroupMessageMetadata({
          messageId,
          operatorUserId: workspace.botUserId,
          channelId: conversation.channelId,
          metadata: { answer: "done", text: text.slice(0, 4000), sources: "[]" },
        }).catch(() => undefined);
      }
      await mirrorMessage({
        conversationId,
        workspaceId: workspace.id,
        nexconnMessageId: messageId,
        senderType: "ai",
        kind: "text",
        body: text,
      });
      await bumpAiCount(conversationId, conversation.aiReplyCount);
      return;
    }

    const query = (triage.search_query || question).slice(0, 1000);
    const embedding = await embedQuery(query);
    const retrieved = (await retrieveChunks(workspace.id, embedding, 6)).filter((c) => c.similarity >= RELEVANCE_THRESHOLD);
    if (retrieved.length === 0) {
      await handleNoAnswer(workspace, conversation, question, embedding);
      await bumpAiCount(conversationId, conversation.aiReplyCount);
      return;
    }

    const promptSources: PromptSource[] = retrieved.map((c, i) => ({ n: i + 1, title: c.title, content: c.content }));
    const stream = await openTextStream({
      system: answerSystemPrompt({
        businessName: workspace.name,
        botName: workspace.botName,
        tone: workspace.aiTone,
        instructions: workspace.aiInstructions,
        sources: promptSources,
      }),
      contents: [
        ...prior.slice(-8).map((h) => ({ role: h.role === "customer" ? ("user" as const) : ("model" as const), text: h.text })),
        { role: "user" as const, text: question },
      ],
      maxOutputTokens: 600,
    });

    // Hold output until we know it is not the NO_ANSWER sentinel, then stream to Nexconn.
    let buffered = "";
    let writer: NexconnStreamWriter | null = null;
    for await (const delta of stream) {
      if (!writer) {
        buffered += delta;
        if (mayBeNoAnswer(buffered)) continue;
        writer = new NexconnStreamWriter(workspace, conversation.channelId, conversation.id);
        await writer.write(buffered);
      } else {
        await writer.write(delta);
      }
    }
    if (!writer) {
      if (!buffered.trim() || isNoAnswer(buffered)) {
        await handleNoAnswer(workspace, conversation, question, embedding);
        await bumpAiCount(conversationId, conversation.aiReplyCount);
        return;
      }
      writer = new NexconnStreamWriter(workspace, conversation.channelId, conversation.id);
      await writer.write(buffered);
    }
    const messageId = await writer.complete();
    const answer = writer.text.trim();

    // Map cited [n] markers to unique articles.
    let cited = citedSourceNumbers(answer, promptSources.length);
    // The answer is generated only from the retrieved sources; if the model forgot the [n] markers,
    // credit the most relevant article so the customer can still open the source.
    if (cited.length === 0 && retrieved.length > 0) cited = [1];
    const sources: (MessageSource & { n: number })[] = [];
    for (const n of cited) {
      const c = retrieved[n - 1];
      if (c && !sources.some((s) => s.articleId === c.articleId)) {
        sources.push({ n, articleId: c.articleId, title: c.title, isPublic: c.isPublic });
      }
    }
    // Keep every cited number resolvable even when two numbers point at the same article.
    const numberMap = cited.map((n) => ({ n, articleId: retrieved[n - 1]?.articleId }));
    if (messageId) {
      await setGroupMessageMetadata({
        messageId,
        operatorUserId: workspace.botUserId,
        channelId: conversation.channelId,
        metadata: {
          answer: "done",
          text: answer.slice(0, 4000),
          sources: JSON.stringify(sources.map(({ articleId, title, isPublic }) => ({ articleId, title, isPublic }))).slice(0, 4000),
          refs: JSON.stringify(numberMap).slice(0, 2000),
        },
      }).catch((err) => console.warn("[ai] metadata failed", err instanceof Error ? err.message : err));
    }
    await mirrorMessage({
      conversationId,
      workspaceId: workspace.id,
      nexconnMessageId: messageId,
      senderType: "ai",
      kind: "text",
      body: answer,
      sources: sources.map(({ articleId, title, isPublic }) => ({ articleId, title, isPublic })),
    });
    await bumpAiCount(conversationId, conversation.aiReplyCount);
    await emitConversation(workspace, conversationId, "message", { preview: answer.slice(0, 120) });
  } catch (err) {
    console.error("[ai] reply failed", err);
    const busy = err instanceof AiBusyError;
    // Refresh state: a teammate may have taken over meanwhile.
    const [fresh] = await db().select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    conversation = fresh ?? conversation;
    if (conversation.status !== "ai") return;
    await sendBotText(
      workspace,
      conversation,
      busy
        ? "I'm getting a lot of questions right now and couldn't answer in time. I'm bringing in a person from the team."
        : "Something went wrong while I was looking that up. I'm bringing in a person from the team.",
      { answer: "error" },
    ).catch(() => undefined);
    await requestHandoff(workspace, conversation, "ai_error").catch(() => undefined);
  }
}

/** Customer pressed "That helped" on an AI answer: resolve the conversation (AI-resolved). */
export async function markAnswerHelpful(workspace: Workspace, conversation: Conversation, nexconnMessageId: string) {
  await setGroupMessageMetadata({
    messageId: nexconnMessageId,
    operatorUserId: workspace.botUserId,
    channelId: conversation.channelId,
    metadata: { feedback: "helpful" },
  }).catch(() => undefined);
  if (conversation.status === "ai") await resolveConversation(workspace, conversation, { type: "visitor" });
}
