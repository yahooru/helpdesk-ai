"use client";
import { AlertCircle, Bot, Lock, RotateCw, Star } from "lucide-react";
import { FileAttachment, ImageAttachment, RichText, SourceChips, TypingDots } from "@/components/chat/parts";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/time";
import type { NoteRow, TItem } from "./types";

type Row = { type: "item"; item: TItem } | { type: "note"; note: NoteRow };

export function Transcript({
  items,
  notes,
  slug,
  seenIds,
  csat,
  typing,
  onRetry,
  visitorName,
}: {
  items: TItem[];
  notes: NoteRow[];
  slug: string;
  seenIds: Set<string>;
  csat: { rating: number | null; comment: string | null };
  typing: string | null;
  onRetry: (item: TItem) => void;
  visitorName: string;
}) {
  const rows: Row[] = [
    ...items.map((item) => ({ type: "item" as const, item, at: item.at })),
    ...notes.map((note) => ({ type: "note" as const, note, at: new Date(note.createdAt).getTime() })),
  ].sort((a, b) => a.at - b.at);

  // "Seen" goes under the newest agent message the customer has read.
  let lastSeenAgentKey: string | null = null;
  for (const it of items) if (it.sender === "agent" && it.nexconnId && seenIds.has(it.nexconnId)) lastSeenAgentKey = it.key;

  return (
    <ol className="flex flex-col gap-3 px-4 py-5 sm:px-6" aria-label="Conversation transcript">
      {rows.map((row) => {
        if (row.type === "note") {
          return (
            <li key={`note-${row.note.id}`} className="rise-in mx-auto w-full max-w-xl">
              <div className="rounded-[10px] border border-dashed border-line-strong bg-surface px-3 py-2">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Lock className="size-3" aria-hidden /> Internal note by {row.note.authorName ?? "a teammate"}. The customer can&apos;t see it.
                </p>
                <p className="text-sm">
                  <RichText text={row.note.body} />
                </p>
                <p className="type-figures mt-1 text-right text-[11px] text-faint">{formatTime(row.note.createdAt)}</p>
              </div>
            </li>
          );
        }
        const it = row.item;
        if (it.kind === "event") {
          return (
            <li key={it.key} className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              <span className="max-w-[75%] text-center">{it.body}</span>
              <span className="h-px flex-1 bg-line" />
            </li>
          );
        }
        if (it.kind === "csat") {
          return (
            <li key={it.key} className="mx-auto w-full max-w-sm rounded-[10px] border border-line bg-surface px-4 py-3 text-sm">
              <p className="font-medium">Rating requested</p>
              {csat.rating ? (
                <p className="mt-1 flex items-center gap-1.5">
                  <Star className="size-4 text-ink" aria-hidden />
                  <span className="type-figures font-semibold">{csat.rating}/5</span>
                  {csat.comment ? <span className="text-muted">&ldquo;{csat.comment}&rdquo;</span> : null}
                </p>
              ) : (
                <p className="mt-1 text-muted">Waiting for the customer to rate.</p>
              )}
            </li>
          );
        }
        const mine = it.sender === "agent";
        const ai = it.sender === "ai";
        return (
          <li key={it.key} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
            <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
              {ai ? <Bot className="size-3.5" aria-hidden /> : null}
              {ai ? "AI assistant" : mine ? (it.senderName ?? "Agent") : visitorName}
              <span className="type-figures text-faint">{formatTime(it.at)}</span>
            </span>
            <div
              className={cn(
                "max-w-[min(560px,85%)] rounded-[14px] px-3.5 py-2.5 text-[15px] leading-relaxed",
                mine ? "rounded-tr-[4px] bg-enamel text-white" : ai ? "rounded-tl-[4px] border border-line bg-surface" : "rounded-tl-[4px] bg-wash",
                it.status === "failed" && "opacity-70",
              )}
            >
              {it.kind === "image" && it.attachment ? <ImageAttachment url={it.attachment.url} name={it.attachment.name} /> : null}
              {it.kind === "file" && it.attachment ? (
                <FileAttachment url={it.attachment.url} name={it.attachment.name} size={it.attachment.size} inverse={mine} />
              ) : null}
              {it.kind === "text" ? <RichText text={it.body || (it.streaming ? "…" : "")} /> : null}
              {it.streaming ? <TypingDots className="ml-1 text-faint" /> : null}
              {ai && it.sources?.length ? <SourceChips sources={it.sources} slug={slug} /> : null}
              {it.status === "sending" && it.progress != null && it.progress < 100 ? (
                <span className="mt-1 block text-xs text-white/80">Uploading {Math.round(it.progress)}%</span>
              ) : null}
            </div>
            {mine ? (
              <span className="mt-1 flex items-center gap-1 text-xs text-faint" aria-live="polite">
                {it.status === "sending" ? "Sending…" : null}
                {it.status === "failed" ? (
                  <button type="button" onClick={() => onRetry(it)} className="flex items-center gap-1 font-medium text-ink hover:underline">
                    <AlertCircle className="size-3.5" aria-hidden /> Not sent. Retry <RotateCw className="size-3" aria-hidden />
                  </button>
                ) : null}
                {it.key === lastSeenAgentKey ? "Seen" : null}
              </span>
            ) : null}
          </li>
        );
      })}
      {typing ? (
        <li className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <TypingDots /> {typing} is typing
        </li>
      ) : null}
    </ol>
  );
}
