import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, knowledgeGaps } from "@/lib/db/schema";

export type DayPoint = { day: string; aiResolved: number; handedOff: number; open: number; total: number };

/**
 * Workspace analytics for the last `days` days.
 * - AI-resolved: resolved without a handoff and without a human ever joining.
 * - Handed off: a handoff was requested or a teammate took part.
 * - First response time: handoff request to the first teammate reply (median).
 */
export async function workspaceAnalytics(workspaceId: string, days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const handedOff = sql`(${conversations.handoffRequestedAt} is not null or ${conversations.humanInvolved})`;
  const aiResolved = sql`(${conversations.status} = 'resolved' and ${conversations.handoffRequestedAt} is null and not ${conversations.humanInvolved})`;
  const scope = and(eq(conversations.workspaceId, workspaceId), gte(conversations.createdAt, since));

  const [totals] = await db()
    .select({
      total: sql<number>`count(*)`,
      aiResolved: sql<number>`count(*) filter (where ${aiResolved})`,
      handedOff: sql<number>`count(*) filter (where ${handedOff})`,
      medianFirstResponse: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${conversations.firstHumanResponseAt} - ${conversations.handoffRequestedAt}))) filter (where ${conversations.firstHumanResponseAt} is not null and ${conversations.handoffRequestedAt} is not null and ${conversations.firstHumanResponseAt} >= ${conversations.handoffRequestedAt})`,
      csatAvg: sql<number | null>`avg(${conversations.csatRating})`,
      csatCount: sql<number>`count(${conversations.csatRating})`,
    })
    .from(conversations)
    .where(scope);

  const dayExpr = sql<string>`to_char(date_trunc('day', ${conversations.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const rows = await db()
    .select({
      day: dayExpr,
      total: sql<number>`count(*)`,
      aiResolved: sql<number>`count(*) filter (where ${aiResolved})`,
      handedOff: sql<number>`count(*) filter (where ${handedOff})`,
    })
    .from(conversations)
    .where(scope)
    .groupBy(dayExpr);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    const total = Number(r?.total ?? 0);
    const ai = Number(r?.aiResolved ?? 0);
    const ho = Number(r?.handedOff ?? 0);
    series.push({ day: d, total, aiResolved: ai, handedOff: ho, open: Math.max(0, total - ai - ho) });
  }

  const gaps = await db()
    .select({
      id: knowledgeGaps.id,
      question: knowledgeGaps.question,
      occurrences: knowledgeGaps.occurrences,
      lastSeenAt: knowledgeGaps.lastSeenAt,
    })
    .from(knowledgeGaps)
    .where(and(eq(knowledgeGaps.workspaceId, workspaceId), eq(knowledgeGaps.status, "open")))
    .orderBy(desc(knowledgeGaps.occurrences), desc(knowledgeGaps.lastSeenAt))
    .limit(10);

  const total = Number(totals?.total ?? 0);
  return {
    days,
    total,
    aiResolved: Number(totals?.aiResolved ?? 0),
    handedOff: Number(totals?.handedOff ?? 0),
    medianFirstResponseSec: totals?.medianFirstResponse != null ? Number(totals.medianFirstResponse) : null,
    csatAvg: totals?.csatAvg != null ? Number(totals.csatAvg) : null,
    csatCount: Number(totals?.csatCount ?? 0),
    series,
    gaps: gaps.map((g) => ({ ...g, lastSeenAt: g.lastSeenAt.toISOString() })),
  };
}

export type WorkspaceAnalytics = Awaited<ReturnType<typeof workspaceAnalytics>>;
