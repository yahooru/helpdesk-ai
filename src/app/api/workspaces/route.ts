import { HttpError, requireUser } from "@/lib/auth/guards";
import { setWorkspaceCookie } from "@/lib/auth/session";
import { json, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createWorkspace } from "@/lib/workspaces/service";
import { createWorkspaceSchema } from "@/lib/workspaces/schemas";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (!(await rateLimit(`ws-create:${user.id}`, 5, 3600))) {
    throw new HttpError(429, "Too many workspaces created. Try again later.", "rate_limited");
  }
  const input = await parseJson(req, createWorkspaceSchema);
  const workspace = await createWorkspace(user, input);
  await setWorkspaceCookie(workspace.id);
  return json({ workspace: { id: workspace.id, slug: workspace.slug } }, 201);
});
