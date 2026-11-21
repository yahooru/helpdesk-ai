import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { HttpError, requireAdmin, requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { updateGroupName } from "@/lib/nexconn/server";
import { refreshBotProfile, slugAvailable } from "@/lib/workspaces/service";
import { updateWorkspaceSchema } from "@/lib/workspaces/schemas";

export const GET = route(async () => {
  const { workspace, membership } = await requireStaff();
  return json({ workspace, role: membership.role });
});

export const PATCH = route(async (req: Request) => {
  const { workspace } = await requireAdmin();
  const input = await parseJson(req, updateWorkspaceSchema);
  if (input.slug && input.slug !== workspace.slug && !(await slugAvailable(input.slug, workspace.id))) {
    throw new HttpError(409, "That address is taken. Try another.", "slug_taken");
  }
  const { removeLogo, ...rest } = input;
  const [updated] = await db()
    .update(workspaces)
    .set({ ...rest, ...(removeLogo ? { logoUrl: null } : {}) })
    .where(eq(workspaces.id, workspace.id))
    .returning();
  if (input.botName || removeLogo) await refreshBotProfile(updated);
  if (input.name && input.name !== workspace.name) {
    await updateGroupName(updated.staffChannelId, `${updated.name} team`).catch(() => undefined);
  }
  return json({ workspace: updated });
});
