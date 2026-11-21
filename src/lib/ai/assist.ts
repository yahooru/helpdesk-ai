import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, type Conversation, type KnowledgeGap, type Workspace } from "@/lib/db/schema";
import { embedQuery, generateJson, generateText } from "./gemini";
import { ARTICLE_DRAFT_SCHEMA, articleDraftSystemPrompt, suggestionSystemPrompt, type PromptSource } from "./prompts";
import { RELEVANCE_THRESHOLD, retrieveChunks } from "./retrieval";

async function transcript(conversationId: string, limit = 30) {
  const rows = await db()
    .select({ senderType: messages.senderType, body: messages.body, kind: messages.kind })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse().filter((r) => r.kind === "text" && r.body.trim());
}

/** Drafts the agent's next reply from the conversation + retrieved knowledge. */
export async function suggestReply(workspace: Workspace, conversation: Conversation, agentName: string) {
  const turns = await transcript(conversation.id);
  const lastCustomer = [...turns].reverse().find((t) => t.senderType === "visitor")?.body ?? conversation.subject ?? "";
  let sources: PromptSource[] = [];
  const used: { articleId: string; title: string }[] = [];
  if (lastCustomer.trim()) {
    const retrieved = (await retrieveChunks(workspace.id, await embedQuery(lastCustomer), 4)).filter(
      (c) => c.similarity >= RELEVANCE_THRESHOLD,
    );
    sources = retrieved.map((c, i) => ({ n: i + 1, title: c.title, content: c.content }));
    for (const c of retrieved) if (!used.some((u) => u.articleId === c.articleId)) used.push({ articleId: c.articleId, title: c.title });
  }
  const contents = turns.slice(-16).map((t) => ({
    role: t.senderType === "visitor" ? ("user" as const) : ("model" as const),
    text: `${t.senderType === "visitor" ? "Customer" : t.senderType === "agent" ? "Agent" : "Assistant"}: ${t.body}`,
  }));
  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    contents.push({ role: "user", text: "Customer: (waiting for the agent's reply)" });
  }
  const reply = await generateText({
    system: suggestionSystemPrompt({ businessName: workspace.name, agentName, tone: workspace.aiTone, sources }),
    contents,
    maxOutputTokens: 300,
    temperature: 0.4,
  });
  return { reply: reply.replace(/^Agent:\s*/i, "").trim(), sources: used };
}

/** Builds an article draft for a knowledge gap from the human agent's actual reply. */
export async function draftArticleFromGap(workspace: Workspace, gap: KnowledgeGap) {
  if (!gap.lastConversationId) return { title: gap.question, body: "" };
  const rows = await db()
    .select({ senderType: messages.senderType, body: messages.body, kind: messages.kind })
    .from(messages)
    .where(eq(messages.conversationId, gap.lastConversationId))
    .orderBy(asc(messages.createdAt))
    .limit(60);
  const lines = rows
    .filter((r) => r.kind === "text" && r.body.trim())
    .map((r) => `${r.senderType === "visitor" ? "Customer" : r.senderType === "agent" ? "Agent" : "Assistant"}: ${r.body.slice(0, 800)}`);
  if (!rows.some((r) => r.senderType === "agent")) return { title: gap.question, body: "" };
  const draft = await generateJson<{ title: string; body: string }>({
    system: articleDraftSystemPrompt(workspace.name),
    prompt: `Customer question: ${gap.question}\n\nConversation:\n${lines.join("\n")}`,
    schema: ARTICLE_DRAFT_SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 500,
  });
  return { title: (draft.title || gap.question).slice(0, 160), body: draft.body ?? "" };
}
