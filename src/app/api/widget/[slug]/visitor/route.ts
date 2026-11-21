import { z } from "zod";
import { HttpError } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { emailSchema, personNameSchema } from "@/lib/validation";
import { toPublicWorkspace, workspaceBySlug } from "@/lib/widget/public";
import { createVisitor } from "@/lib/widget/service";

const body = z.object({
  name: personNameSchema,
  email: z.union([emailSchema, z.literal("")]).optional(),
});

/** Creates a customer identity for this help desk. The credential is kept in the embed's storage. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const workspace = await workspaceBySlug(slug);
  if (!workspace) throw new HttpError(404, "This help desk does not exist", "not_found");
  if (!(await rateLimit(`visitor:${clientIp(req)}`, 30, 3600))) {
    throw new HttpError(429, "Too many new chats from this network. Try again later.", "rate_limited");
  }
  const input = await parseJson(req, body);
  const { visitor, credential } = await createVisitor(workspace, { name: input.name, email: input.email || null });
  return json(
    {
      credential,
      visitor: { id: visitor.id, name: visitor.name, email: visitor.email, nexconnUserId: visitor.nexconnUserId },
      workspace: toPublicWorkspace(workspace),
    },
    201,
  );
});
