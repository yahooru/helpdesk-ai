import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites, memberships, users } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  const { workspace } = await requireStaff();
  const [members, pending] = await Promise.all([
    db()
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        nexconnUserId: users.nexconnUserId,
        role: memberships.role,
        availability: memberships.availability,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.workspaceId, workspace.id))
      .orderBy(asc(memberships.createdAt)),
    db()
      .select({ id: invites.id, email: invites.email, role: invites.role, expiresAt: invites.expiresAt, createdAt: invites.createdAt })
      .from(invites)
      .where(
        and(
          eq(invites.workspaceId, workspace.id),
          isNull(invites.acceptedAt),
          isNull(invites.revokedAt),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(invites.createdAt)),
  ]);
  return json({ members, invites: pending });
});
