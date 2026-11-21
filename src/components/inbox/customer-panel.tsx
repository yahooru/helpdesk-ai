"use client";
import { ExternalLink, Mail, MonitorSmartphone, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/misc";
import { formatDateTime, formatDuration } from "@/lib/time";
import type { Detail } from "./types";

const REASONS: Record<string, string> = {
  customer_button: "Customer pressed Talk to a person",
  customer_intent: "Customer asked for a person",
  no_answer: "Assistant couldn't find an answer",
  ai_disabled: "Assistant is turned off",
  ai_error: "Assistant was unavailable",
};

export function CustomerPanel({ detail, onOpen }: { detail: Detail; onOpen: (id: string) => void }) {
  const { visitor, conversation, past } = detail;
  const firstResponse =
    conversation.handoffRequestedAt && conversation.firstHumanResponseAt
      ? new Date(conversation.firstHumanResponseAt).getTime() - new Date(conversation.handoffRequestedAt).getTime()
      : null;
  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <section className="flex items-center gap-3">
        <Avatar name={visitor.name} size={40} tone="wash" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{visitor.name}</p>
          {visitor.email ? (
            <a href={`mailto:${visitor.email}`} className="flex items-center gap-1 truncate text-sm text-ledger hover:underline">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              {visitor.email}
            </a>
          ) : (
            <p className="text-sm text-muted">No email given</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted">Came from</h3>
        {conversation.pageUrl ? (
          <a href={conversation.pageUrl} target="_blank" rel="noreferrer noopener" className="group flex items-start gap-1.5 text-sm">
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-medium group-hover:underline">{conversation.pageTitle || conversation.pageUrl}</span>
              <span className="block truncate text-xs text-muted">{conversation.pageUrl}</span>
            </span>
          </a>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MonitorSmartphone className="size-3.5" aria-hidden />
            {conversation.source === "page" ? "Hosted support page" : "Page not shared"}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted">This conversation</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted">Started</dt>
          <dd>{formatDateTime(conversation.createdAt)}</dd>
          <dt className="text-muted">AI replies</dt>
          <dd className="type-figures">{conversation.aiReplyCount}</dd>
          {conversation.handoffReason ? (
            <>
              <dt className="text-muted">Handoff</dt>
              <dd>{REASONS[conversation.handoffReason] ?? conversation.handoffReason}</dd>
            </>
          ) : null}
          {firstResponse != null ? (
            <>
              <dt className="text-muted">First reply</dt>
              <dd className="type-figures">{formatDuration(firstResponse)}</dd>
            </>
          ) : null}
          {conversation.csatRating ? (
            <>
              <dt className="text-muted">Rating</dt>
              <dd className="flex items-center gap-1">
                <Star className="size-3.5" aria-hidden />
                <span className="type-figures">{conversation.csatRating}/5</span>
              </dd>
            </>
          ) : null}
        </dl>
        {conversation.csatComment ? <p className="mt-2 text-sm text-muted">&ldquo;{conversation.csatComment}&rdquo;</p> : null}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted">Past conversations</h3>
        {past.length === 0 ? (
          <p className="text-sm text-muted">This is their first conversation.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {past.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onOpen(p.id)} className="w-full rounded-[var(--radius-control)] px-2 py-1.5 text-left hover:bg-wash">
                  <span className="block truncate text-sm">{p.subject ?? "No messages"}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {formatDateTime(p.createdAt)}
                    {p.status === "resolved" ? <Badge tone="ledger">Resolved</Badge> : <Badge>Open</Badge>}
                    {p.csatRating ? <span className="type-figures">{p.csatRating}/5</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
