import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
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
    <div className="min-h-dvh" style={{ ["--brand" as string]: workspace.brandColor }}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          {workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-brand font-semibold text-white">{workspace.name.slice(0, 1).toUpperCase()}</span>
          )}
          <span className="type-heading text-lg font-semibold">{workspace.name}</span>
          <span className="text-muted">Support</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="order-2 lg:order-1">
          <h1 className="type-display text-3xl font-semibold sm:text-4xl">How can we help?</h1>
          <p className="mt-2 max-w-xl text-muted">{workspace.greeting}</p>
          <form className="mt-6" action={`/s/${slug}`}>
            <label className="sr-only" htmlFor="help-search">
              Search help articles
            </label>
            <input
              id="help-search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search help articles"
              className="h-11 w-full max-w-lg rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-base focus:border-[var(--brand)] focus:outline-none"
            />
          </form>
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted">{query ? `${shown.length} result${shown.length === 1 ? "" : "s"}` : "Help articles"}</h2>
            {shown.length === 0 ? (
              <p className="mt-3 text-muted">{query ? "No articles match. Ask in the chat instead." : "No articles yet. Ask your question in the chat."}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
                {shown.map((a) => (
                  <li key={a.id}>
                    <Link href={`/s/${slug}/articles/${a.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-wash">
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium">{a.title}</span>
                        <span className="line-clamp-1 text-sm text-muted">{a.body.slice(0, 200)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section className="order-1 h-[640px] max-h-[80dvh] lg:sticky lg:top-6 lg:order-2" aria-label="Chat with support">
          <SupportPageChat workspace={pub} teamOnline={teamOnline} />
        </section>
      </main>
    </div>
  );
}
