import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, users, workspaces, type Membership, type User, type Workspace } from "@/lib/db/schema";
import { getSession, getWorkspaceCookie } from "./session";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type StaffContext = { user: User; workspace: Workspace; membership: Membership };

export async function currentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db().select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue", "unauthenticated");
  return user;
}

/** Workspaces the user belongs to, oldest membership first. */
export async function userWorkspaces(userId: string) {
  return db()
    .select({ workspace: workspaces, membership: memberships })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
}

/** Resolves the active workspace (cookie, else first membership) for a signed-in user. */
export async function staffContext(): Promise<StaffContext | null> {
  const user = await currentUser();
  if (!user) return null;
  const preferred = await getWorkspaceCookie();
  if (preferred && /^[0-9a-f-]{36}$/i.test(preferred)) {
    const [row] = await db()
      .select({ workspace: workspaces, membership: memberships })
      .from(memberships)
      .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
      .where(and(eq(memberships.userId, user.id), eq(memberships.workspaceId, preferred)))
      .limit(1);
    if (row) return { user, ...row };
  }
  const [first] = await userWorkspaces(user.id);
  return first ? { user, ...first } : null;
}

export async function requireStaff(): Promise<StaffContext> {
  const ctx = await staffContext();
  if (!ctx) {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Sign in to continue", "unauthenticated");
    throw new HttpError(403, "Create or join a workspace first", "no_workspace");
  }
  return ctx;
}

export async function requireAdmin(): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (ctx.membership.role !== "admin") throw new HttpError(403, "Only workspace admins can do this", "forbidden");
  return ctx;
}
