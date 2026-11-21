"use client";
import { FilePlus2, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/time";

type Gap = { id: string; question: string; occurrences: number; lastSeenAt: string };

export function KnowledgeGaps({ initial }: { initial: Gap[] }) {
  const [gaps, setGaps] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  async function dismiss(id: string) {
    setBusy(id);
    try {
      await api(`/api/gaps/${id}/dismiss`, { body: {} });
      setGaps((g) => g.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }
  if (gaps.length === 0) {
    return (
      <EmptyState icon={Lightbulb} title="No unanswered questions" className="px-0 py-6">
        When the assistant can&apos;t find an answer in your knowledge, the question shows up here so you can write the missing article.
      </EmptyState>
    );
  }
  return (
    <ol className="divide-y divide-line">
      {gaps.map((g) => (
        <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
          <span className="type-figures flex h-7 min-w-7 items-center justify-center rounded-full bg-marker-wash px-2 text-sm font-semibold" title="Times asked">
            {g.occurrences}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{g.question}</p>
            <p className="text-xs text-muted">Last asked {formatRelative(g.lastSeenAt)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/app/knowledge/new?gap=${g.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] bg-ledger px-2.5 text-sm font-medium text-white hover:bg-ledger-strong"
            >
              <FilePlus2 className="size-4" aria-hidden /> Write article
            </Link>
            <Button size="sm" variant="quiet" onClick={() => dismiss(g.id)} loading={busy === g.id}>
              Dismiss
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
