import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

/** Two-column auth layout: the form, and a quiet statement of what happens next. */
export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <h1 className="type-display text-3xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <aside className="hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14">{aside}</aside>
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
      <p className="type-heading text-xl font-semibold">Live in about five minutes</p>
      <ol className="mt-8 flex flex-col gap-7">
        {steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="type-figures flex size-8 items-center justify-center rounded-full border border-line-strong text-sm font-semibold">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
