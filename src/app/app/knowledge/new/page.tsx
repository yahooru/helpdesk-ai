import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GapArticleForm } from "@/components/knowledge/gap-article-form";
import { staffContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Write article" };

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ gap?: string }> }) {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  if (ctx.membership.role !== "admin") redirect("/app/knowledge");
  const { gap } = await searchParams;
  return (
    <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <Link href="/app/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Analytics
        </Link>
        <h1 className="type-heading mt-3 text-2xl font-semibold">Write the missing article</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          The draft comes from what your teammate told the customer. Check it, edit it, then publish.
        </p>
        {gap && /^[0-9a-f-]{36}$/i.test(gap) ? (
          <GapArticleForm gapId={gap} />
        ) : (
          <p className="text-muted">Pick a question from Analytics to start.</p>
        )}
      </div>
    </main>
  );
}
