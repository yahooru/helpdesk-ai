"use client";
import { BookOpen, CircleAlert, CircleCheck, FileText, Lock, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { formatRelative } from "@/lib/time";
import { AddKnowledge } from "./add-knowledge";

export type ArticleRow = {
  id: string;
  title: string;
  sourceType: "article" | "text" | "file";
  fileName: string | null;
  isPublic: boolean;
  indexStatus: "pending" | "ready" | "failed";
  indexError: string | null;
  chunkCount: number;
  updatedAt: string;
};

const SOURCE_LABEL = { article: "FAQ", text: "Pasted text", file: "File" } as const;

export function KnowledgeList({ initial, canEdit }: { initial: ArticleRow[]; canEdit: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);

  async function refresh() {
    const res = await api<{ articles: ArticleRow[] }>("/api/knowledge");
    setRows(res.articles);
  }

  async function retry(id: string) {
    setRetrying(id);
    try {
      const res = await api<{ index: { ok: boolean; error?: string } }>(`/api/knowledge/${id}`, { body: {} });
      toast(res.index.ok ? "Indexed. The assistant can use it now." : (res.index.error ?? "Indexing failed"), res.index.ok ? "success" : "info");
      await refresh();
    } catch (err) {
      toast(errorMessage(err), "info");
    } finally {
      setRetrying(null);
    }
  }

  const shown = rows.filter((r) => !filter || r.title.toLowerCase().includes(filter.toLowerCase()));
  const ready = rows.filter((r) => r.indexStatus === "ready").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title"
          aria-label="Filter knowledge by title"
          className="h-9 w-full max-w-xs rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm focus:border-ledger focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <span className="type-figures text-sm text-muted">
            {ready} of {rows.length} ready for the assistant
          </span>
          {canEdit ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add knowledge
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface">
          <EmptyState
            icon={BookOpen}
            title="Teach the assistant your answers"
            action={canEdit ? <Button onClick={() => setAdding(true)}>Add your first article</Button> : undefined}
          >
            Write FAQs, paste policies, or upload .txt, .md and .pdf files. The assistant answers only from this knowledge and cites the
            article it used.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {r.sourceType === "file" ? <FileText className="size-4 shrink-0 text-muted" aria-hidden /> : <BookOpen className="size-4 shrink-0 text-muted" aria-hidden />}
              <div className="min-w-0 flex-1">
                <Link href={`/app/knowledge/${r.id}`} className="block truncate font-medium hover:underline">
                  {r.title}
                </Link>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{SOURCE_LABEL[r.sourceType]}</span>
                  {r.fileName ? <span className="truncate">{r.fileName}</span> : null}
                  <span>Updated {formatRelative(r.updatedAt)}</span>
                </p>
              </div>
              {!r.isPublic ? (
                <Badge tone="outline">
                  <Lock className="size-3" aria-hidden /> Internal
                </Badge>
              ) : null}
              {r.indexStatus === "ready" ? (
                <span className="flex items-center gap-1 text-xs text-ledger-strong">
                  <CircleCheck className="size-4" aria-hidden /> Ready
                </span>
              ) : r.indexStatus === "failed" ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1" title={r.indexError ?? undefined}>
                    <CircleAlert className="size-4" aria-hidden /> Not indexed
                  </span>
                  {canEdit ? (
                    <Button size="sm" variant="secondary" onClick={() => retry(r.id)} loading={retrying === r.id}>
                      <RefreshCw className="size-3.5" aria-hidden /> Retry
                    </Button>
                  ) : null}
                </span>
              ) : (
                <span className="text-xs text-muted">Indexing</span>
              )}
            </li>
          ))}
          {shown.length === 0 ? <li className="px-4 py-6 text-sm text-muted">No titles match that filter.</li> : null}
        </ul>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add knowledge" className="w-[min(640px,calc(100vw-32px))]">
        <AddKnowledge
          onAdded={async (a, index) => {
            setAdding(false);
            toast(index.ok ? `Added "${a.title}"` : `Saved "${a.title}", but indexing failed. Retry from the list.`, index.ok ? "success" : "info");
            await refresh();
          }}
        />
      </Dialog>
    </div>
  );
}
