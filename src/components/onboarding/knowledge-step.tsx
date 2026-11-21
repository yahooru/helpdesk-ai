"use client";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AddKnowledge, type AddedArticle } from "@/components/knowledge/add-knowledge";

export function KnowledgeStep({ existing }: { existing: AddedArticle[] }) {
  const [items, setItems] = useState<(AddedArticle & { error?: string })[]>(existing);
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <AddKnowledge onAdded={(a, index) => setItems((list) => [{ ...a, error: index.ok ? undefined : index.error }, ...list])} />
      <aside className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">Added so far</p>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing yet. Start with the three questions customers ask you most.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
              {items.map((a) => (
                <li key={a.id} className="flex items-start gap-2 px-3 py-2.5 text-sm">
                  {a.indexStatus === "ready" ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-enamel" aria-label="Ready" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-ink" aria-label="Needs attention" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.title}</span>
                    {a.error ? <span className="block text-muted">{a.error}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Link
            href="/onboarding?step=install"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-enamel px-4 text-sm font-medium text-white hover:bg-enamel-strong"
          >
            {items.length ? "Continue to install" : "Skip for now"}
          </Link>
          {items.length === 0 ? (
            <p className="text-xs text-muted">Without knowledge the assistant hands every question to your team.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
