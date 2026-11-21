"use client";
import { Bot, Inbox as InboxIcon, Search, Star } from "lucide-react";
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
        "type-figures inline-flex h-5 items-center rounded-full px-1.5 text-xs font-semibold",
        level === "breach" ? "bg-brass text-ink" : level === "warn" ? "bg-brass-wash text-ink" : "bg-wash text-muted",
      )}
      title="Time waiting for a first reply from the team"
      aria-label={`Waiting ${formatClock(wait)}`}
    >
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
      <div className="border-b border-line px-3 pt-3">
        <div role="tablist" aria-label="Queues" className="flex gap-0.5 overflow-x-auto">
          {QUEUE_LABELS.map((q) => (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={queue === q.id}
              onClick={() => onQueue(q.id)}
              className={cn(
                "flex shrink-0 items-center gap-1 border-b-2 px-1.5 pb-2 text-sm font-medium",
                queue === q.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {q.label}
              {counts ? (
                <span
                  className={cn(
                    "type-figures rounded-full px-1.5 text-xs",
                    q.id === "unassigned" && counts.unassigned > 0 ? "bg-brass text-ink" : "bg-wash text-muted",
                  )}
                >
                  {counts[q.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="border-b border-line px-3 py-2">
        <label className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-2.5 focus-within:border-enamel">
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
                  "flex w-full flex-col gap-1 border-b border-line px-3 py-3 text-left transition-colors",
                  selectedId === item.id ? "bg-wash" : "hover:bg-wash/60",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", unreadCount ? "font-bold" : "font-semibold")}>{item.visitorName}</span>
                  {unreadCount > 0 ? (
                    <span className="type-figures min-w-5 rounded-full bg-enamel px-1.5 text-center text-xs font-semibold text-white" aria-label={`${unreadCount} unread`}>
                      {unreadCount}
                    </span>
                  ) : null}
                  <span className="type-figures shrink-0 text-xs text-faint">{formatRelative(item.lastMessageAt)}</span>
                </span>
                <span className="line-clamp-2 text-sm text-muted">
                  {item.lastMessageSender === "agent" ? "Team: " : item.lastMessageSender === "ai" ? "AI: " : ""}
                  {item.lastMessagePreview ?? item.subject ?? "No messages yet"}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {waiting ? <SlaChip since={item.handoffRequestedAt!} /> : null}
                  <StatusBadge item={item} meId={meId} />
                  {item.csatRating ? (
                    <Badge tone="outline">
                      <Star className="size-3" aria-hidden /> {item.csatRating}/5
                    </Badge>
                  ) : null}
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
