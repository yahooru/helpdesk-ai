import { requireVisitor } from "@/lib/auth/visitor";
import { json, route } from "@/lib/http";
import { nexconnAppKey } from "@/lib/nexconn/server";
import { visitorNexconnToken } from "@/lib/widget/service";

/** Nexconn credentials for the customer (fresh token on every call). */
export const POST = route(async (req: Request) => {
  const { visitor, workspace } = await requireVisitor(req);
  const token = await visitorNexconnToken(visitor);
  return json({ appKey: nexconnAppKey(), token, userId: visitor.nexconnUserId, botUserId: workspace.botUserId });
});
