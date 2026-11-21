import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";
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
    <div className="flex min-h-dvh flex-col" style={{ ["--brand" as string]: workspace.brandColor }}>
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link href={`/s/${slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25">
            <ArrowLeft className="size-4" aria-hidden /> {workspace.name} support
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="type-display text-3xl font-semibold sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-sm text-muted">
          Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
        </p>
        <article className="mt-8 max-w-[68ch] text-[16px] leading-[1.75] whitespace-pre-wrap">{article.body}</article>
        <div className="mt-14 flex flex-col items-start gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Still need help?</p>
            <p className="mt-0.5 text-sm text-muted">Ask in the chat. You&apos;ll get an answer in seconds, and a person whenever you want one.</p>
          </div>
          <Link
            href={`/s/${slug}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium text-white"
          >
            <MessageCircle className="size-4" aria-hidden /> Ask in the chat
          </Link>
        </div>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-end px-4 py-5 text-sm text-muted sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink">
            <BrandGlyph size={16} /> Runs on HelpDesk AI
          </Link>
        </div>
      </footer>
    </div>
  );
}
