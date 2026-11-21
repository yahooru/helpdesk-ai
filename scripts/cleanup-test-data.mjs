// Removes data created by the automated tests: accounts with emails ending in @example.com, the
// workspaces they created (cascades to conversations, messages, knowledge...), and the Nexconn
// group channels of those workspaces. Usage: node scripts/cleanup-test-data.mjs [--dry-run]
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";

config({ path: ".env.local" });
const dry = process.argv.includes("--dry-run");
const sql = neon(process.env.DATABASE_URL);

async function nexconn(path, body) {
  const nonce = randomBytes(8).toString("hex");
  const timestamp = String(Date.now());
  const signature = createHash("sha1").update(process.env.NEXCONN_APP_SECRET + nonce + timestamp).digest("hex");
  const res = await fetch((process.env.NEXCONN_API_BASE ?? "https://api.sg-light-api.com") + path, {
    method: "POST",
    headers: { "App-Key": process.env.NEXCONN_APP_KEY, Nonce: nonce, Timestamp: timestamp, Signature: signature, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

const users = await sql`select id, email from users where email like '%@example.com'`;
const userIds = users.map((u) => u.id);
const workspaces = userIds.length
  ? await sql`select id, slug, staff_channel_id from workspaces where created_by = any(${userIds})`
  : [];
const wsIds = workspaces.map((w) => w.id);
const channels = wsIds.length ? await sql`select channel_id from conversations where workspace_id = any(${wsIds})` : [];
const groupIds = [...workspaces.map((w) => w.staff_channel_id), ...channels.map((c) => c.channel_id)];

console.log(`test users: ${users.length}, workspaces: ${workspaces.length}, Nexconn groups: ${groupIds.length}`);
if (dry) process.exit(0);

let dismissed = 0;
for (const channelId of groupIds) {
  const r = await nexconn("/v4/group-channel/dismiss", { channelId });
  if (r.code === 0) dismissed++;
}
if (wsIds.length) await sql`delete from workspaces where id = any(${wsIds})`;
if (userIds.length) await sql`delete from users where id = any(${userIds})`;
await sql`delete from rate_limits where window_start < now() - interval '1 day'`;
console.log(`dismissed ${dismissed} groups, deleted ${wsIds.length} workspaces and ${userIds.length} users`);
