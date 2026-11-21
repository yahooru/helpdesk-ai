import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { nexconnId } from "@/lib/ids";
import { HD_TYPES } from "./types";

/**
 * Minimal Platform Chat API client (server only). Every request is signed with
 * SHA1(appSecret + nonce + timestamp). Falls back to the backup host on network errors / 5xx.
 */

export class NexconnError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NexconnError";
  }
}

type ApiResponse<T> = { code: number; result?: T; msg?: string; errorMessage?: string };

function signHeaders() {
  const { NEXCONN_APP_KEY, NEXCONN_APP_SECRET } = env();
  const nonce = randomBytes(8).toString("hex").slice(0, 16);
  const timestamp = String(Date.now());
  const signature = createHash("sha1").update(NEXCONN_APP_SECRET + nonce + timestamp).digest("hex");
  return {
    "App-Key": NEXCONN_APP_KEY,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    "Content-Type": "application/json",
    "X-Request-ID": randomBytes(16).toString("hex"),
  };
}

async function post<T>(path: string, body: unknown): Promise<T | undefined> {
  const { NEXCONN_API_BASE, NEXCONN_API_BASE_BACKUP } = env();
  const hosts = [NEXCONN_API_BASE, NEXCONN_API_BASE_BACKUP];
  let lastError: unknown;
  for (const host of hosts) {
    let res: Response;
    try {
      res = await fetch(host + path, {
        method: "POST",
        headers: signHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      lastError = err;
      continue;
    }
    if (res.status >= 500) {
      lastError = new NexconnError(`Nexconn ${path} HTTP ${res.status}`, undefined, res.status);
      continue;
    }
    const text = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text) as ApiResponse<T>;
    } catch {
      throw new NexconnError(`Nexconn ${path} returned non-JSON (HTTP ${res.status})`, undefined, res.status);
    }
    if (json.code !== 0 && json.code !== 200) {
      throw new NexconnError(
        `Nexconn ${path} failed with code ${json.code}${json.msg ? `: ${json.msg}` : ""}`,
        json.code,
        res.status,
      );
    }
    return json.result;
  }
  throw lastError instanceof Error ? lastError : new NexconnError(`Nexconn ${path} unreachable`);
}

export function newNexconnId(): string {
  return nexconnId(env().NEXCONN_ID_PREFIX);
}

export function nexconnAppKey(): string {
  return env().NEXCONN_APP_KEY;
}

/** Issues an access token (also registers / refreshes the user's name and avatar). */
export async function issueToken(userId: string, name: string, avatarUrl?: string | null): Promise<string> {
  const result = await post<{ userId: string; accessToken: string }>("/v4/auth/access-token/issue", {
    userId,
    name: name.slice(0, 64) || "Guest",
    ...(avatarUrl ? { avatarUrl } : {}),
  });
  if (!result?.accessToken) throw new NexconnError("Nexconn did not return an access token");
  return result.accessToken;
}

export async function createGroup(input: { channelId: string; name: string; owner: string; userIds: string[] }) {
  await post("/v4/group-channel/create", {
    channelId: input.channelId,
    name: input.name.slice(0, 64),
    owner: input.owner,
    userIds: input.userIds.slice(0, 30),
  });
}

export async function joinGroup(channelId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  await post("/v4/group-channel/join", { channelId, userIds });
}

export async function leaveGroup(channelId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  await post("/v4/group-channel/leave", { channelId, userIds });
}

export async function updateGroupName(channelId: string, name: string) {
  await post("/v4/group-channel/profile/update", { channelId, groupProfile: { name: name.slice(0, 64) } });
}

export async function dismissGroup(channelId: string) {
  await post("/v4/group-channel/dismiss", { channelId });
}

type SendGroupInput = {
  fromUserId: string;
  channelId: string;
  messageType: string;
  content: Record<string, unknown>;
  pushContent?: string;
  persist?: boolean;
  metadata?: Record<string, string>;
  needReadReceipt?: boolean;
  toUserIds?: string[];
};

/** Sends a group message from a (bot or staff) user via the Platform Chat API. Returns the message id. */
export async function sendGroupMessage(input: SendGroupInput): Promise<string | undefined> {
  const result = await post<{ messageIds?: { channelId: string; messageId: string }[] }>(
    "/v4/group-channel/message/send",
    {
      fromUserId: input.fromUserId,
      toChannelIds: [input.channelId],
      ...(input.toUserIds ? { toUserIds: input.toUserIds } : {}),
      messageType: input.messageType,
      content: JSON.stringify(input.content),
      ...(input.pushContent ? { pushContent: input.pushContent } : {}),
      shouldPersist: input.persist === false ? 0 : 1,
      isEchoToSender: 0,
      ...(input.metadata ? { hasMetadata: true, metadata: input.metadata } : {}),
      ...(input.needReadReceipt ? { needReadReceipt: 1 } : {}),
    },
  );
  return result?.messageIds?.[0]?.messageId;
}

export type StreamChunk = {
  content: string;
  seq: number;
  complete: boolean;
  messageId?: string;
  type?: "text" | "markdown";
  extra?: Record<string, string>;
};

/** Sends one chunk of an RC:StreamMsg streaming message. The first chunk returns the message id. */
export async function sendGroupStreamChunk(input: {
  fromUserId: string;
  channelId: string;
  chunk: StreamChunk;
  metadata?: Record<string, string>;
}): Promise<string | undefined> {
  const { chunk } = input;
  const result = await post<{ messageId?: string }>("/v4/group-channel/message/stream/send", {
    fromUserId: input.fromUserId,
    toChannelId: input.channelId,
    messageType: "RC:StreamMsg",
    content: {
      content: chunk.content,
      seq: chunk.seq,
      complete: chunk.complete,
      ...(chunk.messageId ? { messageId: chunk.messageId } : {}),
      ...(chunk.type ? { type: chunk.type } : {}),
      ...(chunk.extra ? { extra: chunk.extra } : {}),
    },
    isEchoToSender: 0,
    shouldPersist: 1,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  return result?.messageId;
}

/** Sets message metadata (expansion) on a group message that was sent with metadata enabled. */
export async function setGroupMessageMetadata(input: {
  messageId: string;
  operatorUserId: string;
  channelId: string;
  metadata: Record<string, string>;
}) {
  await post("/v4/channel-type/message/metadata/set", {
    messageId: input.messageId,
    userId: input.operatorUserId,
    channelType: 3,
    channelId: input.channelId,
    metadata: input.metadata,
    isEchoToSender: 1,
  });
}

/** Online status of a user (true when at least one client is connected). */
export async function isUserOnline(userId: string): Promise<boolean> {
  const result = await post<{ status: string }>("/v4/user/connection-status/get", { userId });
  return result?.status === "1";
}

/** Sends a transient custom event (not persisted) to the workspace staff channel. */
export async function sendStaffEvent(input: {
  botUserId: string;
  staffChannelId: string;
  event: Record<string, unknown>;
}) {
  await sendGroupMessage({
    fromUserId: input.botUserId,
    channelId: input.staffChannelId,
    messageType: HD_TYPES.inbox,
    content: input.event,
    persist: false,
  });
}
