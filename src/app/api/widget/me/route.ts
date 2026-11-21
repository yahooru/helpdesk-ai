import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { visitors } from "@/lib/db/schema";
import { requireVisitor } from "@/lib/auth/visitor";
import { json, parseJson, route } from "@/lib/http";
import { emailSchema, personNameSchema } from "@/lib/validation";
import { ensureConversationChannel, tryEnsure } from "@/lib/nexconn/provision";
import { visitorConversations } from "@/lib/widget/service";

/** The returning customer's identity and conversations (the latest one is reopened in the chat). */
export const GET = route(async (req: Request) => {
  const { visitor, workspace } = await requireVisitor(req);
  const conversations = await visitorConversations(visitor.id);
  const latest = conversations[0];
  if (latest) await tryEnsure(ensureConversationChannel(workspace, { ...latest, visitorId: visitor.id }), "conversation");
  return json({
    visitor: { id: visitor.id, name: visitor.name, email: visitor.email, nexconnUserId: visitor.nexconnUserId },
    workspaceSlug: workspace.slug,
    conversations,
  });
});

const patch = z.object({ name: personNameSchema.optional(), email: z.union([emailSchema, z.literal("")]).optional() });

export const PATCH = route(async (req: Request) => {
  const { visitor } = await requireVisitor(req);
  const input = await parseJson(req, patch);
  const [updated] = await db()
    .update(visitors)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
    })
    .where(eq(visitors.id, visitor.id))
    .returning();
  return json({ visitor: { id: updated.id, name: updated.name, email: updated.email } });
});
