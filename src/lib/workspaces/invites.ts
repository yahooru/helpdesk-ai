import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites, workspaces } from "@/lib/db/schema";
import { sha256 } from "@/lib/auth/tokens";

/** Looks up a pending, unexpired invite by its raw token. */
export async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const [row] = await db()
    .select({ invite: invites, workspace: workspaces })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .where(
      and(eq(invites.tokenHash, sha256(token)), isNull(invites.acceptedAt), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())),
    )
    .limit(1);
  return row ?? null;
}
