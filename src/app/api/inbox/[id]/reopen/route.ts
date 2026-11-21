import { requireStaff } from "@/lib/auth/guards";
import { getConversation, reopenConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const updated = await reopenConversation(workspace, conversation, { type: "agent", name: user.name });
  return json({ conversation: updated });
});
