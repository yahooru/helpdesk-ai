import { requireStaff } from "@/lib/auth/guards";
import { getConversation, resolveConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";

/** Resolve: posts a system line and the CSAT rating card into the customer channel. */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const updated = await resolveConversation(workspace, conversation, { type: "agent", name: user.name });
  return json({ conversation: updated });
});
