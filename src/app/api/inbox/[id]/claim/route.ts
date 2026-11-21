import { requireStaff } from "@/lib/auth/guards";
import { claimConversation, getConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";

/** Claim: the agent joins the conversation's Nexconn group and becomes the assignee. */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const updated = await claimConversation(workspace, conversation, { id: user.id, name: user.name, nexconnUserId: user.nexconnUserId });
  return json({ conversation: updated });
});
