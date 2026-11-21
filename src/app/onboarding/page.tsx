import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SnippetBlock } from "@/components/copy-button";
import { KnowledgeStep } from "@/components/onboarding/knowledge-step";
import { WorkspaceStep } from "@/components/onboarding/workspace-step";
import { currentUser, staffContext } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { appOrigin, widgetSnippet } from "@/lib/origin";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Set up your help desk" };

const STEPS = [
  { id: "workspace", label: "Workspace" },
  { id: "knowledge", label: "Knowledge" },
  { id: "install", label: "Install" },
] as const;
type Step = (typeof STEPS)[number]["id"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; new?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");
  const ctx = await staffContext();
  const sp = await searchParams;
  let step: Step = (STEPS.find((s) => s.id === sp.step)?.id ?? "workspace") as Step;
  if (!ctx || sp.new === "1") step = "workspace";
  else if (step === "workspace") step = "knowledge";
  if (ctx && step !== "workspace" && ctx.membership.role !== "admin") redirect("/app/inbox");

  const origin = await appOrigin();
  const existing =
    ctx && step === "knowledge"
      ? await db()
          .select({ id: articles.id, title: articles.title, indexStatus: articles.indexStatus, chunkCount: articles.chunkCount })
          .from(articles)
          .where(eq(articles.workspaceId, ctx.workspace.id))
          .orderBy(desc(articles.createdAt))
          .limit(20)
      : [];

  const index = STEPS.findIndex((s) => s.id === step);
  const titles: Record<Step, { title: string; body: string }> = {
    workspace: { title: "Name your help desk", body: "This is what your customers see in the chat and on your support page." },
    knowledge: { title: "Teach it your answers", body: "The assistant answers only from what you add here, and cites the article it used." },
    install: { title: "Put it on your website", body: "One line of HTML adds the chat launcher to any site. No website? Share your support page link." },
  };

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-4 sm:px-8">
        <BrandMark href={ctx ? "/app" : "/"} />
        {ctx ? (
          <Link href="/app/inbox" className="text-sm font-medium text-muted hover:text-ink">
            Go to inbox
          </Link>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <ol className="mb-12 flex max-w-xl items-center text-sm" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
              <span className={cn("flex items-center gap-2", i === index ? "text-ink" : i < index ? "text-enamel-strong" : "text-faint")}>
                <span
                  className={cn(
                    "type-figures flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    i === index
                      ? "border-enamel bg-surface text-enamel shadow-[0_0_0_4px_var(--enamel-wash)]"
                      : i < index
                        ? "border-enamel bg-enamel text-white"
                        : "border-line-strong bg-surface",
                  )}
                >
                  {i < index ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className="font-medium whitespace-nowrap" aria-current={i === index ? "step" : undefined}>
                  {s.label}
                </span>
              </span>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className={cn("mx-3 h-0.5 flex-1 rounded-full", i < index ? "bg-enamel" : "bg-line-strong")} />
              ) : null}
            </li>
          ))}
        </ol>
        <h1 className="type-display text-3xl font-semibold sm:text-[2.6rem]">{titles[step].title}</h1>
        <p className="mt-3 max-w-xl text-[1.0625rem] text-muted">{titles[step].body}</p>
        <div className="mt-10">
          {step === "workspace" ? <WorkspaceStep /> : null}
          {step === "knowledge" ? <KnowledgeStep existing={existing} /> : null}
          {step === "install" && ctx ? (
            <div className="flex max-w-3xl flex-col gap-8">
              <section>
                <h2 className="type-heading text-lg font-semibold">Chat widget</h2>
                <p className="mt-1 mb-3 text-sm text-muted">Works on any website or site builder that lets you add custom HTML.</p>
                <SnippetBlock snippet={widgetSnippet(origin, ctx.workspace.slug)} />
              </section>
              <section>
                <h2 className="type-heading text-lg font-semibold">Hosted support page</h2>
                <p className="mt-1 mb-3 text-sm text-muted">A full-page chat plus your public articles. Link it from email signatures or social profiles.</p>
                <a
                  href={`/s/${ctx.workspace.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-enamel hover:underline"
                >
                  {origin}/s/{ctx.workspace.slug}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </section>
              <div className="border-t border-line pt-6">
                <Link
                  href="/app/inbox"
                  className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-enamel px-5 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(15_27_45/0.18)] hover:bg-enamel-strong"
                >
                  Open my inbox
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
