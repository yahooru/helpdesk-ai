"use client";
import { Angry, AlertCircle, Bot, Frown, Laugh, Meh, Paperclip, RotateCw, Send, Smile, UserRound, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FileAttachment, ImageAttachment, RichText, SourceChips, TypingDots } from "@/components/chat/parts";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/time";
import type { CustomerChatState, PublicWorkspace, UiMessage } from "./use-customer-chat";

const RATINGS = [
  { value: 1, label: "Very poor", icon: Angry },
  { value: 2, label: "Poor", icon: Frown },
  { value: 3, label: "Okay", icon: Meh },
  { value: 4, label: "Good", icon: Smile },
  { value: 5, label: "Great", icon: Laugh },
];

function parseSources(m: UiMessage) {
  try {
    return m.metadata.sources ? (JSON.parse(m.metadata.sources) as { articleId: string; title: string; isPublic: boolean }[]) : [];
  } catch {
    return [];
  }
}

export function BrandStyle({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ "--brand": color, "--brand-ink": "#ffffff" } as CSSProperties}>
      {children}
    </div>
  );
}

function IntroForm({ chat }: { chat: CustomerChatState }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Tell us your name so the team knows who they're talking to.");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("That email doesn't look right.");
    setPending(true);
    setErr(null);
    try {
      await chat.register(name.trim(), email.trim());
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Couldn't start the chat. Try again.");
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="mx-4 mb-4 flex flex-col gap-3 rounded-[12px] border border-line bg-surface p-4" noValidate>
      <p className="text-sm font-medium">Before we start, what&apos;s your name?</p>
      {err ? (
        <p role="alert" className="text-sm text-ink">
          <span className="mr-1.5 inline-block size-2 rounded-full bg-marker align-middle" aria-hidden />
          {err}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={64}
          className="h-10 rounded-[8px] border border-line-strong bg-surface px-3 text-base focus:border-[var(--brand)] focus:outline-none"
          aria-label="Your name"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Email <span className="font-normal text-muted">(optional, for follow-ups)</span>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-10 rounded-[8px] border border-line-strong bg-surface px-3 text-base focus:border-[var(--brand)] focus:outline-none"
          aria-label="Your email (optional)"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-brand font-medium text-brand-ink disabled:opacity-60"
      >
        {pending ? <Spinner className="size-4" /> : null}
        Start chat
      </button>
    </form>
  );
}

function CsatCard({ m, chat }: { m: UiMessage; chat: CustomerChatState }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const done = m.metadata.state === "done" || Boolean(m.metadata.rating);
  if (done) {
    return (
      <div className="mx-auto w-full max-w-[300px] rounded-[12px] border border-line bg-surface px-4 py-3 text-center text-sm">
        <p className="font-medium">Thanks for your rating</p>
        <p className="type-figures mt-0.5 text-muted">You rated this conversation {m.metadata.rating}/5.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[12px] border border-line bg-surface px-4 py-3" data-testid="csat-card">
      <p className="text-sm font-medium">{m.text || "How did we do?"}</p>
      <div role="radiogroup" aria-label="Rating" className="mt-3 flex justify-between gap-1">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={rating === r.value}
            aria-label={`${r.value} of 5, ${r.label}`}
            onClick={() => setRating(r.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[8px] border py-2 text-xs transition-colors",
              rating === r.value ? "border-[var(--brand)] bg-brand text-brand-ink" : "border-line hover:bg-wash",
            )}
          >
            <r.icon className="size-5" aria-hidden />
            <span className="hidden min-[360px]:inline">{r.label}</span>
          </button>
        ))}
      </div>
      {rating ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything we should know? (optional)"
            aria-label="Comment (optional)"
            className="rounded-[8px] border border-line-strong bg-surface px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          />
          {err ? <p className="text-xs text-ink">{err}</p> : null}
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setErr(null);
              try {
                await chat.rate(m.id, rating, comment.trim());
              } catch {
                setErr("Couldn't send your rating. Try again.");
              } finally {
                setPending(false);
              }
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-brand text-sm font-medium text-brand-ink disabled:opacity-60"
          >
            {pending ? <Spinner className="size-4" /> : null}
            Send rating
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EmailCapture({ chat }: { chat: CustomerChatState }) {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (saved) return <p className="mx-auto max-w-[300px] text-center text-xs text-muted">Thanks. The team can follow up by email.</p>;
  return (
    <form
      className="mx-auto flex w-full max-w-[320px] flex-col gap-2 rounded-[12px] border border-line bg-surface px-4 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
        try {
          await chat.saveEmail(email.trim());
          setSaved(true);
        } catch {
          setErr("Couldn't save. Try again.");
        }
      }}
    >
      <p className="text-sm font-medium">Want a reply by email too?</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email for follow-up"
          className="h-9 min-w-0 flex-1 rounded-[8px] border border-line-strong px-2.5 text-sm focus:border-[var(--brand)] focus:outline-none"
        />
        <button type="submit" className="h-9 rounded-[8px] bg-brand px-3 text-sm font-medium text-brand-ink">
          Save
        </button>
      </div>
      {err ? <p className="text-xs text-ink">{err}</p> : null}
    </form>
  );
}

export function CustomerChat({
  workspace,
  chat,
  teamOnline,
  onClose,
  variant,
}: {
  workspace: PublicWorkspace;
  chat: CustomerChatState;
  teamOnline: boolean;
  onClose?: () => void;
  variant: "widget" | "page";
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const prevHeight = useRef(0);

  const status = chat.conversation?.status ?? (workspace.aiEnabled ? "ai" : "queued");
  const agentName = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (m.type === "event" && (m.event?.kind === "agent_joined" || m.event?.kind === "transferred") && m.event.actorName) return m.event.actorName;
    }
    return null;
  }, [chat.messages]);
  const showEmailCapture = !chat.identity?.email && chat.messages.some((m) => m.type === "event" && m.event?.kind === "no_agents");
  const lastAiIndex = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (m.senderId === workspace.botUserId && (m.type === "stream" || m.type === "text")) return i;
      if (m.mine) return -1;
    }
    return -1;
  }, [chat.messages, workspace.botUserId]);

  // Keep the view pinned to the newest message, and keep position when older pages load.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevHeight.current && el.scrollTop < 40 && el.scrollHeight > prevHeight.current && !stick.current) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevHeight.current = el.scrollHeight;
  }, [chat.messages, chat.typing, chat.awaitingAi]);

  useEffect(() => {
    if (chat.identity && variant === "widget") areaRef.current?.focus();
  }, [chat.identity, variant]);

  async function submit() {
    const value = text.trim();
    if (!value) return;
    setText("");
    stick.current = true;
    await chat.send(value);
  }

  const statusLine =
    status === "assigned"
      ? agentName
        ? `You're chatting with ${agentName}`
        : "You're chatting with the team"
      : status === "queued"
        ? teamOnline
          ? "Connecting you with the team"
          : "The team will reply here"
        : workspace.aiEnabled
          ? "AI assistant replies in seconds"
          : teamOnline
            ? "The team is online"
            : "The team will reply here";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-canvas text-ink",
        variant === "widget" ? "rounded-[16px] border border-line-strong shadow-[0_24px_60px_-20px_rgba(29,38,34,0.45)]" : "rounded-[14px] border border-line-strong",
      )}
    >
      <header className="flex items-center gap-3 bg-brand px-4 py-3.5 text-brand-ink">
        {workspace.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={workspace.logoUrl} alt="" className="size-9 rounded-full bg-white object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20 font-semibold">{workspace.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{workspace.name}</h1>
          <p className="flex items-center gap-1.5 truncate text-xs opacity-85" data-testid="chat-status">
            {teamOnline || status === "assigned" ? <span className="size-2 rounded-full bg-white" aria-hidden /> : null}
            {statusLine}
          </p>
        </div>
        {chat.conversation && status === "resolved" ? (
          <button type="button" onClick={chat.startNew} className="rounded-[8px] px-2 py-1 text-xs font-medium hover:bg-white/15">
            New chat
          </button>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Close chat">
            <X className="size-5" />
          </button>
        ) : null}
      </header>

      {chat.connection === "reconnecting" || chat.connection === "offline" || chat.connection === "error" ? (
        <p role="status" className="bg-marker px-4 py-1 text-center text-xs font-medium text-ink">
          {chat.connection === "error" ? "Chat couldn't connect. Messages will send when it recovers." : "Reconnecting…"}
        </p>
      ) : null}

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          if (el.scrollTop < 40 && chat.hasMore && !chat.loadingOlder) void chat.loadOlder();
        }}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
        aria-live="polite"
        aria-label="Messages"
      >
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
          {chat.hasMore ? (
            <button type="button" onClick={() => chat.loadOlder()} className="mx-auto text-xs font-medium text-muted hover:text-ink">
              {chat.loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          ) : null}
          <div className="flex items-end gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Bot className="size-4" aria-hidden />
            </span>
            <p className="max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed">
              {workspace.greeting}
            </p>
          </div>
          {chat.messages.map((m, i) => {
            if (m.type === "event") {
              return (
                <p key={m.id} className="flex items-center gap-2 text-xs text-muted" data-testid="chat-event">
                  <span className="h-px flex-1 bg-line" />
                  <span className="max-w-[80%] text-center">{m.text}</span>
                  <span className="h-px flex-1 bg-line" />
                </p>
              );
            }
            if (m.type === "csat") return <CsatCard key={m.id} m={m} chat={chat} />;
            const isAi = m.senderId === workspace.botUserId;
            const sources = isAi ? parseSources(m) : [];
            const showActions = isAi && i === lastAiIndex && status === "ai" && !m.streaming && m.metadata.feedback !== "helpful";
            const noAnswer = m.metadata.answer === "none";
            return (
              <div key={m.localKey ?? m.id} className={cn("flex flex-col", m.mine ? "items-end" : "items-start")} data-testid={isAi ? "ai-message" : m.mine ? "my-message" : "agent-message"}>
                {!m.mine ? (
                  <span className="mb-1 flex items-center gap-1 text-xs text-muted">
                    {isAi ? <Bot className="size-3.5" aria-hidden /> : <UserRound className="size-3.5" aria-hidden />}
                    {isAi ? `${workspace.botName} (AI)` : (m.senderName ?? agentName ?? "Support team")}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[15px] leading-relaxed",
                    m.mine ? "rounded-br-[4px] bg-brand text-brand-ink" : isAi ? "rounded-bl-[4px] border border-line bg-surface" : "rounded-bl-[4px] bg-surface shadow-[inset_0_0_0_1px_var(--line-strong)]",
                    m.status === "failed" && "opacity-70",
                  )}
                >
                  {m.type === "image" && m.image ? <ImageAttachment url={m.image.url} thumb={m.image.thumb} name={m.image.name} /> : null}
                  {m.type === "file" && m.file ? <FileAttachment url={m.file.url} name={m.file.name} size={m.file.size} inverse={m.mine} /> : null}
                  {m.type === "text" || m.type === "stream" ? <RichText text={m.text || ""} /> : null}
                  {m.streaming && !m.text ? <TypingDots className="text-faint" /> : null}
                  {m.streaming && m.text ? <TypingDots className="ml-1 text-faint" /> : null}
                  {sources.length ? <SourceChips sources={sources} slug={workspace.slug} /> : null}
                  {m.status === "sending" && m.progress != null && m.progress < 100 ? (
                    <span className="mt-1 block text-xs opacity-80">Uploading {Math.round(m.progress)}%</span>
                  ) : null}
                </div>
                {m.mine ? (
                  <span className="type-figures mt-1 flex items-center gap-1 text-[11px] text-faint">
                    {m.status === "sending" ? "Sending…" : null}
                    {m.status === "failed" ? (
                      <button type="button" onClick={() => chat.retry(m)} className="flex items-center gap-1 font-medium text-ink hover:underline">
                        <AlertCircle className="size-3.5" aria-hidden /> Not sent. Tap to retry <RotateCw className="size-3" aria-hidden />
                      </button>
                    ) : null}
                    {m.status === "sent" ? (
                      <span>
                        {formatTime(m.sentTime)}
                        {chat.seen.has(m.id) ? <span data-testid="seen">, seen</span> : null}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {showActions ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!noAnswer ? (
                      <button
                        type="button"
                        onClick={() => chat.markHelpful(m.id)}
                        className="h-8 rounded-full border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-wash"
                      >
                        That helped
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={chat.askHuman}
                      className={cn(
                        "h-8 rounded-full px-3 text-sm font-medium",
                        noAnswer ? "bg-brand text-brand-ink" : "border border-line-strong bg-surface hover:bg-wash",
                      )}
                    >
                      Talk to a person
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {showEmailCapture ? <EmailCapture chat={chat} /> : null}
          {chat.typing ? (
            <p className="flex items-center gap-2 text-sm text-muted" data-testid="typing-indicator">
              <TypingDots /> {chat.typing.name} is typing
            </p>
          ) : chat.awaitingAi ? (
            <p className="flex items-center gap-2 text-sm text-muted" data-testid="typing-indicator">
              <TypingDots /> {workspace.botName} is looking this up
            </p>
          ) : null}
        </div>
      </div>

      {chat.booting ? (
        <div className="flex items-center justify-center py-6 text-muted">
          <Spinner label="Loading chat" className="size-5" />
        </div>
      ) : !chat.identity ? (
        <IntroForm chat={chat} />
      ) : (
        <footer className="border-t border-line bg-surface px-3 pt-2 pb-3">
          {chat.error ? (
            <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs text-ink">
              <span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-marker" aria-hidden />
              <span className="flex-1">{chat.error}</span>
              <button type="button" onClick={() => chat.setError(null)} aria-label="Dismiss" className="text-muted">
                <X className="size-3.5" />
              </button>
            </p>
          ) : null}
          {status === "ai" && workspace.aiEnabled ? (
            <div className="mb-2 flex justify-start">
              <button
                type="button"
                onClick={chat.askHuman}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong px-2.5 text-xs font-medium hover:bg-wash"
              >
                <UserRound className="size-3.5" aria-hidden /> Talk to a person
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-1.5 rounded-[12px] border border-line-strong bg-surface px-1.5 py-1 focus-within:border-[var(--brand)]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mb-1 rounded-full p-1.5 text-muted hover:bg-wash hover:text-ink"
              aria-label="Attach an image or file"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept="image/*,.pdf,.txt,.doc,.docx,.csv,.zip"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void chat.sendFile(f);
                e.target.value = "";
              }}
            />
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                chat.notifyTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder="Write a message"
              aria-label="Write a message"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] focus:outline-none focus-visible:outline-none"
              style={{ height: Math.min(128, Math.max(36, text.split("\n").length * 22 + 14)) }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              className="mb-0.5 flex size-9 items-center justify-center rounded-full bg-brand text-brand-ink disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-faint">
            Runs on{" "}
            <a href="/" target="_blank" rel="noreferrer" className="hover:underline">
              HelpDesk AI
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}
