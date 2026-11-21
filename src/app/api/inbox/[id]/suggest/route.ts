import { HttpError, requireStaff } from "@/lib/auth/guards";
import { suggestReply } from "@/lib/ai/assist";
import { getConversation } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 45;

/** AI reply suggestion for the agent (grounded in the workspace knowledge). */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  if (!(await rateLimit(`suggest:${user.id}`, 20, 600))) throw new HttpError(429, "Too many suggestions requested. Wait a few minutes.", "rate_limited");
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const suggestion = await suggestReply(workspace, conversation, user.name);
  return json(suggestion);
});
