import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { safeFileName, storeFile } from "@/lib/blob";
import { json, route } from "@/lib/http";
import { indexArticle } from "@/lib/knowledge/indexer";
import { extractFileText, titleFromFileName } from "@/lib/knowledge/parse";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Upload a .txt/.md/.pdf: keep the original in Blob, parse text server-side, embed into pgvector. */
export const POST = route(async (req: Request) => {
  const { workspace, user } = await requireAdmin();
  if (!(await rateLimit(`kb-upload:${workspace.id}`, 30, 3600))) throw new HttpError(429, "Too many uploads. Try again shortly.", "rate_limited");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload", "no_file");
  const isPublic = form?.get("isPublic") !== "false";
  const { text } = await extractFileText(file);
  const fileUrl = await storeFile(`knowledge/${workspace.id}/${safeFileName(file.name)}`, file, file.type || "application/octet-stream");
  const [article] = await db()
    .insert(articles)
    .values({
      workspaceId: workspace.id,
      title: titleFromFileName(file.name),
      body: text,
      sourceType: "file",
      fileName: file.name.slice(0, 200),
      fileUrl,
      isPublic,
      createdBy: user.id,
    })
    .returning();
  const index = await indexArticle(article);
  return json({ article: { ...article, indexStatus: index.ok ? "ready" : "failed" }, index }, 201);
});
