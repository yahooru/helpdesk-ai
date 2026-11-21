import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { workspaceBySlug } from "@/lib/widget/public";

async function load(slug: string, id: string) {
  const workspace = await workspaceBySlug(slug);
  if (!workspace || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [article] = await db()
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.workspaceId, workspace.id), eq(articles.isPublic, true)))
    .limit(1);
  return article ? { workspace, article } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const found = await load(slug, id);
  return found ? { title: `${found.article.title} | ${found.workspace.name}` } : { title: "Article" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const found = await load(slug, id);
  if (!found) notFound();
  const { workspace, article } = found;
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link href={`/s/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> {workspace.name} support
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="type-display text-3xl font-semibold">{article.title}</h1>
        <p className="mt-2 text-sm text-muted">Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}</p>
        <article className="mt-8 max-w-[68ch] text-[16px] leading-[1.7] whitespace-pre-wrap">{article.body}</article>
        <div className="mt-12 border-t border-line pt-6">
          <p className="text-sm text-muted">Still need help?</p>
          <Link href={`/s/${slug}`} className="mt-1 inline-block font-medium hover:underline" style={{ color: workspace.brandColor }}>
            Ask in the chat
          </Link>
        </div>
      </main>
    </div>
  );
}
