"use client";
import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";

type Article = {
  id: string;
  title: string;
  body: string;
  isPublic: boolean;
  sourceType: "article" | "text" | "file";
  fileName: string | null;
  fileUrl: string | null;
  indexStatus: string;
  indexError: string | null;
  chunkCount: number;
};

export function ArticleEditor({ article, slug, canEdit }: { article: Article; slug: string; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [isPublic, setIsPublic] = useState(article.isPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = title !== article.title || body !== article.body || isPublic !== article.isPublic;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ index: { ok: boolean; error?: string } | null }>(`/api/knowledge/${article.id}`, {
        method: "PATCH",
        body: { title: title.trim(), body: body.trim(), isPublic },
      });
      toast(res.index && !res.index.ok ? (res.index.error ?? "Saved, but indexing failed") : "Saved changes", res.index && !res.index.ok ? "info" : "success");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/knowledge/${article.id}`, { method: "DELETE" });
      toast("Deleted");
      router.replace("/app/knowledge");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormError message={error} />
      <Field label="Title" htmlFor="article-title">
        <Input id="article-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={160} />
      </Field>
      <Field
        label="Content"
        htmlFor="article-body"
        hint={article.sourceType === "file" ? `Extracted from ${article.fileName ?? "the uploaded file"}. Edit to correct anything the extraction got wrong.` : undefined}
      >
        <Textarea id="article-body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} disabled={!canEdit} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={!canEdit} className="mt-0.5 size-4 accent-[var(--enamel)]" />
        <span>
          Show in the public help center
          <span className="block text-muted">Internal articles are still used by the assistant, but customers can&apos;t open them.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          ) : null}
          {article.isPublic ? (
            <a href={`/s/${slug}/articles/${article.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-enamel hover:underline">
              View on support page <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          {article.fileUrl ? (
            <a href={article.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-muted hover:text-ink">
              Original file
            </a>
          ) : null}
        </div>
        {canEdit ? (
          <Button variant="quiet" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        ) : null}
      </div>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this article?" description="The assistant stops using it right away. This can't be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button variant="ink" onClick={remove} loading={deleting}>
            Delete article
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
