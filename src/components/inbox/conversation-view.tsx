"use client";
import { ArrowLeft, Bot, CheckCircle2, PanelRight, RotateCcw, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "@/lib/use-latest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useStaffChat } from "@/components/app/staff-chat";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { markRead, sendMedia, sendText, sendTyping, subscribe, type ChatMessage } from "@/lib/nexconn/client";
import { SlaChip } from "./conversation-list";
import { Composer } from "./composer";
import { CustomerPanel } from "./customer-panel";
import { Transcript } from "./transcript";
import type { Detail, NoteRow, TItem, TranscriptRow } from "./types";

type Me = { userId: string; nexconnId: string; name: string };

function fromRow(r: TranscriptRow): TItem {
  return {
    key: r.nexconnMessageId ?? r.id,
    nexconnId: r.nexconnMessageId,
    sender: r.senderType,
    senderUserId: r.senderUserId,
    senderName: r.senderName,
    kind: r.kind,
    body: r.body,
    attachment: r.attachment,
    sources: r.sources,
    at: new Date(r.createdAt).getTime(),
    status: "sent",
  };
}

function parseSources(md: Record<string, string>) {
  try {
    return md.sources ? (JSON.parse(md.sources) as TItem["sources"]) : undefined;
  } catch {
    return undefined;
  }
}

export function ConversationView({
  conversationId,
  me,
  botUserId,
  slug,
  refreshKey,
  onChanged,
  onBack,
  onOpen,
}: {
  conversationId: string;
  me: Me;
  botUserId: string;
  slug: string;
  refreshKey: number;
  onChanged: () => void;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const toast = useToast();
  const { staffChannelId } = useStaffChat();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [items, setItems] = useState<TItem[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<string | null>(null);
  const [csat, setCsat] = useState<{ rating: number | null; comment: string | null }>({ rating: null, comment: null });
  const [acting, setActing] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailRef = useLatest<Detail | null>(detail);

  const load = useCallback(
    async (initial: boolean) => {
      try {
        const d = await api<Detail>(`/api/inbox/${conversationId}`);
        setDetail(d);
        setCsat({ rating: d.conversation.csatRating, comment: d.conversation.csatComment });
        // Notes are append-only: union with local ones so a refetch that started before a note was
        // saved never hides it.
        setNotes((prev) => {
          const ids = new Set(d.notes.map((n) => n.id));
          return [...d.notes, ...prev.filter((n) => !ids.has(n.id))];
        });
        setItems((prev) => {
          const fromDb = d.transcript.map(fromRow);
          const known = new Set(fromDb.map((i) => i.nexconnId).filter(Boolean));
          // Keep live/optimistic items the mirror doesn't have yet.
          const extra = initial ? [] : prev.filter((p) => (p.nexconnId ? !known.has(p.nexconnId) : p.status !== "sent"));
          return [...fromDb, ...extra].sort((a, b) => a.at - b.at);
        });
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [conversationId],
  );

  // The view is keyed by conversation id, so state starts fresh; this only fetches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the request resolves
    void load(true);
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async refetch triggered by a live inbox event
    if (refreshKey > 0) void load(false);
  }, [refreshKey, load]);

  const team = useMemo(() => new Map((detail?.team ?? []).map((t) => [t.nexconnUserId, t])), [detail?.team]);

  const liveToItem = useCallback(
    (m: ChatMessage): TItem | null => {
      const d = detailRef.current;
      if (!d) return null;
      const isVisitor = m.senderId === d.visitor.nexconnUserId;
      const isBot = m.senderId === botUserId;
      const mate = team.get(m.senderId);
      const sender: TItem["sender"] = isVisitor ? "visitor" : isBot ? (m.type === "event" || m.type === "csat" ? "system" : "ai") : mate ? "agent" : "system";
      const kind: TItem["kind"] =
        m.type === "stream" || m.type === "text" ? "text" : m.type === "image" ? "image" : m.type === "file" ? "file" : m.type === "event" ? "event" : m.type === "csat" ? "csat" : "text";
      if (m.type === "other" || m.type === "note") return null;
      return {
        key: m.id,
        nexconnId: m.id,
        sender,
        senderUserId: mate?.userId ?? null,
        senderName: mate?.name ?? null,
        kind,
        body: m.text,
        attachment: m.image ? { url: m.image.url, name: m.image.name ?? "Image" } : m.file ? { url: m.file.url, name: m.file.name, size: m.file.size } : null,
        sources: parseSources(m.metadata),
        at: m.sentTime,
        status: "sent",
        streaming: m.streaming,
      };
    },
    [botUserId, team],
  );

  const upsert = useCallback((item: TItem) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => (item.nexconnId && p.nexconnId === item.nexconnId) || p.key === item.key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...prev[i], ...item, body: item.body || prev[i].body, sources: item.sources ?? prev[i].sources };
        return next;
      }
      return [...prev, item].sort((a, b) => a.at - b.at);
    });
  }, []);

  const isMember = detail?.conversation.assigneeId === me.userId && detail?.conversation.status !== "resolved";
  const channelId = detail?.conversation.channelId;

  // Live events from Nexconn for this conversation's channel and the staff channel (notes).
  useEffect(() => {
    if (!channelId) return;
    return subscribe({
      onMessage: (m) => {
        if (m.channelId === staffChannelId && m.type === "note" && m.note?.conversationId === conversationId) {
          const n = m.note;
          setNotes((prev) =>
            prev.some((x) => x.id === n.noteId)
              ? prev
              : [...prev, { id: n.noteId, body: n.text, authorName: n.authorName, authorId: null, createdAt: new Date(m.sentTime).toISOString() }],
          );
          return;
        }
        if (m.channelId !== channelId) return;
        const item = liveToItem(m);
        if (item) upsert(item);
        if (item?.sender === "visitor") setTyping(null);
        if (m.type === "csat") setCsat({ rating: null, comment: null });
      },
      onUpdate: (id, patch) => {
        setItems((prev) => prev.map((p) => (p.nexconnId === id ? { ...p, ...(patch.text ? { body: patch.text } : {}), ...(patch.streaming !== undefined ? { streaming: patch.streaming } : {}) } : p)));
      },
      onMetadata: (id, ch, md) => {
        if (ch !== channelId) return;
        if (md.rating) setCsat({ rating: Number(md.rating), comment: md.comment || null });
        const sources = parseSources(md);
        if (sources) setItems((prev) => prev.map((p) => (p.nexconnId === id ? { ...p, sources } : p)));
      },
      onReceipt: (ch, ids, readers) => {
        if (ch !== channelId) return;
        const d = detailRef.current;
        if (d && readers.includes(d.visitor.nexconnUserId)) setSeen((s) => new Set([...s, ...ids]));
      },
      onTyping: (ch, userId, info) => {
        if (ch !== channelId || userId === me.nexconnId) return;
        setTyping(info.role === "ai" ? "AI assistant" : info.name);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 6000);
      },
      onResync: () => void load(false),
    });
  }, [channelId, conversationId, staffChannelId, liveToItem, upsert, load, me.nexconnId]);

  // Read receipts + clear unread for customer messages while this conversation is open.
  useEffect(() => {
    if (!isMember || !channelId) return;
    const ids = items.filter((i) => i.sender === "visitor" && i.nexconnId).map((i) => i.nexconnId!) as string[];
    if (ids.length && document.visibilityState === "visible") void markRead(channelId, ids.slice(-20));
  }, [items, isMember, channelId]);

  // Autoscroll when near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [items, notes, typing]);

  async function act(name: string, path: string, body?: unknown) {
    setActing(name);
    try {
      await api(`/api/inbox/${conversationId}/${path}`, { body: body ?? {} });
      await load(false);
      onChanged();
      if (name === "resolve") toast("Resolved. A rating card was sent to the customer.");
      if (name === "claim") toast("You joined the conversation.");
      if (name === "transfer") toast("Conversation transferred.");
      if (name === "reopen") toast("Conversation reopened.");
    } catch (err) {
      toast(errorMessage(err), "info");
    } finally {
      setActing(null);
    }
  }

  async function deliverText(text: string, existingKey?: string) {
    if (!channelId) return;
    const key = existingKey ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    upsert({ key, nexconnId: null, sender: "agent", senderName: me.name, senderUserId: me.userId, kind: "text", body: text, at: Date.now(), status: "sending" });
    try {
      const m = await sendText(channelId, text, { senderName: me.name });
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, key: m.id, nexconnId: m.id, at: m.sentTime, status: "sent" } : p)));
      await api(`/api/inbox/${conversationId}/messages`, { body: { nexconnMessageId: m.id, kind: "text", text } }).catch(() => undefined);
      onChanged();
    } catch {
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, status: "failed" } : p)));
    }
  }

  async function deliverFile(file: File, existingKey?: string) {
    if (!channelId) return;
    const key = existingKey ?? `tmp-${Date.now()}`;
    const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(file.type);
    upsert({
      key,
      nexconnId: null,
      sender: "agent",
      senderName: me.name,
      kind: isImage ? "image" : "file",
      body: "",
      attachment: { url: isImage ? URL.createObjectURL(file) : "#", name: file.name, size: file.size },
      at: Date.now(),
      status: "sending",
      progress: 0,
      localFile: file,
    });
    try {
      const m = await sendMedia(channelId, file, (p) => setItems((prev) => prev.map((x) => (x.key === key ? { ...x, progress: p } : x))));
      const url = m.image?.url ?? m.file?.url ?? "";
      setItems((prev) =>
        prev.map((p) => (p.key === key ? { ...p, key: m.id, nexconnId: m.id, at: m.sentTime, status: "sent", attachment: { url, name: file.name, size: file.size } } : p)),
      );
      await api(`/api/inbox/${conversationId}/messages`, {
        body: { nexconnMessageId: m.id, kind: isImage ? "image" : "file", text: "", attachment: { url, name: file.name, size: file.size, mime: file.type } },
      }).catch(() => undefined);
      onChanged();
    } catch {
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, status: "failed" } : p)));
    }
  }

  if (error && !detail) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 p-8">
        <p className="font-medium">{error}</p>
        <Button variant="secondary" onClick={() => load(true)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <Spinner label="Loading conversation" className="size-5" />
      </div>
    );
  }

  const c = detail.conversation;
  const assignee = detail.team.find((t) => t.userId === c.assigneeId);
  const waiting = c.status === "queued" && c.handoffRequestedAt && !c.firstHumanResponseAt;
  const canReply = Boolean(isMember);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
          <button type="button" onClick={onBack} className="rounded p-1 text-muted hover:bg-wash lg:hidden" aria-label="Back to conversations">
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="type-heading truncate text-lg font-semibold">{detail.visitor.name}</h2>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {c.status === "ai" ? (
                <Badge tone="outline">
                  <Bot className="size-3" aria-hidden /> AI is handling this
                </Badge>
              ) : c.status === "queued" ? (
                <Badge tone="brass">Waiting for the team</Badge>
              ) : c.status === "assigned" ? (
                <Badge>{assignee ? (assignee.userId === me.userId ? "Assigned to you" : `Assigned to ${assignee.name}`) : "Assigned"}</Badge>
              ) : (
                <Badge tone="fern">Resolved</Badge>
              )}
              {waiting ? <SlaChip since={c.handoffRequestedAt!} /> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {c.status !== "resolved" && !c.assigneeId ? (
              <Button size="sm" onClick={() => act("claim", "claim")} loading={acting === "claim"}>
                <UserPlus className="size-4" aria-hidden />
                {c.status === "ai" ? "Take over from AI" : "Claim"}
              </Button>
            ) : null}
            {c.status !== "resolved" ? (
              <label className="flex items-center gap-1">
                <span className="sr-only">Transfer to</span>
                <select
                  value={transferTo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTransferTo("");
                    if (v) void act("transfer", "transfer", { userId: v });
                  }}
                  disabled={acting !== null}
                  className="h-8 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2 text-sm"
                  aria-label="Transfer conversation"
                >
                  <option value="">{c.assigneeId ? "Transfer to…" : "Assign to…"}</option>
                  {detail.team
                    .filter((t) => t.userId !== c.assigneeId)
                    .map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.userId === me.userId ? `${t.name} (you)` : t.name}
                        {t.availability === "away" ? " (away)" : ""}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            {c.status !== "resolved" ? (
              <Button size="sm" variant="secondary" onClick={() => act("resolve", "resolve")} loading={acting === "resolve"}>
                <CheckCircle2 className="size-4" aria-hidden /> Resolve
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => act("reopen", "reopen")} loading={acting === "reopen"}>
                <RotateCcw className="size-4" aria-hidden /> Reopen
              </Button>
            )}
            <Button size="sm" variant="quiet" onClick={() => setShowPanel((s) => !s)} className="xl:hidden" aria-label="Show customer details" aria-expanded={showPanel}>
              <PanelRight className="size-4" />
            </Button>
          </div>
        </header>
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-canvas"
        >
          <Transcript
            items={items}
            notes={notes}
            slug={slug}
            seenIds={seen}
            csat={csat}
            typing={typing}
            visitorName={detail.visitor.name}
            onRetry={(it) => (it.localFile ? deliverFile(it.localFile, it.key) : deliverText(it.body, it.key))}
          />
        </div>
        <Composer
          conversationId={conversationId}
          canReply={canReply}
          disabledReason={
            c.status === "resolved"
              ? "This conversation is resolved. Reopen it to reply."
              : c.assigneeId && c.assigneeId !== me.userId
                ? `${assignee?.name ?? "A teammate"} is handling this. Transfer it to yourself to reply, or leave a note.`
                : "Claim the conversation to reply. You'll join the chat and the customer will see you arrive."
          }
          onSendText={(t) => deliverText(t)}
          onSendFile={(f) => deliverFile(f)}
          onNote={async (text) => {
            const res = await api<{ note: NoteRow }>(`/api/inbox/${conversationId}/notes`, { body: { text } });
            setNotes((prev) => (prev.some((n) => n.id === res.note.id) ? prev : [...prev, res.note]));
          }}
          onTyping={() => channelId && void sendTyping(channelId, { name: me.name, role: "agent" })}
        />
      </div>
      <aside
        className={cn(
          "scrollbar-thin w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface",
          showPanel ? "fixed inset-y-0 right-0 z-30 block shadow-xl xl:static xl:shadow-none" : "hidden xl:block",
        )}
        aria-label="Customer details"
      >
        {showPanel ? (
          <div className="flex justify-end px-3 pt-3 xl:hidden">
            <Button size="sm" variant="quiet" onClick={() => setShowPanel(false)}>
              Close
            </Button>
          </div>
        ) : null}
        <CustomerPanel detail={detail} onOpen={onOpen} />
      </aside>
    </div>
  );
}
