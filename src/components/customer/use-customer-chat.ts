"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "@/lib/use-latest";
import { ApiError, errorMessage } from "@/lib/api-client";
import {
  connectChat,
  loadHistory,
  markRead,
  sendMedia,
  sendText,
  sendTyping,
  subscribe,
  type ChatMessage,
  type ConnectionState,
} from "@/lib/nexconn/client";

export type PublicWorkspace = {
  slug: string;
  name: string;
  brandColor: string;
  logoUrl: string | null;
  greeting: string;
  botName: string;
  botUserId: string;
  aiEnabled: boolean;
};

type Identity = { credential: string; visitorId: string; name: string; email: string | null; nexconnUserId: string };
type ConversationSummary = { id: string; channelId: string; status: "ai" | "queued" | "assigned" | "resolved"; csatMessageId: string | null };

export type UiMessage = ChatMessage & { mine: boolean; localKey?: string };

type MirroredMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  kind: "text" | "image" | "file" | "event" | "csat";
  text: string;
  attachment: { url: string; name: string; size?: number } | null;
  sources: { articleId: string; title: string; isPublic: boolean }[];
  sentTime: number;
};

/** System lines are mirrored as text only; recover the bits the chat uses (who joined, no agents). */
function eventFromText(text: string, conversationId: string): NonNullable<ChatMessage["event"]> {
  const joined = /^(.+) joined the conversation$/.exec(text);
  if (joined) return { kind: "agent_joined", text, actorName: joined[1], conversationId };
  const moved = / transferred the conversation to (.+)$/.exec(text);
  if (moved) return { kind: "transferred", text, actorName: moved[1], conversationId };
  if (text.startsWith("No one from the team is online")) return { kind: "no_agents", text, conversationId };
  return { kind: "started", text, conversationId };
}

/** Maps the server's mirrored transcript into chat messages (used when Nexconn has no history). */
function fromMirror(rows: MirroredMessage[], conv: { id: string; channelId: string }, csat: { rating: number | null }, me: string | undefined): UiMessage[] {
  return rows.map((r): UiMessage => {
    const base = { id: r.id, channelId: conv.channelId, senderId: r.senderId, senderName: r.senderName, text: r.text, sentTime: r.sentTime, status: "sent" as const, mine: r.senderId === me, metadata: {} as Record<string, string> };
    if (r.kind === "image" && r.attachment) return { ...base, type: "image", image: { url: r.attachment.url, name: r.attachment.name } };
    if (r.kind === "file" && r.attachment) return { ...base, type: "file", file: { url: r.attachment.url, name: r.attachment.name, size: r.attachment.size } };
    if (r.kind === "event") return { ...base, type: "event", event: eventFromText(r.text, conv.id) };
    if (r.kind === "csat") {
      const metadata: Record<string, string> = csat.rating ? { state: "done", rating: String(csat.rating) } : { state: "pending" };
      return { ...base, type: "csat", metadata };
    }
    const metadata: Record<string, string> = r.sources.length ? { answer: "done", sources: JSON.stringify(r.sources) } : {};
    return { ...base, type: "text", metadata };
  });
}

const memoryStore = new Map<string, string>();
function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}
function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    if (value === null) memoryStore.delete(key);
    else memoryStore.set(key, value);
  }
}

async function call<T>(path: string, credential: string | null, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(credential ? { Authorization: `Bearer ${credential}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("You're offline. Check your connection.", 0, "network");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code);
  return data;
}

/**
 * All customer-side chat state: persisted identity, Nexconn connection, the current conversation,
 * history pagination, optimistic sends with retry, streaming AI replies, typing, read state, CSAT.
 */
export function useCustomerChat(workspace: PublicWorkspace, context: { pageUrl: string | null; pageTitle: string | null; source: "widget" | "page" }) {
  const storageKey = `helpdesk-ai:v1:${workspace.slug}`;
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [booting, setBooting] = useState(true);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [typing, setTyping] = useState<{ name: string; role: string } | null>(null);
  const [awaitingAi, setAwaitingAi] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [unseenCount, setUnseenCount] = useState(0);
  const visibleRef = useRef(true);
  const convRef = useLatest<ConversationSummary | null>(conversation);
  const identityRef = useLatest<Identity | null>(identity);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsert = useCallback((m: UiMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((p) => p.id === m.id || (m.localKey && p.localKey === m.localKey));
      if (i >= 0) {
        const next = [...prev];
        const merged = { ...prev[i], ...m, text: m.text || prev[i].text, metadata: { ...prev[i].metadata, ...m.metadata } };
        next[i] = merged;
        return next;
      }
      return [...prev, m].sort((a, b) => a.sentTime - b.sentTime);
    });
  }, []);

  const connect = useCallback(async (id: Identity) => {
    await connectChat(async () => {
      const s = await call<{ appKey: string; token: string; userId: string }>("/api/widget/chat-session", id.credential, { body: {} });
      return { appKey: s.appKey, token: s.token, userId: s.userId };
    });
  }, []);

  const openConversation = useCallback(async (conv: ConversationSummary) => {
    setConversation(conv);
    setMessages([]);
    try {
      const page = await loadHistory(conv.channelId, Date.now(), 30);
      const me = identityRef.current;
      if (page.messages.length === 0 && me) {
        // Nexconn has no history for this conversation (it predates the current Nexconn app):
        // show the transcript the server kept instead.
        const mirror = await call<{ messages: MirroredMessage[]; csat: { rating: number | null } }>(
          `/api/widget/conversations/${conv.id}/messages`,
          me.credential,
        ).catch(() => null);
        if (mirror?.messages.length) {
          setMessages(fromMirror(mirror.messages, conv, mirror.csat, me.nexconnUserId));
          setHasMore(false);
          return;
        }
      }
      setMessages(page.messages.map((m) => ({ ...m, mine: m.senderId === identityRef.current?.nexconnUserId })));
      setHasMore(page.hasMore);
    } catch {
      setError("Couldn't load earlier messages. They'll appear when the connection recovers.");
    }
  }, []);

  // Boot: restore identity, connect, open the latest conversation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = storageGet(storageKey);
      if (!raw) {
        setBooting(false);
        return;
      }
      try {
        const saved = JSON.parse(raw) as { credential: string };
        const me = await call<{
          visitor: { id: string; name: string; email: string | null; nexconnUserId: string };
          conversations: ConversationSummary[];
        }>("/api/widget/me", saved.credential);
        if (cancelled) return;
        const id: Identity = { credential: saved.credential, visitorId: me.visitor.id, name: me.visitor.name, email: me.visitor.email, nexconnUserId: me.visitor.nexconnUserId };
        setIdentity(id);
        await connect(id);
        const latest = me.conversations[0];
        if (latest && !cancelled) await openConversation(latest);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) storageSet(storageKey, null);
        else setError(errorMessage(err));
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, connect, openConversation]);

  // Live Nexconn events for the open conversation.
  useEffect(() => {
    return subscribe({
      onState: (s) => setConnection(s),
      onMessage: (m) => {
        const conv = convRef.current;
        if (!conv || m.channelId !== conv.channelId || m.type === "note" || m.type === "other") return;
        const mine = m.senderId === identityRef.current?.nexconnUserId;
        upsert({ ...m, mine });
        if (!mine) {
          setTyping(null);
          if (m.senderId === workspace.botUserId && (m.type === "stream" || m.type === "text")) setAwaitingAi(false);
          if (m.type === "event") {
            const kind = m.event?.kind;
            if (kind === "agent_joined" || kind === "transferred") setConversation((c) => (c ? { ...c, status: "assigned" } : c));
            if (kind === "handoff_requested" || kind === "no_agents") setConversation((c) => (c ? { ...c, status: "queued" } : c));
            if (kind === "resolved") setConversation((c) => (c ? { ...c, status: "resolved" } : c));
            if (kind === "reopened") setConversation((c) => (c && c.status === "resolved" ? { ...c, status: "ai" } : c));
            if (kind === "handoff_requested") setAwaitingAi(false);
          }
          if (m.type === "csat") setConversation((c) => (c ? { ...c, status: "resolved", csatMessageId: m.id } : c));
          if (!visibleRef.current) setUnseenCount((n) => n + 1);
        }
      },
      onUpdate: (id, patch) => {
        setMessages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, text: patch.text ?? p.text } : p)));
        if (patch.text) setAwaitingAi(false);
      },
      onMetadata: (id, channelId, md) => {
        if (channelId !== convRef.current?.channelId) return;
        setMessages((prev) => prev.map((p) => (p.id === id ? { ...p, metadata: { ...p.metadata, ...md } } : p)));
      },
      onReceipt: (channelId, ids) => {
        if (channelId !== convRef.current?.channelId) return;
        setSeen((s) => new Set([...s, ...ids]));
      },
      onTyping: (channelId, userId, info) => {
        if (channelId !== convRef.current?.channelId || userId === identityRef.current?.nexconnUserId) return;
        setTyping({ name: info.role === "ai" ? workspace.botName : info.name, role: info.role });
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 6000);
      },
      onResync: async () => {
        const conv = convRef.current;
        if (!conv) return;
        try {
          const page = await loadHistory(conv.channelId, Date.now(), 30);
          for (const m of page.messages) upsert({ ...m, mine: m.senderId === identityRef.current?.nexconnUserId });
        } catch {
          /* next resync retries */
        }
      },
    });
  }, [upsert, workspace.botUserId, workspace.botName]);

  // Read receipts for incoming messages while visible.
  useEffect(() => {
    const conv = conversation;
    if (!conv || !visibleRef.current || connection !== "connected") return;
    const ids = messages.filter((m) => !m.mine && m.status === "sent" && m.id && !m.id.startsWith("local-")).map((m) => m.id);
    if (ids.length) void markRead(conv.channelId, ids.slice(-20));
  }, [messages, conversation, connection]);

  const setVisible = useCallback((visible: boolean) => {
    visibleRef.current = visible;
    if (visible) setUnseenCount(0);
  }, []);

  const register = useCallback(
    async (name: string, email: string) => {
      const res = await call<{ credential: string; visitor: { id: string; name: string; email: string | null; nexconnUserId: string } }>(
        `/api/widget/${workspace.slug}/visitor`,
        null,
        { body: { name, email } },
      );
      storageSet(storageKey, JSON.stringify({ credential: res.credential }));
      const id: Identity = { credential: res.credential, visitorId: res.visitor.id, name: res.visitor.name, email: res.visitor.email, nexconnUserId: res.visitor.nexconnUserId };
      setIdentity(id);
      await connect(id);
      return id;
    },
    [workspace.slug, storageKey, connect],
  );

  const ensureConversation = useCallback(async (): Promise<ConversationSummary> => {
    if (convRef.current) return convRef.current;
    const id = identityRef.current;
    if (!id) throw new Error("Introduce yourself first");
    const res = await call<{ conversation: ConversationSummary }>("/api/widget/conversations", id.credential, {
      body: { pageUrl: context.pageUrl, pageTitle: context.pageTitle, source: context.source },
    });
    const conv = { ...res.conversation, csatMessageId: null };
    setConversation(conv);
    convRef.current = conv;
    return conv;
  }, [context.pageUrl, context.pageTitle, context.source]);

  const recordAndMaybeAwait = useCallback(async (conv: ConversationSummary, body: unknown) => {
    const id = identityRef.current!;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await call<{ status: ConversationSummary["status"]; aiWillReply: boolean }>(`/api/widget/conversations/${conv.id}/messages`, id.credential, { body });
        setConversation((c) => (c ? { ...c, status: res.status } : c));
        if (res.aiWillReply) {
          setAwaitingAi(true);
          if (aiTimer.current) clearTimeout(aiTimer.current);
          aiTimer.current = setTimeout(() => setAwaitingAi(false), 45_000);
        }
        return;
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }, []);

  const send = useCallback(
    async (text: string, retryKey?: string) => {
      const id = identityRef.current;
      if (!id) return;
      setError(null);
      const localKey = retryKey ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      upsert({ id: localKey, localKey, channelId: convRef.current?.channelId ?? "", senderId: id.nexconnUserId, type: "text", text, metadata: {}, sentTime: Date.now(), status: "sending", mine: true });
      try {
        const conv = await ensureConversation();
        if (connection !== "connected") await connect(id);
        const m = await sendText(conv.channelId, text);
        setMessages((prev) => prev.map((p) => (p.localKey === localKey ? { ...m, mine: true, localKey } : p)));
        await recordAndMaybeAwait(conv, { nexconnMessageId: m.id, kind: "text", text });
      } catch (err) {
        setMessages((prev) => prev.map((p) => (p.localKey === localKey ? { ...p, status: "failed" } : p)));
        if (err instanceof ApiError) setError(err.message);
      }
    },
    [upsert, ensureConversation, recordAndMaybeAwait, connection, connect],
  );

  const sendFile = useCallback(
    async (file: File, retryKey?: string) => {
      const id = identityRef.current;
      if (!id) return;
      if (file.size > 20 * 1024 * 1024) {
        setError("Files can be up to 20 MB.");
        return;
      }
      const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(file.type);
      const localKey = retryKey ?? `local-${Date.now()}`;
      upsert({
        id: localKey,
        localKey,
        channelId: convRef.current?.channelId ?? "",
        senderId: id.nexconnUserId,
        type: isImage ? "image" : "file",
        text: "",
        image: isImage ? { url: URL.createObjectURL(file), name: file.name } : undefined,
        file: isImage ? undefined : { url: "#", name: file.name, size: file.size },
        metadata: {},
        sentTime: Date.now(),
        status: "sending",
        progress: 0,
        localFile: file,
        mine: true,
      });
      try {
        const conv = await ensureConversation();
        const m = await sendMedia(conv.channelId, file, (p) => setMessages((prev) => prev.map((x) => (x.localKey === localKey ? { ...x, progress: p } : x))));
        setMessages((prev) => prev.map((p) => (p.localKey === localKey ? { ...m, mine: true, localKey } : p)));
        const url = m.image?.url ?? m.file?.url ?? "";
        await recordAndMaybeAwait(conv, { nexconnMessageId: m.id, kind: isImage ? "image" : "file", text: "", attachment: { url, name: file.name, size: file.size, mime: file.type || undefined } });
      } catch (err) {
        setMessages((prev) => prev.map((p) => (p.localKey === localKey ? { ...p, status: "failed" } : p)));
        setError(errorMessage(err));
      }
    },
    [upsert, ensureConversation, recordAndMaybeAwait],
  );

  const retry = useCallback(
    (m: UiMessage) => {
      if (m.localFile) void sendFile(m.localFile, m.localKey);
      else void send(m.text, m.localKey);
    },
    [send, sendFile],
  );

  const loadOlder = useCallback(async () => {
    const conv = convRef.current;
    if (!conv || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const oldest = messages.find((m) => m.status === "sent");
      const page = await loadHistory(conv.channelId, oldest ? oldest.sentTime : Date.now(), 30);
      setMessages((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const older = page.messages.filter((m) => !ids.has(m.id)).map((m) => ({ ...m, mine: m.senderId === identityRef.current?.nexconnUserId }));
        return [...older, ...prev];
      });
      setHasMore(page.hasMore);
    } catch {
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages]);

  const askHuman = useCallback(async () => {
    const id = identityRef.current;
    if (!id) return;
    setError(null);
    try {
      const conv = await ensureConversation();
      const res = await call<{ status: ConversationSummary["status"] }>(`/api/widget/conversations/${conv.id}/handoff`, id.credential, { body: {} });
      setConversation((c) => (c ? { ...c, status: res.status } : c));
      setAwaitingAi(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [ensureConversation]);

  const markHelpful = useCallback(async (messageId: string) => {
    const id = identityRef.current;
    const conv = convRef.current;
    if (!id || !conv) return;
    setMessages((prev) => prev.map((p) => (p.id === messageId ? { ...p, metadata: { ...p.metadata, feedback: "helpful" } } : p)));
    try {
      await call(`/api/widget/conversations/${conv.id}/helpful`, id.credential, { body: { messageId } });
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const rate = useCallback(async (messageId: string, rating: number, comment: string) => {
    const id = identityRef.current;
    const conv = convRef.current;
    if (!id || !conv) return;
    await call(`/api/widget/conversations/${conv.id}/csat`, id.credential, { body: { rating, comment: comment || undefined } });
    setMessages((prev) => prev.map((p) => (p.id === messageId ? { ...p, metadata: { ...p.metadata, state: "done", rating: String(rating), comment } } : p)));
  }, []);

  const saveEmail = useCallback(async (email: string) => {
    const id = identityRef.current;
    if (!id) return;
    const res = await call<{ visitor: { email: string | null } }>("/api/widget/me", id.credential, { method: "PATCH", body: { email } });
    setIdentity({ ...id, email: res.visitor.email });
  }, []);

  const startNew = useCallback(() => {
    setConversation(null);
    convRef.current = null;
    setMessages([]);
    setHasMore(false);
    setAwaitingAi(false);
  }, []);

  const notifyTyping = useCallback(() => {
    const conv = convRef.current;
    const id = identityRef.current;
    if (conv && id && connection === "connected") void sendTyping(conv.channelId, { name: id.name, role: "visitor" });
  }, [connection]);

  return {
    identity,
    booting,
    conversation,
    messages,
    hasMore,
    loadingOlder,
    connection,
    typing,
    awaitingAi,
    seen,
    error,
    unseenCount,
    setError,
    setVisible,
    register,
    send,
    sendFile,
    retry,
    loadOlder,
    askHuman,
    markHelpful,
    rate,
    saveEmail,
    startNew,
    notifyTyping,
  };
}

export type CustomerChatState = ReturnType<typeof useCustomerChat>;
