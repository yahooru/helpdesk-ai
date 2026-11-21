import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { getConversation, transferConversation } from "@/lib/conversations/service";
import { json, parseJson, route } from "@/lib/http";

/** Transfer: server removes the previous agent from the Nexconn group and adds the new one. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const { userId } = await parseJson(req, z.object({ userId: z.string().uuid() }));
  const updated = await transferConversation(workspace, conversation, { id: user.id, name: user.name }, userId);
  return json({ conversation: updated });
});
