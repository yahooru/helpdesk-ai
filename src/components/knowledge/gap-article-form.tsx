"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { AddKnowledge } from "./add-knowledge";

export function GapArticleForm({ gapId }: { gapId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ title: string; body: string }>(`/api/gaps/${gapId}/draft`, { body: {} })
      .then((d) => setDraft({ title: d.title, body: d.body }))
      .catch((err) => setError(errorMessage(err)));
  }, [gapId]);

  if (error) return <p className="font-medium">{error}</p>;
  if (!draft) {
    return (
      <p className="flex items-center gap-2 text-muted">
        <Spinner className="size-4" /> Drafting from the conversation…
      </p>
    );
  }
  return (
    <>
      {!draft.body ? (
        <p className="mb-4 rounded-[var(--radius-control)] border border-line bg-marker-wash px-3 py-2 text-sm">
          Nobody on the team answered this question yet, so there is no draft. Write the answer below.
        </p>
      ) : null}
      <AddKnowledge
        initial={{ ...draft, gapId }}
        submitLabel="Publish article"
        onAdded={(a, index) => {
          toast(index.ok ? `Published "${a.title}"` : "Saved, but indexing failed. Retry from Knowledge.", index.ok ? "success" : "info");
          router.replace("/app/analytics");
          router.refresh();
        }}
      />
    </>
  );
}
