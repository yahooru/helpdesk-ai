import { HttpError } from "@/lib/auth/guards";
import { anyTeammateOnline } from "@/lib/conversations/service";
import { json, route } from "@/lib/http";
import { toPublicWorkspace, workspaceBySlug } from "@/lib/widget/public";

/** Public widget configuration (branding + whether a teammate is online right now). */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const workspace = await workspaceBySlug(slug);
  if (!workspace) throw new HttpError(404, "This help desk does not exist", "not_found");
  const teamOnline = await anyTeammateOnline(workspace).catch(() => false);
  return json({ workspace: toPublicWorkspace(workspace), teamOnline });
});
