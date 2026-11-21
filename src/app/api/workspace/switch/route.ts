import { z } from "zod";
import { HttpError, requireUser, userWorkspaces } from "@/lib/auth/guards";
import { setWorkspaceCookie } from "@/lib/auth/session";
import { json, parseJson, route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { workspaceId } = await parseJson(req, z.object({ workspaceId: z.string().uuid() }));
  const rows = await userWorkspaces(user.id);
  if (!rows.some((r) => r.workspace.id === workspaceId)) throw new HttpError(404, "Workspace not found", "not_found");
  await setWorkspaceCookie(workspaceId);
  return json({ ok: true });
});
