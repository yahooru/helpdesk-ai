import { z } from "zod";
import { HttpError } from "@/lib/auth/guards";
import { requireVisitor } from "@/lib/auth/visitor";
import { submitCsat } from "@/lib/conversations/service";
import { json, parseJson, route } from "@/lib/http";
import { getVisitorConversation } from "@/lib/widget/service";

const body = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Stores the CSAT rating and writes it onto the rating card as Nexconn message metadata. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { visitor, workspace } = await requireVisitor(req);
  const conversation = await getVisitorConversation(visitor, id);
  if (!conversation) throw new HttpError(404, "Conversation not found", "not_found");
  const input = await parseJson(req, body);
  await submitCsat(workspace, conversation, input.rating, input.comment || null);
  return json({ ok: true });
});
