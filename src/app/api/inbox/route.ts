import { requireStaff } from "@/lib/auth/guards";
import { listConversations, QUEUES, queueCounts, type Queue } from "@/lib/conversations/queries";
import { json, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  const { workspace, user } = await requireStaff();
  const params = new URL(req.url).searchParams;
  const q = params.get("queue");
  const queue: Queue = QUEUES.includes(q as Queue) ? (q as Queue) : "unassigned";
  const search = (params.get("q") ?? "").trim().slice(0, 80) || undefined;
  const [conversations, counts] = await Promise.all([
    listConversations(workspace.id, user.id, queue, search),
    queueCounts(workspace.id, user.id),
  ]);
  return json({ queue, conversations, counts });
});
