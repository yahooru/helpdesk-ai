import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KnowledgeList, type ArticleRow } from "@/components/knowledge/knowledge-list";
import { PageHeader } from "@/components/ui/misc";
import { staffContext } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
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
    .where(eq(articles.workspaceId, ctx.workspace.id))
    .orderBy(desc(articles.updatedAt));
  const initial: ArticleRow[] = rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
  return (
    <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <PageHeader
          title="Knowledge"
          description="Everything the assistant may use to answer. Public articles also appear on your support page."
        />
        <div className="mt-6">
          <KnowledgeList initial={initial} canEdit={ctx.membership.role === "admin"} />
        </div>
      </div>
    </main>
  );
}
