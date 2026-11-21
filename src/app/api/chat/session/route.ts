import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";
import { issueToken, nexconnAppKey } from "@/lib/nexconn/server";
import { staffNexconnToken } from "@/lib/workspaces/service";

/** Nexconn credentials for the signed-in teammate. Only the App Key is public; the secret stays here. */
export const POST = route(async (req: Request) => {
  const { user, workspace } = await requireStaff();
  const { refresh } = await parseJson(req, z.object({ refresh: z.boolean().optional() }));
  let token: string;
  if (refresh) {
    token = await issueToken(user.nexconnUserId, user.name);
    await db().update(users).set({ nexconnToken: token }).where(eq(users.id, user.id));
  } else {
    token = await staffNexconnToken(user);
  }
  return json({
    appKey: nexconnAppKey(),
    token,
    userId: user.nexconnUserId,
    staffChannelId: workspace.staffChannelId,
    botUserId: workspace.botUserId,
  });
});
