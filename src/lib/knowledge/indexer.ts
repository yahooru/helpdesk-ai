import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, chunks, type Article } from "@/lib/db/schema";
import { embedTexts } from "@/lib/ai/gemini";
import { chunkArticle } from "./chunk";

/**
 * (Re)builds the vector index for one article: chunk -> embed (Gemini, 768 dims) -> replace rows.
 * On failure the article keeps its text and is marked `failed` with a readable error so the admin
 * can retry from the Knowledge page.
 */
export async function indexArticle(article: Pick<Article, "id" | "workspaceId" | "title" | "body">) {
  try {
    const pieces = chunkArticle(article.title, article.body);
    const vectors = await embedTexts(pieces, "RETRIEVAL_DOCUMENT");
    const rows = pieces.map((content, i) => ({
      articleId: article.id,
      workspaceId: article.workspaceId,
      ordinal: i,
      content,
      embedding: vectors[i],
    }));
    const statements = [
      db().delete(chunks).where(eq(chunks.articleId, article.id)),
      ...chunkRows(rows, 40).map((batch) => db().insert(chunks).values(batch)),
      db()
        .update(articles)
        .set({ indexStatus: "ready", indexError: null, chunkCount: rows.length })
        .where(eq(articles.id, article.id)),
    ] as const;
    // neon-http batch runs the statements in one transaction.
    await db().batch(statements as unknown as Parameters<ReturnType<typeof db>["batch"]>[0]);
    return { ok: true as const, chunks: rows.length };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AiBusyError"
        ? "The AI service was busy. Retry indexing in a minute."
        : err instanceof Error && err.name === "AiUnavailableError"
          ? "AI is not configured on this server."
          : "Indexing failed. Retry in a minute.";
    console.error("[knowledge] index failed", article.id, err);
    await db().update(articles).set({ indexStatus: "failed", indexError: message }).where(eq(articles.id, article.id));
    return { ok: false as const, error: message };
  }
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}
