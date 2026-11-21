import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "@/components/knowledge/article-editor";
import { staffContext } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Edit article" };

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [article] = await db()
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.workspaceId, ctx.workspace.id)))
    .limit(1);
  if (!article) notFound();
  return (
    <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <Link href="/app/knowledge" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Knowledge
        </Link>
        <h1 className="type-heading mt-3 mb-6 text-2xl font-semibold">{article.title}</h1>
        <ArticleEditor
          article={{
            id: article.id,
            title: article.title,
            body: article.body,
            isPublic: article.isPublic,
            sourceType: article.sourceType,
            fileName: article.fileName,
            fileUrl: article.fileUrl,
            indexStatus: article.indexStatus,
            indexError: article.indexError,
            chunkCount: article.chunkCount,
          }}
          slug={ctx.workspace.slug}
          canEdit={ctx.membership.role === "admin"}
        />
      </div>
    </main>
  );
}
