import "server-only";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, chunks, knowledgeGaps } from "@/lib/db/schema";

/** Minimum cosine similarity for a chunk to count as relevant knowledge. */
export const RELEVANCE_THRESHOLD = 0.5;
/** Similarity above which a new unanswered question merges into an existing knowledge gap. */
export const GAP_MERGE_THRESHOLD = 0.85;

export type RetrievedChunk = {
  chunkId: string;
  articleId: string;
  title: string;
  isPublic: boolean;
  content: string;
  similarity: number;
};

export async function retrieveChunks(workspaceId: string, queryEmbedding: number[], limit = 6): Promise<RetrievedChunk[]> {
  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryEmbedding)})`;
  const rows = await db()
    .select({
      chunkId: chunks.id,
      articleId: chunks.articleId,
      title: articles.title,
      isPublic: articles.isPublic,
      content: chunks.content,
      similarity,
    })
    .from(chunks)
    .innerJoin(articles, eq(articles.id, chunks.articleId))
    .where(eq(chunks.workspaceId, workspaceId))
    .orderBy(desc(similarity))
    .limit(limit);
  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
}

/** Records an unanswered question, merging near-duplicates (embedding similarity) into one gap. */
export async function recordKnowledgeGap(input: {
  workspaceId: string;
  conversationId: string;
  question: string;
  embedding: number[] | null;
}) {
  const question = input.question.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!question) return;
  if (input.embedding) {
    const similarity = sql<number>`1 - (${cosineDistance(knowledgeGaps.embedding, input.embedding)})`;
    const [nearest] = await db()
      .select({ id: knowledgeGaps.id, similarity })
      .from(knowledgeGaps)
      .where(and(eq(knowledgeGaps.workspaceId, input.workspaceId), eq(knowledgeGaps.status, "open")))
      .orderBy(desc(similarity))
      .limit(1);
    if (nearest && Number(nearest.similarity) >= GAP_MERGE_THRESHOLD) {
      await db()
        .update(knowledgeGaps)
        .set({
          occurrences: sql`${knowledgeGaps.occurrences} + 1`,
          lastSeenAt: new Date(),
          lastConversationId: input.conversationId,
        })
        .where(eq(knowledgeGaps.id, nearest.id));
      return;
    }
  }
  await db().insert(knowledgeGaps).values({
    workspaceId: input.workspaceId,
    question,
    embedding: input.embedding,
    lastConversationId: input.conversationId,
  });
}

