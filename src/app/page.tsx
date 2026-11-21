import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BookOpen, Bot, Clock, FileUp, Inbox, Lock, MessageCircle, ShieldCheck, Star, UserRound, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { currentUser } from "@/lib/auth/guards";
import { appOrigin } from "@/lib/origin";

export const metadata: Metadata = {
  title: { absolute: "HelpDesk AI: customer support you can set up in five minutes" },
};

const FLOW = [
  { icon: MessageCircle, title: "A customer asks", body: "From the chat launcher on your site, or your hosted support page. A name is all they need to give." },
  { icon: Bot, title: "The assistant answers from your articles", body: "The reply streams in within seconds and cites the article it used. If your articles don't cover it, it says so." },
  { icon: UserRound, title: "They ask for a person", body: "One button, or just saying it. The conversation lands in your Unassigned queue with a waiting timer." },
  { icon: Inbox, title: "Your agent joins the same chat", body: "No new thread, no email. The customer sees who joined and when their message was read." },
  { icon: Star, title: "Resolved and rated", body: "A rating card closes the loop. Questions the assistant couldn't answer become article drafts." },
];

const AUDIENCES = [
  {
    title: "For the owner",
    items: [
      { icon: FileUp, text: "FAQs written in the app, pasted text, or uploaded .txt, .md and .pdf files" },
      { icon: ShieldCheck, text: "Choose the assistant's tone and when it hands off to a person" },
      { icon: BarChart3, text: "AI-resolved vs handed off, first response time, ratings, knowledge gaps" },
    ],
  },
  {
    title: "For agents",
    items: [
      { icon: Clock, text: "Queues with live counts and timers for customers waiting on a first reply" },
      { icon: Lock, text: "Internal notes, saved replies and AI-drafted replies you edit before sending" },
      { icon: Users, text: "Round-robin assignment among teammates who are online and available" },
    ],
  },
  {
    title: "For customers",
    items: [
      { icon: Bot, text: "An answer in seconds, with the source article one tap away" },
      { icon: UserRound, text: "A person whenever they want one, in the same conversation" },
      { icon: BookOpen, text: "Their conversation is still there when they come back" },
    ],
  },
];

export default async function Home() {
  const [user, origin] = await Promise.all([currentUser(), appOrigin()]);
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandMark />
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Link href="/app" className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-ink px-3.5 text-sm font-medium text-white">
              Open console
            </Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium hover:bg-wash">
                Sign in
              </Link>
              <Link href="/signup" className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-ledger px-3.5 text-sm font-medium text-white hover:bg-ledger-strong">
                Create your help desk
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
          <h1 className="type-display max-w-4xl text-4xl font-semibold sm:text-5xl lg:text-[4rem]">
            Answers in seconds from your own help articles. A person the moment it matters.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            HelpDesk AI answers your customers first, cites the article it used, and hands the same live conversation to your team
            when someone asks for a person. Set it up in about five minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={user ? "/app" : "/signup"} className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-ledger px-5 font-medium text-white hover:bg-ledger-strong">
              {user ? "Open console" : "Create your help desk"}
            </Link>
            <span className="text-sm text-muted">Free to start. No credit card.</span>
          </div>

          <figure className="mt-16 max-w-4xl">
            <div className="overflow-x-auto rounded-[var(--radius-panel)] bg-ink px-5 py-5 text-white">
              <code className="font-mono text-[13px] whitespace-nowrap sm:text-[15px]">
                <span className="text-white/60">&lt;script </span>
                <span>src=</span>
                <span className="text-marker">&quot;{origin}/widget.js&quot;</span>
                <span> data-workspace=</span>
                <span className="text-marker">&quot;your-business&quot;</span>
                <span className="text-white/60"> async&gt;&lt;/script&gt;</span>
              </code>
            </div>
            <figcaption className="mt-3 text-sm text-muted">
              That is the whole install. It adds a chat launcher to any website; no website needed for the hosted support page.
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <h2 className="type-heading text-2xl font-semibold">One conversation, start to finish</h2>
              <p className="mt-2 text-muted">The customer never repeats themselves. Everything happens in one live chat.</p>
            </div>
            <ol className="relative flex flex-col gap-8 border-l border-line-strong pl-8">
              {FLOW.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-[45px] flex size-[26px] items-center justify-center rounded-full border border-line-strong bg-surface">
                    <step.icon className="size-3.5" aria-hidden />
                  </span>
                  <p className="type-figures text-xs font-semibold text-faint">Step {i + 1}</p>
                  <h3 className="mt-0.5 font-semibold">{step.title}</h3>
                  <p className="mt-1 max-w-xl text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title}>
              <h2 className="type-heading text-lg font-semibold">{a.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {a.items.map((item) => (
                  <li key={item.text} className="flex gap-3 text-[15px]">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-ledger" aria-hidden />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start gap-4 rounded-[var(--radius-panel)] border border-line bg-surface px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="type-heading text-xl font-semibold">Open your help desk today</h2>
              <p className="mt-1 text-muted">Name it, add your top questions, paste one line. Your team handles the rest.</p>
            </div>
            <Link href={user ? "/app" : "/signup"} className="inline-flex h-11 shrink-0 items-center rounded-[var(--radius-control)] bg-ledger px-5 font-medium text-white hover:bg-ledger-strong">
              {user ? "Open console" : "Create your help desk"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>HelpDesk AI</span>
          <span>Realtime chat by Nexconn. Answers by Gemini.</span>
        </div>
      </footer>
    </div>
  );
}
