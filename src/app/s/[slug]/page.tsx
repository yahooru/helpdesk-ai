import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";
import { SupportPageChat } from "@/components/customer/support-page-chat";
import { anyTeammateOnline } from "@/lib/conversations/service";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { toPublicWorkspace, workspaceBySlug } from "@/lib/widget/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const workspace = await workspaceBySlug((await params).slug);
  return workspace ? { title: `${workspace.name} support`, description: workspace.greeting } : { title: "Support" };
}

export default async function SupportPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const workspace = await workspaceBySlug(slug);
  if (!workspace) notFound();
  const [teamOnline, list] = await Promise.all([
    anyTeammateOnline(workspace).catch(() => false),
    db()
      .select({ id: articles.id, title: articles.title, body: articles.body })
      .from(articles)
      .where(and(eq(articles.workspaceId, workspace.id), eq(articles.isPublic, true), eq(articles.indexStatus, "ready")))
      .orderBy(desc(articles.updatedAt))
      .limit(100),
  ]);
  const query = (q ?? "").trim().toLowerCase();
  const shown = query ? list.filter((a) => a.title.toLowerCase().includes(query) || a.body.toLowerCase().includes(query)) : list;
  const pub = toPublicWorkspace(workspace);

  return (
    <div className="flex min-h-dvh flex-col" style={{ ["--brand" as string]: workspace.brandColor }}>
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          {workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt="" className="size-9 rounded-full bg-white object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-white/20 font-semibold">{workspace.name.slice(0, 1).toUpperCase()}</span>
          )}
          <span className="type-heading text-lg font-semibold">{workspace.name}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-sm text-white/90">Support</span>
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:px-6 lg:pb-32">
          <h1 className="type-display max-w-xl text-4xl font-semibold sm:text-5xl">How can we help?</h1>
          <p className="mt-3 max-w-xl text-lg text-white/85">{workspace.greeting}</p>
          <form className="mt-8 max-w-xl" action={`/s/${slug}`}>
            <label className="sr-only" htmlFor="help-search">
              Search help articles
            </label>
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-4 text-ink shadow-lg focus-within:ring-4 focus-within:ring-white/30">
              <Search className="size-5 shrink-0 text-faint" aria-hidden />
              <input
                id="help-search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search help articles"
                className="h-13 w-full bg-transparent text-base focus:outline-none"
              />
            </div>
          </form>
        </div>
      </header>
      <main className="mx-auto -mt-20 grid w-full max-w-6xl flex-1 gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="order-2 lg:order-1 lg:pt-28">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="type-heading text-lg font-semibold">
              {query ? `${shown.length} result${shown.length === 1 ? "" : "s"} for \u201c${q?.trim()}\u201d` : "Help articles"}
            </h2>
            {query ? (
              <Link href={`/s/${slug}`} className="text-sm font-medium text-muted hover:text-ink">
                Clear search
              </Link>
            ) : null}
          </div>
          {shown.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
              <BookOpen className="mx-auto size-6 text-faint" aria-hidden />
              <p className="mt-2 font-medium">{query ? "No articles match that search." : "No articles yet."}</p>
              <p className="mt-1 text-sm text-muted">Ask in the chat instead. The assistant answers in seconds, and a person is one tap away.</p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {shown.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/s/${slug}/articles/${a.id}`}
                    className="group flex h-full flex-col rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold group-hover:text-[color:var(--brand)]">{a.title}</span>
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-faint transition-colors group-hover:text-[color:var(--brand)]" aria-hidden />
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-sm text-muted">{a.body.slice(0, 220)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="order-1 h-[640px] max-h-[82dvh] lg:sticky lg:top-6 lg:order-2 lg:-mt-56" aria-label="Chat with support">
          <div className="h-full rounded-[16px] shadow-lg">
            <SupportPageChat workspace={pub} teamOnline={teamOnline} />
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 text-sm text-muted sm:px-6">
          <span>&copy; {new Date().getFullYear()} {workspace.name}</span>
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink">
            <BrandGlyph size={16} /> Runs on HelpDesk AI
          </Link>
        </div>
      </footer>
    </div>
  );
}
