"use client";
import { FileText, PenLine, Upload, ClipboardPaste } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";

export type AddedArticle = { id: string; title: string; indexStatus: string; chunkCount?: number };
type IndexResult = { ok: boolean; error?: string; chunks?: number };
type Mode = "article" | "text" | "file";

const MODES: { id: Mode; label: string; icon: typeof PenLine }[] = [
  { id: "article", label: "Write an FAQ", icon: PenLine },
  { id: "text", label: "Paste text", icon: ClipboardPaste },
  { id: "file", label: "Upload a file", icon: Upload },
];

export function AddKnowledge({
  onAdded,
  initial,
  submitLabel,
}: {
  onAdded: (article: AddedArticle, index: IndexResult) => void;
  initial?: { title: string; body: string; gapId?: string };
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<Mode>("article");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "file") {
      if (!file) return setError("Choose a .txt, .md or .pdf file");
      if (file.size > 10 * 1024 * 1024) return setError("Files can be up to 10 MB");
    } else {
      if (title.trim().length < 3) return setError("Give it a title (at least 3 characters)");
      if (body.trim().length < 10) return setError("Add at least a sentence of content");
    }
    setPending(true);
    try {
      let res: { article: AddedArticle; index: IndexResult };
      if (mode === "file" && file) {
        const form = new FormData();
        form.set("file", file);
        form.set("isPublic", String(isPublic));
        res = await api("/api/knowledge/upload", { form });
      } else {
        res = await api("/api/knowledge", {
          body: { title: title.trim(), body: body.trim(), sourceType: mode === "text" ? "text" : "article", isPublic, gapId: initial?.gapId },
        });
      }
      onAdded(res.article, res.index);
      setTitle("");
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {!initial ? (
        <div role="tablist" aria-label="Add knowledge" className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-line bg-wash p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setError(null);
              }}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 text-sm font-medium transition-colors",
                mode === m.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(15,27,45,0.12)]" : "text-muted hover:text-ink",
              )}
            >
              <m.icon className="size-4" aria-hidden />
              {m.label}
            </button>
          ))}
        </div>
      ) : null}
      <FormError message={error} />
      {mode === "file" ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="kb-file"
            className="flex cursor-pointer flex-col items-start gap-2 rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-surface px-4 py-6 hover:bg-wash"
          >
            <FileText className="size-5 text-muted" aria-hidden />
            <span className="font-medium">{file ? file.name : "Choose a .txt, .md or .pdf file"}</span>
            <span className="text-sm text-muted">
              {file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Up to 10 MB. Text is extracted on our server; scanned PDFs without text can't be read."}
            </span>
          </label>
          <input
            ref={fileRef}
            id="kb-file"
            type="file"
            accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <>
          <Field label={mode === "article" ? "Question or title" : "Title"} htmlFor="kb-title">
            <Input
              id="kb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "article" ? "How long does delivery take?" : "Returns policy"}
              maxLength={160}
            />
          </Field>
          <Field
            label={mode === "article" ? "Answer" : "Text"}
            htmlFor="kb-body"
            hint={mode === "text" ? "Paste anything: policies, product details, an existing FAQ page." : "Write it the way you'd explain it to a customer."}
          >
            <Textarea id="kb-body" value={body} onChange={(e) => setBody(e.target.value)} rows={mode === "text" ? 10 : 6} />
          </Field>
        </>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-0.5 size-4 accent-[var(--enamel)]" />
        <span>
          Show in the public help center
          <span className="block text-muted">Turn off for internal notes the assistant may use but customers shouldn&apos;t browse.</span>
        </span>
      </label>
      <div>
        <Button type="submit" loading={pending}>
          {pending ? (mode === "file" ? "Reading and indexing" : "Saving and indexing") : (submitLabel ?? "Add to knowledge")}
        </Button>
      </div>
    </form>
  );
}
