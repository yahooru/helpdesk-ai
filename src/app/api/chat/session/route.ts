import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { ensureStaffChannel, tryEnsure } from "@/lib/nexconn/provision";
import { nexconnAppKey } from "@/lib/nexconn/server";
import { staffNexconnToken } from "@/lib/workspaces/service";

/**
 * Nexconn credentials for the signed-in teammate. Only the App Key is public; the secret stays here.
 * Also makes sure the workspace's staff group exists in the current Nexconn app before the console
 * starts listening on it.
 */
export const POST = route(async (req: Request) => {
  const { user, workspace } = await requireStaff();
  const { refresh } = await parseJson(req, z.object({ refresh: z.boolean().optional() }));
  const [token] = await Promise.all([staffNexconnToken(user, Boolean(refresh)), tryEnsure(ensureStaffChannel(workspace), "staff channel")]);
  return json({
    appKey: nexconnAppKey(),
    token,
    userId: user.nexconnUserId,
    staffChannelId: workspace.staffChannelId,
    botUserId: workspace.botUserId,
  });
});
