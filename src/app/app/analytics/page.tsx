import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyChart } from "@/components/analytics/daily-chart";
import { KnowledgeGaps } from "@/components/analytics/knowledge-gaps";
import { PageHeader, Panel } from "@/components/ui/misc";
import { staffContext } from "@/lib/auth/guards";
import { workspaceAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/time";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90];

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="type-figures type-heading mt-1 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  if (ctx.membership.role !== "admin") redirect("/app/inbox");
  const daysParam = Number((await searchParams).days);
  const days = RANGES.includes(daysParam) ? daysParam : 30;
  const a = await workspaceAnalytics(ctx.workspace.id, days);
  const aiRate = a.total ? Math.round((a.aiResolved / a.total) * 100) : null;
  const handoffRate = a.total ? Math.round((a.handedOff / a.total) * 100) : null;

  return (
    <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <PageHeader
          title="Analytics"
          description="How much the assistant handles on its own, how fast your team responds, and what customers rate you."
          actions={
            <nav aria-label="Date range" className="flex rounded-[var(--radius-control)] border border-line-strong bg-surface p-0.5">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={`/app/analytics?days=${r}`}
                  aria-current={r === days ? "page" : undefined}
                  className={cn("rounded-[5px] px-3 py-1 text-sm font-medium", r === days ? "bg-ink text-white" : "text-muted hover:text-ink")}
                >
                  {r} days
                </Link>
              ))}
            </nav>
          }
        />

        <Panel className="mt-6 grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
          <Stat label="Conversations" value={String(a.total)} detail={`Last ${days} days`} />
          <Stat
            label="Resolved by AI"
            value={aiRate == null ? "None yet" : `${aiRate}%`}
            detail={a.total ? `${a.aiResolved} of ${a.total}, ${handoffRate}% handed to the team` : "No conversations yet"}
          />
          <Stat
            label="Median first response"
            value={a.medianFirstResponseSec == null ? "None yet" : formatDuration(a.medianFirstResponseSec * 1000)}
            detail="From asking for a person to a teammate's first reply"
          />
          <Stat
            label="Customer rating"
            value={a.csatAvg == null ? "None yet" : `${a.csatAvg.toFixed(1)} / 5`}
            detail={a.csatCount ? `${a.csatCount} rating${a.csatCount === 1 ? "" : "s"}` : "Sent when a conversation is resolved"}
          />
        </Panel>

        <Panel className="mt-6 px-5 py-5">
          <h2 className="type-heading text-lg font-semibold">Conversations per day</h2>
          <p className="mb-4 text-sm text-muted">By outcome, in UTC days.</p>
          {a.total === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No conversations in this range. Share your support page or install the widget to get started.
            </p>
          ) : (
            <DailyChart series={a.series} />
          )}
        </Panel>

        <Panel className="mt-6 px-5 py-5">
          <h2 className="type-heading text-lg font-semibold">Questions the assistant couldn&apos;t answer</h2>
          <p className="mb-2 text-sm text-muted">Similar questions are grouped. Write the missing article and the assistant uses it from the next message on.</p>
          <KnowledgeGaps initial={a.gaps} />
        </Panel>
      </div>
    </main>
  );
}
