"use client";
import { MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLatest } from "@/lib/use-latest";
import { EmptyState } from "@/components/ui/misc";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { clearUnread, connectionState, subscribe, unreadByChannel } from "@/lib/nexconn/client";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";
import type { Counts, ListItem, Queue } from "./types";

type Me = { userId: string; nexconnId: string; name: string };

export function Inbox({
  me,
  botUserId,
  slug,
  initialQueue,
  initialSelected,
  hasKnowledge,
}: {
  me: Me;
  botUserId: string;
  slug: string;
  initialQueue: Queue;
  initialSelected: string | null;
  hasKnowledge: boolean;
}) {
  const [queue, setQueue] = useState<Queue>(initialQueue);
  const [items, setItems] = useState<ListItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const queueRef = useLatest(queue);
  const selectedRef = useLatest(selected);
  const itemsRef = useLatest(items);
  const searchRef = useLatest(search);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const q = queueRef.current;
      const s = searchRef.current.trim();
      const res = await api<{ conversations: ListItem[]; counts: Counts }>(`/api/inbox?queue=${q}${s ? `&q=${encodeURIComponent(s)}` : ""}`);
      if (q !== queueRef.current) return;
      setItems(res.conversations);
      setCounts(res.counts);
    } catch {
      /* keep the current list; the next event or poll retries */
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void fetchList(), 350);
  }, [fetchList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the loading state while the new queue is fetched
    setLoading(true);
    void fetchList();
  }, [queue, fetchList]);

  useEffect(() => {
    const t = setTimeout(() => void fetchList(), 250);
    return () => clearTimeout(t);
  }, [search, fetchList]);

  // Safety net: refresh periodically in case a live event was missed.
  useEffect(() => {
    const id = setInterval(() => void fetchList(), 30_000);
    return () => clearInterval(id);
  }, [fetchList]);

  // Live inbox: staff-channel events, Nexconn unread counts, reconnect resync.
  useEffect(() => {
    const loadUnread = () =>
      unreadByChannel()
        .then((u) => setUnread(u))
        .catch(() => undefined);
    if (connectionState() === "connected") void loadUnread();
    return subscribe({
      onState: (s) => {
        if (s === "connected") void loadUnread();
      },
      onInbox: (e) => {
        if (e.kind === "conversation" || e.kind === "presence") scheduleRefresh();
        if (e.kind === "conversation" && e.conversationId === selectedRef.current) setRefreshKey((k) => k + 1);
      },
      onMessage: (m) => {
        if (m.senderId === me.nexconnId || m.type === "note") return;
        const open = itemsRef.current.find((i) => i.id === selectedRef.current);
        if (open && open.channelId === m.channelId && document.visibilityState === "visible") return;
        if (m.type === "text" || m.type === "image" || m.type === "file" || m.type === "csat") {
          setUnread((u) => ({ ...u, [m.channelId]: (u[m.channelId] ?? 0) + 1 }));
        }
        scheduleRefresh();
      },
      onResync: () => {
        void fetchList();
        void loadUnread();
      },
    });
  }, [me.nexconnId, scheduleRefresh, fetchList]);

  function updateUrl(q: Queue, c: string | null) {
    const params = new URLSearchParams();
    params.set("queue", q);
    if (c) params.set("c", c);
    window.history.replaceState(null, "", `/app/inbox?${params.toString()}`);
  }

  function select(id: string) {
    setSelected(id);
    updateUrl(queueRef.current, id);
    const item = itemsRef.current.find((i) => i.id === id);
    if (item) {
      setUnread((u) => ({ ...u, [item.channelId]: 0 }));
      void clearUnread(item.channelId);
    }
  }

  function changeQueue(q: Queue) {
    setQueue(q);
    updateUrl(q, selectedRef.current);
  }

  return (
    <div className="grid h-full min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section
        aria-label="Conversation list"
        className={cn("flex h-full min-h-0 flex-col border-r border-line bg-surface", selected ? "hidden lg:flex" : "flex")}
       
      >
        {!hasKnowledge ? (
          <Link href="/app/knowledge" className="block border-b border-line bg-brass-wash px-3 py-2 text-sm">
            <span className="font-medium">Add knowledge</span> so the assistant can answer. Until then, every question comes to your team.
          </Link>
        ) : null}
        <ConversationList
          queue={queue}
          onQueue={changeQueue}
          counts={counts}
          items={items}
          loading={loading}
          selectedId={selected}
          onSelect={select}
          unread={unread}
          meId={me.userId}
          search={search}
          onSearch={setSearch}
        />
      </section>
      <section aria-label="Conversation" className={cn("h-full min-h-0", selected ? "block" : "hidden lg:block")}>
        {selected ? (
          <ConversationView
            key={selected}
            conversationId={selected}
            me={me}
            botUserId={botUserId}
            slug={slug}
            refreshKey={refreshKey}
            onChanged={scheduleRefresh}
            onBack={() => {
              setSelected(null);
              updateUrl(queueRef.current, null);
            }}
            onOpen={select}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={MessagesSquare} title="Pick a conversation">
              New conversations and replies appear here live. Waiting customers are marked with a timer.
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
