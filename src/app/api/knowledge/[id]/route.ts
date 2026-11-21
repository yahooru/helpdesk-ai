import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { HttpError, requireAdmin, requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { indexArticle } from "@/lib/knowledge/indexer";
import { MAX_KNOWLEDGE_CHARS } from "@/lib/knowledge/parse";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function load(workspaceId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Article not found", "not_found");
  const [article] = await db()
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.workspaceId, workspaceId)))
    .limit(1);
  if (!article) throw new HttpError(404, "Article not found", "not_found");
  return article;
}

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const { workspace } = await requireStaff();
  const article = await load(workspace.id, (await ctx.params).id);
  return json({ article });
});

const patch = z
  .object({
    title: z.string().trim().min(3, "Give the article a title").max(160),
    body: z.string().trim().min(10, "Write at least a sentence").max(MAX_KNOWLEDGE_CHARS),
    isPublic: z.boolean(),
  })
  .partial();

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { workspace } = await requireAdmin();
  const article = await load(workspace.id, (await ctx.params).id);
  const input = await parseJson(req, patch);
  const [updated] = await db()
    .update(articles)
    .set({ ...input, updatedAt: new Date(), ...(input.title || input.body ? { indexStatus: "pending" as const } : {}) })
    .where(eq(articles.id, article.id))
    .returning();
  const index = input.title || input.body ? await indexArticle(updated) : null;
  return json({ article: { ...updated, ...(index ? { indexStatus: index.ok ? "ready" : "failed" } : {}) }, index });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const { workspace } = await requireAdmin();
  const article = await load(workspace.id, (await ctx.params).id);
  await db().delete(articles).where(eq(articles.id, article.id));
  return json({ ok: true });
});

/** Retry indexing (e.g. after the AI service was busy). */
export const POST = route(async (_req: Request, ctx: Ctx) => {
  const { workspace } = await requireAdmin();
  const article = await load(workspace.id, (await ctx.params).id);
  const index = await indexArticle(article);
  return json({ index });
});
