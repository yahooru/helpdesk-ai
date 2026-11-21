import { z } from "zod";
import { HttpError } from "@/lib/auth/guards";
import { requireVisitor } from "@/lib/auth/visitor";
import { json, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { startConversation } from "@/lib/widget/service";

const body = z.object({
  pageUrl: z.string().max(1000).optional().nullable(),
  pageTitle: z.string().max(200).optional().nullable(),
  source: z.enum(["widget", "page"]).default("widget"),
});

/** Starts a new support conversation (one Nexconn group channel). */
export const POST = route(async (req: Request) => {
  const { visitor, workspace } = await requireVisitor(req);
  if (!(await rateLimit(`conv:${visitor.id}`, 10, 3600))) {
    throw new HttpError(429, "You started many conversations recently. Continue an existing one.", "rate_limited");
  }
  const input = await parseJson(req, body);
  const pageUrl = input.pageUrl && /^https?:\/\//i.test(input.pageUrl) ? input.pageUrl : null;
  const conversation = await startConversation(workspace, visitor, { pageUrl, pageTitle: input.pageTitle ?? null, source: input.source });
  return json(
    { conversation: { id: conversation.id, channelId: conversation.channelId, status: conversation.status, createdAt: conversation.createdAt } },
    201,
  );
});
