"use client";
import { BookMarked, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";

type Reply = { id: string; title: string; body: string };

export function SavedReplies() {
  const toast = useToast();
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [editing, setEditing] = useState<Reply | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api<{ replies: Reply[] }>("/api/replies");
    setReplies(res.replies);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    load().catch((err) => setError(errorMessage(err)));
  }, []);

  function edit(r: Reply | null) {
    setEditing(r);
    setTitle(r?.title ?? "");
    setBody(r?.body ?? "");
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 2) return setError("Give it a name and write the reply");
    setSaving(true);
    setError(null);
    try {
      if (editing) await api(`/api/replies/${editing.id}`, { method: "PATCH", body: { title: title.trim(), body: body.trim() } });
      else await api("/api/replies", { body: { title: title.trim(), body: body.trim() } });
      toast(editing ? "Saved reply updated" : "Saved reply added");
      edit(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Reply) {
    await api(`/api/replies/${r.id}`, { method: "DELETE" }).catch(() => undefined);
    if (editing?.id === r.id) edit(null);
    await load();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form onSubmit={save} className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4" noValidate>
        <h2 className="type-heading text-lg font-semibold">{editing ? "Edit saved reply" : "New saved reply"}</h2>
        <FormError message={error} />
        <Field label="Name" htmlFor="reply-title" hint="What teammates search for in the composer.">
          <Input id="reply-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Refund timing" />
        </Field>
        <Field label="Reply" htmlFor="reply-body">
          <Textarea id="reply-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Add saved reply"}
          </Button>
          {editing ? (
            <Button variant="secondary" onClick={() => edit(null)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      <section>
        <h2 className="type-heading text-lg font-semibold">Saved replies</h2>
        {replies && replies.length === 0 ? (
          <EmptyState icon={BookMarked} title="No saved replies yet" className="px-0">
            Save answers you type often. Insert them from the composer in one click.
          </EmptyState>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
            {(replies ?? []).map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="line-clamp-2 text-sm text-muted">{r.body}</p>
                </div>
                <Button size="sm" variant="quiet" onClick={() => edit(r)} aria-label={`Edit ${r.title}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="quiet" onClick={() => remove(r)} aria-label={`Delete ${r.title}`}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
