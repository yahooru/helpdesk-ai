import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "ledger" | "marker" | "ink" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-wash text-ink",
  ledger: "bg-enamel-wash text-enamel-strong",
  marker: "bg-brass text-ink",
  ink: "bg-ink text-white",
  outline: "border border-line-strong text-muted",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-6 py-10", className)}>
      <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="max-w-sm">
        <h3 className="type-heading text-lg font-semibold">{title}</h3>
        {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[var(--radius-panel)] border border-line bg-surface", className)}>{children}</section>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="max-w-2xl">
        <h1 className="type-heading text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
