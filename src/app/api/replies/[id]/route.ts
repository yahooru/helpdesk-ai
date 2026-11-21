import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { savedReplies } from "@/lib/db/schema";
import { HttpError, requireStaff } from "@/lib/auth/guards";
import { json, parseJson, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

function check(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Saved reply not found", "not_found");
}

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { workspace } = await requireStaff();
  const { id } = await ctx.params;
  check(id);
  const input = await parseJson(
    req,
    z.object({ title: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(2000) }).partial(),
  );
  const rows = await db()
    .update(savedReplies)
    .set(input)
    .where(and(eq(savedReplies.id, id), eq(savedReplies.workspaceId, workspace.id)))
    .returning({ id: savedReplies.id, title: savedReplies.title, body: savedReplies.body });
  if (rows.length === 0) throw new HttpError(404, "Saved reply not found", "not_found");
  return json({ reply: rows[0] });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const { workspace } = await requireStaff();
  const { id } = await ctx.params;
  check(id);
  await db().delete(savedReplies).where(and(eq(savedReplies.id, id), eq(savedReplies.workspaceId, workspace.id)));
  return json({ ok: true });
});
