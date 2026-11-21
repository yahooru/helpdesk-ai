import { z } from "zod";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/guards";
import { getConversation } from "@/lib/conversations/service";
import { json, parseJson, route } from "@/lib/http";
import { sendGroupMessage } from "@/lib/nexconn/server";
import { HD_TYPES, type NoteContent } from "@/lib/nexconn/types";

/**
 * Internal note. Stored in Postgres and broadcast on the workspace staff channel as HD:Note
 * (sent as the author). It is never sent to the customer's channel.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace, user } = await requireStaff();
  const conversation = await getConversation(workspace.id, (await ctx.params).id);
  const { text } = await parseJson(req, z.object({ text: z.string().trim().min(1, "Write a note").max(4000) }));
  const [note] = await db()
    .insert(notes)
    .values({ conversationId: conversation.id, workspaceId: workspace.id, authorId: user.id, body: text })
    .returning();
  const content: NoteContent = { conversationId: conversation.id, noteId: note.id, text, authorName: user.name };
  await sendGroupMessage({
    fromUserId: user.nexconnUserId,
    channelId: workspace.staffChannelId,
    messageType: HD_TYPES.note,
    content,
  }).catch((err) => console.warn("[notes] staff broadcast failed", err instanceof Error ? err.message : err));
  return json({ note: { id: note.id, body: note.body, createdAt: note.createdAt, authorId: user.id, authorName: user.name } }, 201);
});
