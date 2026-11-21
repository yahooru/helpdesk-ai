import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Inbox } from "@/components/inbox/inbox";
import type { Queue } from "@/components/inbox/types";
import { staffContext } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Inbox" };

const QUEUES: Queue[] = ["unassigned", "mine", "open", "resolved"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ queue?: string; c?: string }> }) {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const sp = await searchParams;
  const queue = QUEUES.includes(sp.queue as Queue) ? (sp.queue as Queue) : "unassigned";
  const selected = sp.c && /^[0-9a-f-]{36}$/i.test(sp.c) ? sp.c : null;
  const [kb] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.workspaceId, ctx.workspace.id));
  return (
    <Inbox
      me={{ userId: ctx.user.id, nexconnId: ctx.user.nexconnUserId, name: ctx.user.name }}
      botUserId={ctx.workspace.botUserId}
      slug={ctx.workspace.slug}
      initialQueue={queue}
      initialSelected={selected}
      hasKnowledge={Number(kb?.n ?? 0) > 0}
    />
  );
}
