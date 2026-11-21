import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, users, workspaces, type User, type Workspace } from "@/lib/db/schema";
import { HttpError } from "@/lib/auth/guards";
import { createGroup, issueToken, joinGroup, leaveGroup, newNexconnId } from "@/lib/nexconn/server";
import { isValidSlug } from "@/lib/slug";

/** Returns a Nexconn access token for a staff user, issuing (and caching) one when needed. */
export async function staffNexconnToken(user: User): Promise<string> {
  if (user.nexconnToken) return user.nexconnToken;
  const token = await issueToken(user.nexconnUserId, user.name);
  await db().update(users).set({ nexconnToken: token }).where(eq(users.id, user.id));
  return token;
}

export async function slugAvailable(slug: string, exceptWorkspaceId?: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;
  const [row] = await db().select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return !row || row.id === exceptWorkspaceId;
}

export function defaultBotName(workspaceName: string): string {
  return `${workspaceName.slice(0, 40)} Assistant`;
}

/**
 * Creates a workspace: registers its AI bot as a real Nexconn user, creates the staff group
 * channel (bot owner + creator), then stores the workspace and the admin membership.
 */
export async function createWorkspace(
  user: User,
  input: { name: string; slug: string; brandColor: string; greeting: string; logoUrl?: string | null },
): Promise<Workspace> {
  if (!(await slugAvailable(input.slug))) throw new HttpError(409, "That address is taken. Try another.", "slug_taken");
  const botUserId = newNexconnId();
  const botName = defaultBotName(input.name);
  const staffChannelId = newNexconnId();

  await issueToken(botUserId, botName, input.logoUrl ?? undefined);
  await staffNexconnToken(user);
  await createGroup({ channelId: staffChannelId, name: `${input.name} team`, owner: botUserId, userIds: [user.nexconnUserId] });

  const [workspace] = await db()
    .insert(workspaces)
    .values({
      slug: input.slug,
      name: input.name,
      brandColor: input.brandColor,
      greeting: input.greeting,
      logoUrl: input.logoUrl ?? null,
      botUserId,
      botName,
      staffChannelId,
      createdBy: user.id,
    })
    .returning();
  await db().insert(memberships).values({ workspaceId: workspace.id, userId: user.id, role: "admin" });
  return workspace;
}

/** Adds a user to a workspace (invite acceptance) and to the staff channel. */
export async function addMember(workspace: Workspace, user: User, role: "admin" | "agent") {
  await staffNexconnToken(user);
  await joinGroup(workspace.staffChannelId, [user.nexconnUserId]);
  await db()
    .insert(memberships)
    .values({ workspaceId: workspace.id, userId: user.id, role })
    .onConflictDoNothing({ target: [memberships.workspaceId, memberships.userId] });
}

export async function removeMember(workspace: Workspace, userId: string) {
  const [row] = await db()
    .select({ nexconnUserId: users.nexconnUserId })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, userId)))
    .limit(1);
  if (!row) throw new HttpError(404, "That teammate is not in this workspace", "not_found");
  await leaveGroup(workspace.staffChannelId, [row.nexconnUserId]).catch(() => undefined);
  await db().delete(memberships).where(and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, userId)));
}

/** Keeps the bot's Nexconn display name / avatar in sync with the workspace branding. */
export async function refreshBotProfile(workspace: Workspace) {
  await issueToken(workspace.botUserId, workspace.botName, workspace.logoUrl ?? undefined).catch((err) =>
    console.warn("[workspace] bot profile refresh failed", err instanceof Error ? err.message : err),
  );
}
