import { BookOpen, Download, FileText } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;

function linkify(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <a key={`${keyBase}-u${i}`} href={m[0]} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 break-all">
        {m[0]}
      </a>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Message text with line breaks, links and [n] citation markers rendered as small superscripts. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {lines.map((line, li) => {
        const parts = line.split(/(\[\d{1,2}(?:\s*,\s*\d{1,2})*\])/g);
        return (
          <Fragment key={li}>
            {parts.map((p, pi) =>
              /^\[\d/.test(p) ? (
                <sup key={pi} className="type-figures ml-0.5 text-[0.7em] font-semibold opacity-70">
                  {p.slice(1, -1).replace(/\s+/g, "")}
                </sup>
              ) : (
                <Fragment key={pi}>{linkify(p, `${li}-${pi}`)}</Fragment>
              ),
            )}
            {li < lines.length - 1 ? "\n" : null}
          </Fragment>
        );
      })}
    </span>
  );
}

export function SourceChips({
  sources,
  slug,
  tone = "neutral",
}: {
  sources: { articleId: string; title: string; isPublic: boolean }[];
  slug: string;
  tone?: "neutral" | "inverse";
}) {
  if (!sources.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
      {sources.map((s, i) => {
        const cls = cn(
          "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
          tone === "inverse" ? "border-white/30 text-white" : "border-line-strong bg-surface text-ink",
        );
        const content = (
          <>
            <BookOpen className="size-3 shrink-0" aria-hidden />
            <span className="type-figures font-semibold">{i + 1}</span>
            <span className="truncate">{s.title}</span>
          </>
        );
        return s.isPublic ? (
          <a key={s.articleId} href={`/s/${slug}/articles/${s.articleId}`} target="_blank" rel="noreferrer" className={cn(cls, "hover:underline")}>
            {content}
          </a>
        ) : (
          <span key={s.articleId} className={cls} title="Internal article">
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function ImageAttachment({ url, thumb, name, onLoad }: { url: string; thumb?: string; name?: string; onLoad?: () => void }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[10px] border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url || thumb} alt={name ?? "Image attachment"} className="max-h-60 max-w-full object-contain" loading="lazy" onLoad={onLoad} />
    </a>
  );
}

export function FileAttachment({ url, name, size, inverse }: { url: string; name: string; size?: number; inverse?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex max-w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-sm",
        inverse ? "border-white/30 hover:bg-white/10" : "border-line-strong bg-surface hover:bg-wash",
      )}
    >
      <FileText className="size-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {size ? <span className={cn("block text-xs", inverse ? "text-white/70" : "text-muted")}>{formatBytes(size)}</span> : null}
      </span>
      <Download className="size-4 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      <span className="typing-dot size-1.5 rounded-full bg-current" />
      <span className="typing-dot size-1.5 rounded-full bg-current" />
      <span className="typing-dot size-1.5 rounded-full bg-current" />
    </span>
  );
}
