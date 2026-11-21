import type { ReactNode } from "react";
import { BookOpen, Check, Clock } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

/** Two-column auth layout: the form, and a dark panel showing what happens next. */
export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="type-display text-[2.2rem] font-semibold">{title}</h1>
          {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
          <div className="mt-9">{children}</div>
        </div>
        <p className="text-xs text-faint">Realtime chat by Nexconn. Answers by Gemini.</p>
      </main>
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div aria-hidden className="dot-grid-dark absolute inset-0" />
        <div className="relative">{aside}</div>
      </aside>
    </div>
  );
}

/** The setup sequence shown beside sign-up (it is a real ordered process). */
export function SetupSteps() {
  const steps = [
    { title: "Name your help desk", body: "Pick a brand color and a greeting. Your support page goes live at its own address." },
    { title: "Teach it your answers", body: "Write FAQs, paste text, or upload .txt, .md and .pdf files. The assistant answers only from these." },
    { title: "Paste one line on your site", body: "A single script tag adds the chat launcher. Your team picks up when a customer asks for a person." },
  ];
  return (
    <div className="max-w-md">
      <p className="type-display text-3xl font-semibold">Live in about five minutes.</p>
      <ol className="mt-10 flex flex-col gap-8">
        {steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2.25rem_1fr] gap-4">
            <span className="type-figures flex size-9 items-center justify-center rounded-full border border-white/20 bg-ink-raised text-sm font-semibold text-brass">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 rounded-[14px] border border-ink-line bg-ink-raised p-4 text-sm">
        <p className="ml-auto w-fit rounded-[12px] rounded-br-[4px] bg-enamel px-3 py-2">How long does delivery take?</p>
        <div className="mt-3 w-fit max-w-[85%] rounded-[12px] rounded-bl-[4px] bg-white px-3 py-2 text-ink">
          Express orders arrive in 1 business day.
          <span className="mt-2 flex w-fit items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs">
            <BookOpen className="size-3" aria-hidden /> <span className="type-figures font-semibold">1</span> Delivery times
          </span>
        </div>
      </div>
    </div>
  );
}

/** Beside sign-in: the queue an agent comes back to. */
export function QueuePreview() {
  const rows = [
    { name: "Sam Ortiz", topic: "Where is my order?", wait: "6:12", urgent: true },
    { name: "Lena Fischer", topic: "Bike won't shift into 3rd", wait: "2:40", urgent: false },
  ];
  return (
    <div className="max-w-md">
      <p className="type-display text-3xl font-semibold">Your queue is waiting.</p>
      <p className="mt-4 leading-relaxed text-white/65">
        Conversations the assistant couldn&apos;t finish land in Unassigned, oldest first, with how long each customer has waited.
      </p>
      <div className="mt-10 overflow-hidden rounded-[14px] border border-ink-line bg-ink-raised">
        <div className="flex gap-1 border-b border-ink-line px-3 py-2.5 text-xs">
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-ink">Unassigned 2</span>
          <span className="rounded-full px-2.5 py-1 font-medium text-white/60">Mine 1</span>
        </div>
        <ul className="divide-y divide-[color:var(--ink-line)]">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-3 px-4 py-3.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-white/55">{r.topic}</span>
              </span>
              <span
                className={
                  r.urgent
                    ? "type-figures flex items-center gap-1.5 rounded-full bg-brass px-2 py-0.5 text-xs font-semibold text-ink"
                    : "type-figures flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold"
                }
              >
                <Clock className="size-3" aria-hidden /> {r.wait}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-3 px-4 py-3.5 text-sm text-white/55">
            <Check className="size-4 text-fern-wash" aria-hidden /> 14 answered by the assistant today
          </li>
        </ul>
      </div>
    </div>
  );
}
