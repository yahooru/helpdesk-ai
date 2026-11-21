"use client";
import { Bot, Inbox as InboxIcon, Search, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatClock, formatRelative, slaLevel } from "@/lib/time";
import { useNow } from "./hooks";
import type { Counts, ListItem, Queue } from "./types";

const QUEUE_LABELS: { id: Queue; label: string }[] = [
  { id: "unassigned", label: "Unassigned" },
  { id: "mine", label: "Mine" },
  { id: "open", label: "All open" },
  { id: "resolved", label: "Resolved" },
];

export function SlaChip({ since, compact }: { since: string; compact?: boolean }) {
  const now = useNow(1000);
  const wait = now - new Date(since).getTime();
  const level = slaLevel(wait);
  return (
    <span
      className={cn(
        "type-figures inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-semibold",
        level === "breach"
          ? "bg-brass text-ink"
          : level === "warn"
            ? "bg-brass-wash text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--brass)_55%,transparent)]"
            : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]",
      )}
      title="Time waiting for a first reply from the team"
      aria-label={`Waiting ${formatClock(wait)}`}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", level === "ok" ? "bg-brass" : "waiting-pulse bg-ink")} />
      {compact ? "" : "Waiting "}
      {formatClock(wait)}
    </span>
  );
}

function StatusBadge({ item, meId }: { item: ListItem; meId: string }) {
  if (item.status === "ai")
    return (
      <Badge tone="outline">
        <Bot className="size-3" aria-hidden /> AI
      </Badge>
    );
  if (item.status === "resolved") return <Badge tone="fern">Resolved</Badge>;
  if (item.assigneeId) return <Badge tone="neutral">{item.assigneeId === meId ? "You" : (item.assigneeName ?? "Assigned")}</Badge>;
  return null;
}

export function ConversationList({
  queue,
  onQueue,
  counts,
  items,
  loading,
  selectedId,
  onSelect,
  unread,
  meId,
  search,
  onSearch,
}: {
  queue: Queue;
  onQueue: (q: Queue) => void;
  counts: Counts | null;
  items: ListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  unread: Record<string, number>;
  meId: string;
  search: string;
  onSearch: (s: string) => void;
}) {
  useNow(30_000);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-4 pb-3">
        <h1 className="type-heading px-1 text-lg font-semibold">Inbox</h1>
        <div role="tablist" aria-label="Queues" className="mt-3 grid grid-cols-4 gap-1 rounded-[10px] bg-wash p-1 shadow-[inset_0_0_0_1px_var(--line)]">
          {QUEUE_LABELS.map((q) => {
            const selected = queue === q.id;
            const waiting = q.id === "unassigned" && (counts?.unassigned ?? 0) > 0;
            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onQueue(q.id)}
                className={cn(
                  "flex min-w-0 flex-col items-center rounded-[7px] px-1 py-1.5 transition-colors",
                  selected ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                <span className={cn("type-figures flex items-center gap-1 text-base leading-tight font-semibold", waiting ? "text-ink" : undefined)}>
                  {waiting ? <span aria-hidden className="waiting-pulse size-1.5 rounded-full bg-brass" /> : null}
                  {counts ? counts[q.id] : "0"}
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-b border-line px-3 pb-3">
        <label className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2.5 transition-[border-color,box-shadow] focus-within:border-enamel focus-within:shadow-[0_0_0_3px_var(--enamel-wash)]">
          <Search className="size-4 text-faint" aria-hidden />
          <span className="sr-only">Search conversations</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, email or topic"
            className="h-8 w-full bg-transparent text-sm focus:outline-none"
          />
        </label>
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto" aria-label="Conversations" aria-busy={loading}>
        {items.length === 0 && !loading ? (
          <li>
            <EmptyState icon={InboxIcon} title={emptyTitle(queue)}>
              {emptyBody(queue)}
            </EmptyState>
          </li>
        ) : null}
        {items.map((item) => {
          const unreadCount = unread[item.channelId] ?? 0;
          const waiting = item.status === "queued" && item.handoffRequestedAt && !item.firstHumanResponseAt;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selectedId === item.id ? "true" : undefined}
                data-conversation-id={item.id}
                className={cn(
                  "relative flex w-full gap-3 border-b border-line px-3 py-3 text-left transition-colors",
                  selectedId === item.id ? "bg-enamel-wash" : waiting ? "bg-brass-wash/40 hover:bg-brass-wash/70" : "hover:bg-wash",
                )}
              >
                {selectedId === item.id ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-enamel" /> : null}
                <Avatar name={item.visitorName} size={34} tone="wash" className="mt-0.5" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("min-w-0 flex-1 truncate text-sm", unreadCount ? "font-bold" : "font-semibold")}>{item.visitorName}</span>
                    {unreadCount > 0 ? (
                      <span className="type-figures min-w-5 rounded-full bg-enamel px-1.5 text-center text-xs font-semibold text-white" aria-label={`${unreadCount} unread`}>
                        {unreadCount}
                      </span>
                    ) : null}
                    <span className="type-figures shrink-0 text-xs text-faint">{formatRelative(item.lastMessageAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-snug text-muted">
                    {item.lastMessageSender === "agent" ? "Team: " : item.lastMessageSender === "ai" ? "AI: " : ""}
                    {item.lastMessagePreview ?? item.subject ?? "No messages yet"}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 empty:hidden">
                    {waiting ? <SlaChip since={item.handoffRequestedAt!} /> : null}
                    <StatusBadge item={item} meId={meId} />
                    {item.csatRating ? (
                      <Badge tone="outline">
                        <Star className="size-3" aria-hidden /> {item.csatRating}/5
                      </Badge>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function emptyTitle(q: Queue) {
  return q === "unassigned" ? "No one is waiting" : q === "mine" ? "Nothing assigned to you" : q === "open" ? "No open conversations" : "Nothing resolved yet";
}

function emptyBody(q: Queue) {
  return q === "unassigned"
    ? "When a customer asks for a person, or the assistant can't answer, the conversation shows up here."
    : q === "mine"
      ? "Claim a conversation from Unassigned, or turn on auto-assign in Settings."
      : q === "open"
        ? "Conversations the assistant is handling appear here too, so you can step in."
        : "Resolved conversations and their ratings collect here.";
}
