import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { articles, knowledgeGaps } from "@/lib/db/schema";
import { HttpError, requireAdmin, requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { indexArticle } from "@/lib/knowledge/indexer";
import { MAX_KNOWLEDGE_CHARS } from "@/lib/knowledge/parse";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export const GET = route(async () => {
  const { workspace } = await requireStaff();
  const rows = await db()
    .select({
      id: articles.id,
      title: articles.title,
      sourceType: articles.sourceType,
      fileName: articles.fileName,
      isPublic: articles.isPublic,
      indexStatus: articles.indexStatus,
      indexError: articles.indexError,
      chunkCount: articles.chunkCount,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.workspaceId, workspace.id))
    .orderBy(desc(articles.updatedAt));
  return json({ articles: rows });
});

const articleInput = z.object({
  title: z.string().trim().min(3, "Give the article a title").max(160, "Keep titles under 160 characters"),
  body: z.string().trim().min(10, "Write at least a sentence").max(MAX_KNOWLEDGE_CHARS, "That text is too long (200,000 characters max)"),
  sourceType: z.enum(["article", "text"]).default("article"),
  isPublic: z.boolean().default(true),
  gapId: z.string().uuid().optional(),
});

export const POST = route(async (req: Request) => {
  const { workspace, user } = await requireAdmin();
  if (!(await rateLimit(`kb:${workspace.id}`, 60, 3600))) throw new HttpError(429, "Too many knowledge changes. Try again shortly.", "rate_limited");
  const input = await parseJson(req, articleInput);
  const [article] = await db()
    .insert(articles)
    .values({
      workspaceId: workspace.id,
      title: input.title,
      body: input.body,
      sourceType: input.sourceType,
      isPublic: input.isPublic,
      createdBy: user.id,
    })
    .returning();
  const result = await indexArticle(article);
  if (input.gapId) {
    await db()
      .update(knowledgeGaps)
      .set({ status: "resolved", articleId: article.id })
      .where(and(eq(knowledgeGaps.id, input.gapId), eq(knowledgeGaps.workspaceId, workspace.id)));
  }
  return json({ article: { ...article, indexStatus: result.ok ? "ready" : "failed", chunkCount: result.ok ? result.chunks : 0 }, index: result }, 201);
});
