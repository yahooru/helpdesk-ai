// Checks that the configured Nexconn app has every server feature HelpDesk AI uses.
//   node scripts/nexconn-smoke.mjs
// Registers two fixed smoke-test users (re-used on every run, so the app's user count stays flat),
// creates a temporary group, exercises messages, streaming, metadata and presence, then dismisses it.
import { createHash, randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const KEY = process.env.NEXCONN_APP_KEY;
const SECRET = process.env.NEXCONN_APP_SECRET;
const BASE = (process.env.NEXCONN_API_BASE || "https://api.sg-light-api.com").replace(/\/$/, "");
const PREFIX = process.env.NEXCONN_ID_PREFIX || "hdk";
if (!KEY || !SECRET) throw new Error("NEXCONN_APP_KEY and NEXCONN_APP_SECRET must be set in .env.local");

async function call(path, body) {
  const nonce = randomBytes(8).toString("hex");
  const timestamp = String(Date.now());
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "App-Key": KEY,
      Nonce: nonce,
      Timestamp: timestamp,
      Signature: createHash("sha1").update(SECRET + nonce + timestamp).digest("hex"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { code: res.status, raw: text.slice(0, 200) };
  }
  return { status: res.status, ...json };
}

const results = [];
async function step(name, path, body, expect = [0, 200]) {
  const r = await call(path, body);
  const ok = expect.includes(r.code);
  results.push({ name, ok, code: r.code, http: r.status, message: r.errorMessage ?? r.msg ?? r.raw ?? "" });
  return r;
}

const bot = `${PREFIX}smokebot`;
const user = `${PREFIX}smokeuser`;
const group = `${PREFIX}smoke${Date.now().toString(36)}`;

await step("issue token (bot)", "/v4/auth/access-token/issue", { userId: bot, name: "Smoke bot" });
await step("issue token (user)", "/v4/auth/access-token/issue", { userId: user, name: "Smoke user" });
await step("create group", "/v4/group-channel/create", { channelId: group, name: "Smoke test", owner: bot, userIds: [bot, user] });
await step("create existing group -> 25409", "/v4/group-channel/create", { channelId: group, name: "Smoke test", owner: bot, userIds: [bot] }, [25409]);
await step("join as existing member", "/v4/group-channel/join", { channelId: group, userIds: [user] }, [0, 200, 25412]);
await step("join missing group -> 25410", "/v4/group-channel/join", { channelId: `${group}x`, userIds: [user] }, [25410]);
await step("send to missing group (any code)", "/v4/group-channel/message/send", {
  fromUserId: bot,
  toChannelIds: [`${group}x`],
  messageType: "RC:TxtMsg",
  content: JSON.stringify({ content: "smoke" }),
  isEchoToSender: 0,
}, [0, 200, 25410, 22406, 1002]);
const sent = await step("send group text with metadata", "/v4/group-channel/message/send", {
  fromUserId: bot,
  toChannelIds: [group],
  messageType: "RC:TxtMsg",
  content: JSON.stringify({ content: "smoke" }),
  shouldPersist: 1,
  isEchoToSender: 0,
  hasMetadata: true,
  metadata: { probe: "1" },
  needReadReceipt: 1,
});
const messageId = sent.result?.messageIds?.[0]?.messageId;
if (messageId) {
  await step("set message metadata", "/v4/channel-type/message/metadata/set", {
    messageId,
    userId: bot,
    channelType: 3,
    channelId: group,
    metadata: { probe: "2" },
    isEchoToSender: 1,
  });
}
const first = await step("stream chunk 1", "/v4/group-channel/message/stream/send", {
  fromUserId: bot,
  toChannelId: group,
  messageType: "RC:StreamMsg",
  content: { content: "Hello ", seq: 1, complete: false, type: "text" },
  isEchoToSender: 0,
  shouldPersist: 1,
});
const streamId = first.result?.messageId;
if (streamId) {
  await step("stream chunk 2 (final)", "/v4/group-channel/message/stream/send", {
    fromUserId: bot,
    toChannelId: group,
    messageType: "RC:StreamMsg",
    content: { content: "world", seq: 2, complete: true, messageId: streamId, type: "text" },
    isEchoToSender: 0,
    shouldPersist: 1,
  });
}
await step("send transient custom status (HD:Inbox)", "/v4/group-channel/message/send", {
  fromUserId: bot,
  toChannelIds: [group],
  messageType: "HD:Inbox",
  content: JSON.stringify({ kind: "smoke" }),
  shouldPersist: 0,
  isEchoToSender: 0,
});
await step("online status", "/v4/user/connection-status/get", { userId: user });
await step("leave group", "/v4/group-channel/leave", { channelId: group, userIds: [user] });
await step("dismiss group", "/v4/group-channel/dismiss", { channelId: group });

for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.name.padEnd(42)} code=${r.code} http=${r.http}${r.message ? `  ${r.message}` : ""}`);
}
if (results.some((r) => !r.ok)) process.exitCode = 1;
