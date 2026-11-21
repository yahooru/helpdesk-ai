"use client";

/**
 * Browser wrapper around the Nexconn Chat SDK for Web (@nexconn/chat).
 * One connection per page: init once, register custom message types and handlers before connect,
 * fan events out to React subscribers, handle token refresh (31004), kicks (31010) and
 * reconnects (resync event so views refetch history and dedupe).
 */
import type { Message } from "@nexconn/chat";
import {
  HD_TYPES,
  NC_TYPES,
  type ConversationEventContent,
  type CsatContent,
  type InboxEventContent,
  type NoteContent,
  type StreamAnnounceContent,
  type TypingContent,
} from "./types";

type Sdk = typeof import("@nexconn/chat");

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "kicked" | "error";

export type ChatCredentials = { appKey: string; token: string; userId: string };

export type ChatMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  type: "text" | "image" | "file" | "stream" | "event" | "csat" | "note" | "other";
  text: string;
  image?: { url: string; thumb?: string; name?: string };
  file?: { url: string; name: string; size?: number; fileType?: string };
  event?: ConversationEventContent;
  csat?: CsatContent;
  note?: NoteContent;
  metadata: Record<string, string>;
  sentTime: number;
  status: "sending" | "sent" | "failed";
  streaming?: boolean;
  needReceipt?: boolean;
  progress?: number;
  localFile?: File;
};

export type ChatListener = {
  onMessage?(m: ChatMessage): void;
  onUpdate?(id: string, patch: Partial<ChatMessage>): void;
  onMetadata?(id: string, channelId: string, metadata: Record<string, string>): void;
  onReceipt?(channelId: string, messageIds: string[], readerIds: string[]): void;
  onTyping?(channelId: string, userId: string, info: TypingContent): void;
  onInbox?(event: InboxEventContent): void;
  onState?(state: ConnectionState, code?: number): void;
  onResync?(): void;
};

const listeners = new Set<ChatListener>();
let sdk: Sdk | null = null;
let initializedKey: string | null = null;
let state: ConnectionState = "idle";
let currentUserId: string | null = null;
let credentialFetcher: ((refresh: boolean) => Promise<ChatCredentials>) | null = null;
let connectPromise: Promise<void> | null = null;
let hadConnected = false;
const streamText = new Map<string, string>();
// Metadata updates can arrive before a message is known to the UI (fast AI streams); keep them.
const metadataCache = new Map<string, Record<string, string>>();

function emit<K extends keyof ChatListener>(key: K, ...args: Parameters<NonNullable<ChatListener[K]>>) {
  for (const l of listeners) {
    const fn = l[key] as ((...a: unknown[]) => void) | undefined;
    try {
      fn?.(...args);
    } catch (err) {
      console.error("[chat] listener failed", err);
    }
  }
}

function setState(next: ConnectionState, code?: number) {
  const prev = state;
  state = next;
  emit("onState", next, code);
  if (next === "connected" && hadConnected && prev !== "connected") emit("onResync");
  if (next === "connected") hadConnected = true;
}

export function subscribe(listener: ChatListener): () => void {
  listeners.add(listener);
  listener.onState?.(state);
  return () => listeners.delete(listener);
}

export function connectionState() {
  return state;
}

export function myUserId() {
  return currentUserId;
}

function metadataOf(m: Message): Record<string, string> {
  const out: Record<string, string> = {};
  const md = m.metadata as unknown;
  if (md instanceof Map) md.forEach((v, k) => (out[String(k)] = String(v)));
  else if (md && typeof md === "object") Object.assign(out, md as Record<string, string>);
  const cached = metadataCache.get(m.messageId);
  return cached ? { ...out, ...cached } : out;
}

/** Nexconn writes RC_Ext_StreamMsgSummary metadata ({complete, summary}) when a stream ends. */
export function streamSummary(metadata: Record<string, string>): { complete: boolean; summary: string } | null {
  const raw = metadata.RC_Ext_StreamMsgSummary;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { complete?: boolean; summary?: string };
    return { complete: Boolean(v.complete), summary: String(v.summary ?? "") };
  } catch {
    return null;
  }
}

/** Converts an SDK Message into the UI model. */
export function normalize(m: Message): ChatMessage {
  const c = (m.content ?? {}) as Record<string, unknown>;
  const metadata = metadataOf(m);
  const senderInfo = c.senderUserInfo as { name?: string } | undefined;
  const base = {
    id: m.messageId,
    senderName: senderInfo?.name || undefined,
    channelId: m.channelIdentifier?.channelId ?? "",
    senderId: m.senderUserId,
    metadata,
    sentTime: m.sentTime,
    status: "sent" as const,
    needReceipt: m.needReceipt,
  };
  switch (m.messageType) {
    case NC_TYPES.text:
      return { ...base, type: "text", text: String(c.text ?? c.content ?? "") };
    case NC_TYPES.image:
      return {
        ...base,
        type: "image",
        text: "",
        image: { url: String(c.remoteUrl ?? c.imageUri ?? ""), thumb: c.thumbnailBase64 ? `data:image/jpeg;base64,${c.thumbnailBase64}` : undefined, name: c.name ? String(c.name) : undefined },
      };
    case NC_TYPES.file:
      return {
        ...base,
        type: "file",
        text: "",
        file: { url: String(c.remoteUrl ?? c.fileUrl ?? ""), name: String(c.name ?? "File"), size: Number(c.size ?? 0) || undefined, fileType: String(c.fileType ?? c.type ?? "") },
      };
    case NC_TYPES.stream: {
      const initial = String(c.content ?? "");
      const known = streamText.get(m.messageId);
      const summary = streamSummary(metadata);
      const final = metadata.text || summary?.summary;
      const text = final && final.length >= (known?.length ?? 0) ? final : known && known.length > initial.length ? known : initial;
      const completed = Boolean(c.isCompleted ?? c.complete) || metadata.answer === "done" || Boolean(summary?.complete);
      return { ...base, type: "stream", text, streaming: !completed };
    }
    case HD_TYPES.event:
      return { ...base, type: "event", text: String(c.text ?? ""), event: c as unknown as ConversationEventContent };
    case HD_TYPES.csat:
      return { ...base, type: "csat", text: String(c.prompt ?? ""), csat: c as unknown as CsatContent };
    case HD_TYPES.note:
      return { ...base, type: "note", text: String(c.text ?? ""), note: c as unknown as NoteContent };
    default:
      return { ...base, type: "other", text: "" };
  }
}

function registerHandlers(s: Sdk) {
  const { NCEngine, ConnectionStatusHandler, MessageHandler, ConnectionStatus } = s;
  NCEngine.addConnectionStatusHandler(
    "hd-conn",
    new ConnectionStatusHandler({
      onConnectionStatusChanged({ status, code }) {
        if (status === ConnectionStatus.CONNECTED) setState("connected");
        else if (status === ConnectionStatus.CONNECTING) setState(hadConnected ? "reconnecting" : "connecting");
        else if (status === ConnectionStatus.SUSPENDED) setState("reconnecting", code);
        else if (status === ConnectionStatus.DISCONNECTED) {
          if (code === 31010) setState("kicked", code);
          else if (code === 31004) void reconnectWithFreshToken();
          else if (code === 33007) void manualReconnect();
          else setState(hadConnected ? "reconnecting" : "offline", code);
        }
      },
    }),
  );

  NCEngine.addMessageHandler(
    "hd-msg",
    new MessageHandler({
      onMessageReceived({ messages }) {
        for (const m of messages) {
          if (m.messageType === HD_TYPES.typing) {
            const info = m.content as TypingContent;
            emit("onTyping", m.channelIdentifier.channelId, m.senderUserId, info);
            continue;
          }
          if (m.messageType === HD_TYPES.inbox) {
            emit("onInbox", m.content as InboxEventContent);
            continue;
          }
          if (m.messageType === HD_TYPES.stream) {
            void attachStream(s, m.channelIdentifier.channelId, (m.content as StreamAnnounceContent).messageId);
            continue;
          }
          const normalized = normalize(m);
          emit("onMessage", normalized);
          if (m.messageType === NC_TYPES.stream && normalized.streaming) {
            // Ask the server for the rest of the stream; chunks arrive via onStreamMessageRequestDelta.
            void m.requestStreamMessage().catch(() => undefined);
          }
        }
      },
      onMessagesUpdated({ messages }) {
        for (const m of messages) {
          const n = normalize(m);
          emit("onUpdate", n.id, { text: n.text, metadata: n.metadata, streaming: n.streaming });
        }
      },
      onMessageMetadataUpdated(event) {
        const md = { ...(event.metadata ?? {}) };
        metadataCache.set(event.messageId, { ...(metadataCache.get(event.messageId) ?? {}), ...md });
        if (metadataCache.size > 500) metadataCache.delete(metadataCache.keys().next().value as string);
        emit("onMetadata", event.messageId, event.channelIdentifier.channelId, md);
        const summary = streamSummary(md);
        if (summary) emit("onUpdate", event.messageId, { text: summary.summary, ...(summary.complete ? { streaming: false } : {}) });
        if (md.text) emit("onUpdate", event.messageId, { text: md.text, ...(md.answer === "done" ? { streaming: false } : {}) });
      },
      onMessageReceiptResponse({ responses }) {
        for (const r of responses) {
          const readers = (r.users ?? []).map((u) => (u as { userId?: string }).userId ?? "").filter(Boolean);
          emit("onReceipt", r.channelIdentifier.channelId, [r.messageId], readers);
        }
      },
      onStreamMessageRequestDelta({ messageId, chunkInfo }) {
        const text = chunkInfo.messageContent ?? "";
        streamText.set(messageId, text);
        emit("onUpdate", messageId, { text, streaming: true });
      },
      onStreamMessageRequestComplete({ messageId }) {
        emit("onUpdate", messageId, { streaming: false });
      },
    }),
  );
}

/** Fetches an announced stream message and subscribes to its chunks. */
async function attachStream(s: Sdk, channelId: string, messageId: string) {
  try {
    const res = await s.BaseChannel.getMessagesByIds({ channelIdentifier: new s.GroupChannel(channelId).identifier, messageIds: [messageId] });
    const m = res.data?.[messageId];
    if (!m) return;
    const normalized = normalize(m);
    emit("onMessage", normalized);
    if (normalized.streaming) await m.requestStreamMessage();
  } catch (err) {
    console.warn("[chat] stream attach failed", err);
  }
}

async function reconnectWithFreshToken() {
  if (!credentialFetcher || !sdk) return;
  try {
    setState("reconnecting");
    const creds = await credentialFetcher(true);
    const res = await sdk.NCEngine.connect({ token: creds.token });
    if (!res.isOk) setState("error", res.code);
  } catch {
    setState("error");
  }
}

async function manualReconnect() {
  if (!credentialFetcher || !sdk) return;
  try {
    const creds = await credentialFetcher(false);
    const res = await sdk.NCEngine.connect({ token: creds.token });
    if (!res.isOk) setState("error", res.code);
  } catch {
    setState("error");
  }
}

/**
 * Initializes (once) and connects. `fetchCredentials(refresh)` must return a token from our API;
 * with refresh=true the server issues a brand-new token.
 */
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

/** Retries a failed initial connect with backoff (2s, 4s, 8s ... capped at 30s). */
function scheduleRetry() {
  if (retryTimer || !credentialFetcher) return;
  const delay = Math.min(30_000, 2000 * Math.pow(2, retryAttempt));
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (credentialFetcher && state !== "connected" && state !== "kicked") void connectChat(credentialFetcher).catch(() => undefined);
  }, delay);
}

export function connectChat(fetchCredentials: (refresh: boolean) => Promise<ChatCredentials>): Promise<void> {
  credentialFetcher = fetchCredentials;
  if (state === "connected") return Promise.resolve();
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    setState("connecting");
    sdk = sdk ?? (await import("@nexconn/chat"));
    let creds = await fetchCredentials(false);
    if (initializedKey !== creds.appKey) {
      sdk.NCEngine.initialize({ appKey: creds.appKey, areaCode: sdk.AreaCode.SG, logLevel: sdk.LogLevel.WARN });
      sdk.NCEngine.registerCustomMessages([
        { messageType: HD_TYPES.event, isPersisted: true, isCounted: false },
        { messageType: HD_TYPES.csat, isPersisted: true, isCounted: true },
        { messageType: HD_TYPES.note, isPersisted: true, isCounted: false },
        { messageType: HD_TYPES.typing, isPersisted: false, isCounted: false, isStatusMessage: true },
        { messageType: HD_TYPES.inbox, isPersisted: false, isCounted: false, isStatusMessage: true },
        { messageType: HD_TYPES.stream, isPersisted: false, isCounted: false, isStatusMessage: true },
      ]);
      registerHandlers(sdk);
      initializedKey = creds.appKey;
    }
    let res = await sdk.NCEngine.connect({ token: creds.token });
    if (!res.isOk && res.code === 31004) {
      creds = await fetchCredentials(true);
      res = await sdk.NCEngine.connect({ token: creds.token });
    }
    if (!res.isOk) {
      setState(res.code === 31010 ? "kicked" : "error", res.code);
      throw new Error(`Chat connection failed (${res.code})`);
    }
    currentUserId = res.data?.userId ?? creds.userId;
    retryAttempt = 0;
    setState("connected");
  })()
    .catch((err) => {
      // Network hiccups (credential fetch or connect) retry automatically; a kick does not.
      if (state !== "kicked") {
        if (state !== "error") setState("error");
        scheduleRetry();
      }
      throw err;
    })
    .finally(() => {
      connectPromise = null;
    });
  return connectPromise;
}

export async function disconnectChat() {
  if (!sdk) return;
  await sdk.NCEngine.disconnect().catch(() => undefined);
  hadConnected = false;
  setState("idle");
}

async function ensureConnected() {
  if (state === "connected" || !credentialFetcher) return;
  await connectChat(credentialFetcher).catch(() => undefined);
}

function requireSdk(): Sdk {
  if (!sdk) throw new Error("Chat SDK not loaded");
  return sdk;
}

function group(channelId: string) {
  return new (requireSdk().GroupChannel)(channelId);
}

/** Loads one page of history (newest first from `before`), returned oldest-first. */
export async function loadHistory(channelId: string, before: number, pageSize = 20): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const s = requireSdk();
  const query = s.BaseChannel.createMessagesQuery({
    channelIdentifier: group(channelId).identifier,
    startTime: before,
    pageSize,
    isAscending: false,
  });
  const res = await query.loadNextPage();
  if (!res.isOk || !res.data) throw new Error(`History failed (${res.code})`);
  const items = res.data.data
    .filter((m) => m.messageType !== HD_TYPES.typing && m.messageType !== HD_TYPES.inbox && m.messageType !== HD_TYPES.stream)
    .map(normalize)
    .sort((a, b) => a.sentTime - b.sentTime);
  return { messages: items, hasMore: res.data.data.length >= pageSize };
}

export async function sendText(
  channelId: string,
  text: string,
  opts: { needReceipt?: boolean; senderName?: string } = {},
): Promise<ChatMessage> {
  await ensureConnected();
  const s = requireSdk();
  const params = new s.SendTextMessageParams({
    text,
    ...(opts.senderName ? { senderUserInfo: { userId: currentUserId ?? undefined, name: opts.senderName } } : {}),
  });
  params.needReceipt = opts.needReceipt ?? true;
  const res = await group(channelId).sendMessage(params);
  if (!res.isOk || !res.data) throw new Error(`Send failed (${res.code})`);
  return normalize(res.data);
}

/** Uploads through Nexconn media storage and sends an image or file message. */
export async function sendMedia(channelId: string, file: File, onProgress?: (p: number) => void): Promise<ChatMessage> {
  await ensureConnected();
  const s = requireSdk();
  const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(file.type);
  const prepared = isImage ? await s.Helper.createSendImageMessageParams(file) : await s.Helper.createSendFileMessageParams(file);
  if (!prepared.isOk || !prepared.data) throw new Error(`Could not prepare upload (${prepared.code})`);
  const params = prepared.data;
  params.needReceipt = true;
  params.onUploadProgress = (p: number) => onProgress?.(p);
  const res = await group(channelId).sendMediaMessage(params as never);
  if (!res.isOk || !res.data) throw new Error(`Upload failed (${res.code})`);
  return normalize(res.data as Message);
}

const lastTyping = new Map<string, number>();

/** Typing indicator for group channels via a custom status message (throttled to 1 per 3 s). */
export async function sendTyping(channelId: string, info: TypingContent) {
  const now = Date.now();
  if (now - (lastTyping.get(channelId) ?? 0) < 3000) return;
  lastTyping.set(channelId, now);
  const s = requireSdk();
  const params = new s.SendMessageParams<TypingContent>(info, HD_TYPES.typing);
  await group(channelId).sendMessage(params).catch(() => undefined);
}

export async function markRead(channelId: string, messageIds: string[]) {
  const ch = group(channelId);
  if (messageIds.length) await ch.sendReadReceiptResponse(messageIds).catch(() => undefined);
  await ch.clearUnreadCount().catch(() => undefined);
}

/** Unread counts per group channel for the signed-in user (Nexconn channel list). */
export async function unreadByChannel(): Promise<Record<string, number>> {
  const s = requireSdk();
  const res = await s.BaseChannel.getUnreadChannels([s.ChannelType.GROUP]);
  const out: Record<string, number> = {};
  if (res.isOk && res.data) for (const ch of res.data) out[ch.channelId] = ch.unreadCount;
  return out;
}

export async function clearUnread(channelId: string) {
  await group(channelId).clearUnreadCount().catch(() => undefined);
}

/** Presence: subscribe to teammates' online status (client-side presence). */
export async function subscribePresence(userIds: string[], onChange: (userId: string, online: boolean) => void) {
  const s = requireSdk();
  if (userIds.length === 0) return () => undefined;
  const handlerId = `hd-presence-${Math.random().toString(36).slice(2)}`;
  s.NCEngine.addUserHandler(
    handlerId,
    new s.UserHandler({
      onSubscriptionChanged({ events }) {
        for (const e of events) {
          if (e.subscribeType !== s.SubscribeType.ONLINE_STATUS) continue;
          // eventValue 1 = online on that platform; the latest change wins.
          const latest = [...(e.details ?? [])].sort((a, b) => b.changeTime - a.changeTime)[0];
          if (latest) onChange(e.userId, latest.eventValue === 1);
        }
      },
    }),
  );
  await s.NCEngine.userModule
    .subscribeEvent({ userIds: userIds.slice(0, 200), subscribeType: s.SubscribeType.ONLINE_STATUS, expiry: 86400 })
    .catch(() => undefined);
  const initial = await s.NCEngine.userModule.getSubscribeUsersOnlineStatus(userIds.slice(0, 200)).catch(() => null);
  if (initial?.isOk && initial.data) {
    for (const u of initial.data) onChange(u.userId, Boolean(u.isOnline));
  }
  return () => {
    s.NCEngine.removeUserHandler(handlerId);
  };
}
