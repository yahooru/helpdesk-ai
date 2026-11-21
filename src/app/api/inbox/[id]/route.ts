import { HttpError, requireStaff } from "@/lib/auth/guards";
import { conversationDetail } from "@/lib/conversations/queries";
import { getConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";
import { ensureConversationChannel, tryEnsure } from "@/lib/nexconn/provision";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireStaff();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Conversation not found", "not_found");
  const detail = await conversationDetail(workspace.id, id);
  if (!detail) throw new HttpError(404, "Conversation not found", "not_found");
  // The agent replies through the SDK into this group, so it must exist in the current Nexconn app.
  await tryEnsure(
    getConversation(workspace.id, id).then((c) => ensureConversationChannel(workspace, c)),
    "conversation",
  );
  return json(detail);
});
