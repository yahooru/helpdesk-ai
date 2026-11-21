import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { savedReplies } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";

export const GET = route(async () => {
  const { workspace } = await requireStaff();
  const rows = await db()
    .select({ id: savedReplies.id, title: savedReplies.title, body: savedReplies.body })
    .from(savedReplies)
    .where(eq(savedReplies.workspaceId, workspace.id))
    .orderBy(asc(savedReplies.title));
  return json({ replies: rows });
});

export const POST = route(async (req: Request) => {
  const { workspace, user } = await requireStaff();
  const input = await parseJson(
    req,
    z.object({
      title: z.string().trim().min(2, "Give it a short name").max(80),
      body: z.string().trim().min(2, "Write the reply").max(2000),
    }),
  );
  const [row] = await db()
    .insert(savedReplies)
    .values({ workspaceId: workspace.id, title: input.title, body: input.body, createdBy: user.id })
    .returning({ id: savedReplies.id, title: savedReplies.title, body: savedReplies.body });
  return json({ reply: row }, 201);
});
