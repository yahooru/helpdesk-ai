import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/guards";
import { emitInbox } from "@/lib/conversations/service";
import { json, parseJson, route } from "@/lib/http";

/** Available teammates are eligible for round-robin auto-assignment (when also online). */
export const PATCH = route(async (req: Request) => {
  const { workspace, user } = await requireStaff();
  const { availability } = await parseJson(req, z.object({ availability: z.enum(["available", "away"]) }));
  await db()
    .update(memberships)
    .set({ availability })
    .where(and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, user.id)));
  await emitInbox(workspace, { kind: "presence", userId: user.id, availability, at: Date.now() });
  return json({ availability });
});
