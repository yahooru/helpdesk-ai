"use client";
import { BookMarked, Lock, Paperclip, Send, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type SavedReply = { id: string; title: string; body: string };

export function Composer({
  conversationId,
  canReply,
  disabledReason,
  onSendText,
  onSendFile,
  onNote,
  onTyping,
}: {
  conversationId: string;
  canReply: boolean;
  disabledReason?: React.ReactNode;
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onNote: (text: string) => Promise<void>;
  onTyping: () => void;
}) {
  const [modePref, setMode] = useState<"reply" | "note">("reply");
  const mode = canReply ? modePref : "note";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replies, setReplies] = useState<SavedReply[] | null>(null);
  const [showReplies, setShowReplies] = useState(false);
  const [filter, setFilter] = useState("");
  const [suggestedFrom, setSuggestedFrom] = useState<string[]>([]);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);


  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    if (mode === "reply" && !canReply) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "reply") {
        setText("");
        await onSendText(value);
      } else {
        await onNote(value);
        setText("");
      }
      setSuggestedFrom([]);
    } catch (err) {
      setError(errorMessage(err));
      if (mode === "note") setText(value);
    } finally {
      setBusy(false);
      areaRef.current?.focus();
    }
  }

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await api<{ reply: string; sources: { articleId: string; title: string }[] }>(`/api/inbox/${conversationId}/suggest`, {
        body: {},
      });
      setMode("reply");
      setText(res.reply);
      setSuggestedFrom(res.sources.map((s) => s.title));
      requestAnimationFrame(() => areaRef.current?.focus());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSuggesting(false);
    }
  }

  async function openReplies() {
    setShowReplies((s) => !s);
    if (!replies) {
      try {
        const res = await api<{ replies: SavedReply[] }>("/api/replies");
        setReplies(res.replies);
      } catch {
        setReplies([]);
      }
    }
  }

  function insert(body: string) {
    setText((t) => (t ? `${t}\n${body}` : body));
    setShowReplies(false);
    setMode(canReply ? "reply" : "note");
    requestAnimationFrame(() => areaRef.current?.focus());
  }

  async function pickFile(file: File | null) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Files can be up to 20 MB");
      return;
    }
    setError(null);
    try {
      await onSendFile(file);
    } catch (err) {
      setError(errorMessage(err));
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = (replies ?? []).filter(
    (r) => !filter || r.title.toLowerCase().includes(filter.toLowerCase()) || r.body.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="relative border-t border-line bg-surface px-3 pt-2 pb-3 sm:px-4">
      {showReplies ? (
        <div className="rise-in absolute right-3 bottom-full left-3 z-20 mb-2 max-h-72 overflow-hidden rounded-[var(--radius-panel)] border border-line-strong bg-surface shadow-[0_14px_32px_-12px_rgba(29,38,34,0.3)]">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search saved replies"
              className="h-8 flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShowReplies(false)} aria-label="Close saved replies" className="text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <ul className="scrollbar-thin max-h-56 overflow-y-auto">
            {replies === null ? <li className="px-3 py-3 text-sm text-muted">Loading…</li> : null}
            {replies && filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted">
                No saved replies yet. Add them in Settings, Saved replies.
              </li>
            ) : null}
            {filtered.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => insert(r.body)} className="block w-full px-3 py-2 text-left hover:bg-wash">
                  <span className="block text-sm font-medium">{r.title}</span>
                  <span className="line-clamp-1 text-sm text-muted">{r.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Composer mode" className="flex gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "reply"}
            disabled={!canReply}
            onClick={() => setMode("reply")}
            className={cn(
              "rounded-[var(--radius-control)] px-2.5 py-1 text-sm font-medium disabled:opacity-40",
              mode === "reply" ? "bg-ink text-white" : "text-muted hover:bg-wash",
            )}
          >
            Reply
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "note"}
            onClick={() => setMode("note")}
            className={cn(
              "flex items-center gap-1 rounded-[var(--radius-control)] px-2.5 py-1 text-sm font-medium",
              mode === "note" ? "bg-ink text-white" : "text-muted hover:bg-wash",
            )}
          >
            <Lock className="size-3.5" aria-hidden /> Internal note
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="quiet" size="sm" onClick={openReplies} aria-expanded={showReplies}>
            <BookMarked className="size-4" aria-hidden />
            <span className="hidden sm:inline">Saved replies</span>
          </Button>
          <Button variant="quiet" size="sm" onClick={suggest} loading={suggesting} disabled={!canReply}>
            {!suggesting ? <Sparkles className="size-4" aria-hidden /> : null}
            <span className="hidden sm:inline">Suggest reply</span>
          </Button>
        </div>
      </div>
      {!canReply && mode === "reply" ? <div className="mb-2 text-sm text-muted">{disabledReason}</div> : null}
      {error ? (
        <p role="alert" className="mb-2 text-sm font-medium text-ink">
          <span className="mr-1.5 inline-block size-2 rounded-full bg-brass align-middle" aria-hidden />
          {error}
        </p>
      ) : null}
      {suggestedFrom.length ? (
        <p className="mb-1.5 text-xs text-muted">Suggested from: {suggestedFrom.join(", ")}. Review before sending.</p>
      ) : null}
      <div
        className={cn(
          "flex items-end gap-2 rounded-[var(--radius-panel)] border px-2 py-1.5",
          mode === "note" ? "border-dashed border-line-strong bg-wash" : "border-line-strong bg-surface focus-within:border-enamel",
        )}
      >
        {mode === "reply" ? (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canReply}
              className="mb-1 rounded p-1.5 text-muted hover:bg-wash hover:text-ink disabled:opacity-40"
              aria-label="Attach an image or file"
            >
              <Paperclip className="size-4" />
            </button>
            <input ref={fileRef} type="file" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </>
        ) : null}
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (mode === "reply" && canReply) onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={Math.min(6, Math.max(2, text.split("\n").length))}
          placeholder={mode === "note" ? "Write a note for your team" : canReply ? "Write a reply. Enter to send, Shift+Enter for a new line" : "Claim the conversation to reply"}
          aria-label={mode === "note" ? "Internal note" : "Reply to customer"}
          disabled={mode === "reply" && !canReply}
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed focus:outline-none focus-visible:outline-none"
        />
        <Button size="sm" onClick={submit} disabled={!text.trim() || (mode === "reply" && !canReply)} loading={busy} className="mb-0.5">
          {!busy ? <Send className="size-4" aria-hidden /> : null}
          {mode === "note" ? "Add note" : "Send"}
        </Button>
      </div>
    </div>
  );
}
