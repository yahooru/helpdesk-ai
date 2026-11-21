import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, users, visitors, type Conversation, type Workspace } from "@/lib/db/schema";
import { ensureGroup, issueToken, nexconnAppKey } from "./server";

/**
 * Nexconn users and groups live inside one Nexconn app, while their ids live in our database.
 * When the app changes (a new App Key) or a group was never created, these helpers re-create the
 * group under the same id with the right members, so the database never needs rewriting.
 *
 * Sending to a group that doesn't exist succeeds silently, so every server path that sends into
 * a channel (or adds someone to it) calls one of these first. Each channel is checked once per
 * server instance and App Key; failures are forgotten so the next call tries again.
 */
const ready = new Map<string, Promise<void>>();

function once(key: string, work: () => Promise<void>): Promise<void> {
  const cacheKey = `${nexconnAppKey()}:${key}`;
  let pending = ready.get(cacheKey);
  if (!pending) {
    pending = work().catch((err) => {
      ready.delete(cacheKey);
      throw err;
    });
    ready.set(cacheKey, pending);
  }
  return pending;
}

/** The workspace's staff group (bot owner + every teammate), with the bot registered. */
export function ensureStaffChannel(workspace: Workspace): Promise<void> {
  return once(`staff:${workspace.staffChannelId}`, async () => {
    // The bot sends system messages and streams; Nexconn requires a streaming sender to hold a token.
    await issueToken(workspace.botUserId, workspace.botName, workspace.logoUrl ?? undefined);
    const team = await db()
      .select({ nexconnUserId: users.nexconnUserId })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.workspaceId, workspace.id));
    await ensureGroup({
      channelId: workspace.staffChannelId,
      name: `${workspace.name} team`,
      owner: workspace.botUserId,
      userIds: team.map((t) => t.nexconnUserId),
    });
  });
}

/** One conversation's group (bot owner + the customer + the assigned agent, if any). */
export function ensureConversationChannel(
  workspace: Workspace,
  conversation: Pick<Conversation, "channelId" | "visitorId" | "assigneeId">,
): Promise<void> {
  return once(`conv:${conversation.channelId}`, async () => {
    await ensureStaffChannel(workspace);
    const [visitor] = await db()
      .select({ nexconnUserId: visitors.nexconnUserId, name: visitors.name })
      .from(visitors)
      .where(eq(visitors.id, conversation.visitorId))
      .limit(1);
    const members = visitor ? [visitor.nexconnUserId] : [];
    if (conversation.assigneeId) {
      const [agent] = await db()
        .select({ nexconnUserId: users.nexconnUserId })
        .from(users)
        .where(eq(users.id, conversation.assigneeId))
        .limit(1);
      if (agent) members.push(agent.nexconnUserId);
    }
    await ensureGroup({
      channelId: conversation.channelId,
      name: `${visitor?.name ?? "Customer"} at ${workspace.name}`.slice(0, 64),
      owner: workspace.botUserId,
      userIds: members,
    });
  });
}

/** Best effort for read paths: a failure is logged, and the next call retries. */
export async function tryEnsure(work: Promise<void>, label: string): Promise<void> {
  try {
    await work;
  } catch (err) {
    console.warn(`[nexconn] ${label} provisioning failed`, err instanceof Error ? err.message : err);
  }
}
