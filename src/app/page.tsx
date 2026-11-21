import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Clock,
  FileText,
  Globe,
  Laugh,
  Lightbulb,
  Lock,
  MessageSquareReply,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BrandGlyph, BrandMark } from "@/components/brand-mark";
import { CopyButton } from "@/components/copy-button";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { RevealOnScroll, ScrollJourney, StickyHeader } from "@/components/marketing/motion";
import { currentUser } from "@/lib/auth/guards";
import { appOrigin, widgetSnippet } from "@/lib/origin";

export const metadata: Metadata = {
  title: { absolute: "HelpDesk AI: answers in seconds, a person when it matters" },
  alternates: { canonical: "/" },
};

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#realtime", label: "Under the hood" },
  { href: "#faq", label: "FAQ" },
];

const JOURNEY = [
  {
    title: "A customer asks",
    body: "From your site or your support page.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 shadow-sm">
        <p className="ml-auto w-fit max-w-[90%] rounded-[12px] rounded-br-[4px] bg-enamel px-3 py-2 text-sm text-white">What&apos;s your return window?</p>
      </div>
    ),
  },
  {
    title: "The AI answers",
    body: "In seconds, citing your own article.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 text-sm shadow-sm">
        <p>Unused items can be returned within 30 days.</p>
        <span className="mt-2 flex w-fit items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs">
          <BookOpen className="size-3" aria-hidden /> <span className="type-figures font-semibold">1</span> Returns and refunds
        </span>
      </div>
    ),
  },
  {
    title: "They ask for a person",
    body: "One tap. A waiting timer starts.",
    aside: (
      <div className="flex items-center justify-between rounded-[14px] border border-line bg-brass-wash p-3 text-sm shadow-sm">
        <span className="font-semibold">Alex Kim</span>
        <span className="type-figures flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold">
          <span className="waiting-pulse size-2 rounded-full bg-brass" /> 0:42
        </span>
      </div>
    ),
  },
  {
    title: "An agent joins",
    body: "Same chat, live. No starting over.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 text-sm shadow-sm">
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> Maya joined <span className="h-px flex-1 bg-line" />
        </p>
        <p className="mt-2 flex items-center justify-end gap-1 text-xs text-faint">
          <Check className="size-3 text-fern" aria-hidden /> Seen
        </p>
      </div>
    ),
  },
  {
    title: "Resolved and rated",
    body: "Unanswered questions become article drafts.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 text-sm shadow-sm">
        <p className="flex items-center gap-2 font-medium">
          <Laugh className="size-4 text-enamel" aria-hidden /> Rated 5 of 5
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          <Lightbulb className="size-3.5 text-brass-strong" aria-hidden /> New draft: &ldquo;Can I return a sale item?&rdquo;
        </p>
      </div>
    ),
  },
];

const REALTIME = [
  { api: "Group channels", body: "One live room per conversation." },
  { api: "Streaming", body: "Answers appear as they're written." },
  { api: "Read receipts", body: "“Seen” on every message." },
  { api: "Typing", body: "Both sides see it, the AI too." },
  { api: "Presence", body: "Chats go to agents who are online." },
  { api: "Metadata", body: "Sources and ratings ride on the message." },
];

const PIPELINE = [
  { icon: FileText, label: "Your articles" },
  { icon: Search, label: "Closest passages" },
  { icon: Sparkles, label: "Gemini" },
  { icon: BookOpen, label: "Answer + source" },
];

const FAQ = [
  { q: "What does the AI answer from?", a: "Only the articles and files you add. Every answer cites its source." },
  { q: "What if it doesn't know?", a: "It says so and offers a person, or hands off right away. Your choice." },
  { q: "Do I need a website?", a: "No. Every help desk also gets a hosted support page." },
  { q: "What does it cost?", a: "Free to start. No credit card." },
];

export default async function Home() {
  const [user, origin] = await Promise.all([currentUser(), appOrigin()]);
  const primaryHref = user ? "/app" : "/signup";
  const primaryLabel = user ? "Open console" : "Create your help desk";
  const snippet = widgetSnippet(origin, "your-business");

  return (
    <div className="min-h-dvh overflow-x-clip">
      <RevealOnScroll />
      <StickyHeader>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <BrandMark />
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-wash hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Account" className="flex items-center gap-1.5">
            {user ? null : (
              <Link href="/login" className="hidden h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium hover:bg-wash sm:inline-flex">
                Sign in
              </Link>
            )}
            <Link
              href={primaryHref}
              className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-ink px-3.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] transition-colors hover:bg-ink-raised"
            >
              {user ? "Open console" : "Get started"}
            </Link>
          </nav>
        </div>
      </StickyHeader>

      <main>
        {/* Hero: one statement, one line, one action, then the product doing its job. */}
        <section className="relative">
          <div aria-hidden className="dot-grid absolute inset-x-0 top-0 h-[560px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 pt-10 text-center sm:px-6 lg:pt-14">
            <Link
              href="#realtime"
              className="hero-line inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm text-muted shadow-sm transition-colors hover:text-ink"
            >
              <span className="flex items-center gap-1.5 rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white">
                <span className="size-1.5 rounded-full bg-fern-wash" /> Live
              </span>
              Realtime on Nexconn
            </Link>
            <h1 className="type-display mx-auto mt-6 max-w-5xl text-[2.6rem] font-semibold text-balance sm:text-6xl lg:text-[4.6rem]">
              <span className="hero-line block [animation-delay:80ms]">Answers in seconds.</span>
              <span className="hero-line block [animation-delay:180ms]">A person when it matters.</span>
            </h1>
            <p className="hero-line mx-auto mt-5 max-w-2xl text-lg text-balance text-muted [animation-delay:280ms]">
              AI answers from your help articles. Your team takes over in the same chat.
            </p>
            <div className="hero-line mt-8 flex flex-wrap justify-center gap-3 [animation-delay:380ms]">
              <Link
                href={primaryHref}
                className="group inline-flex h-12 items-center gap-2 rounded-[10px] bg-enamel px-6 text-base font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-10px_var(--enamel)] transition-[background-color,transform] hover:-translate-y-px hover:bg-enamel-strong"
              >
                {primaryLabel}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-[10px] border border-line-strong bg-surface px-5 text-base font-medium shadow-sm transition-colors hover:bg-wash"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="relative mx-auto mt-12 max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
            <div className="hero-line relative overflow-hidden rounded-[28px] bg-ink px-4 py-8 shadow-lg [animation-delay:500ms] sm:px-10 sm:py-12">
              <div aria-hidden className="dot-grid-dark absolute inset-0" />
              <div className="relative">
                <HeroDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="px-4 sm:px-6">
          <div data-reveal className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-center">
            <div>
              <h2 className="type-display text-3xl font-semibold sm:text-4xl">One line. Any website.</h2>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Globe className="size-4 shrink-0 text-enamel" aria-hidden />
                No website? Use your hosted support page.
              </p>
            </div>
            <div className="overflow-hidden rounded-[16px] border border-ink-line bg-ink text-white shadow-lg">
              <div className="flex items-center justify-between border-b border-ink-line px-4 py-2.5">
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                </span>
                <CopyButton value={snippet} label="Copy" className="!h-7 !border-white/15 !bg-transparent !text-white hover:!bg-white/10" />
              </div>
              <pre className="scrollbar-thin overflow-x-auto px-5 py-5 font-mono text-[13px] leading-7 sm:text-sm">
                <code>
                  <span className="text-white/50">&lt;script</span>
                  {"\n  "}
                  <span className="text-white/80">src=</span>
                  <span className="text-brass">&quot;{origin}/widget.js&quot;</span>
                  {"\n  "}
                  <span className="text-white/80">data-workspace=</span>
                  <span className="text-brass">&quot;your-business&quot;</span>
                  {"\n  "}
                  <span className="text-white/80">async</span>
                  <span className="text-white/50">&gt;&lt;/script&gt;</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-32">
            <div className="lg:sticky lg:top-28 lg:self-start" data-reveal>
              <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">One chat, start to finish.</h2>
            </div>
            <ScrollJourney steps={JOURNEY} />
          </div>
        </section>

        {/* Features by role */}
        <section id="features" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
            <h2 className="type-display max-w-xl text-3xl font-semibold sm:text-[2.6rem]" data-reveal>
              Built for everyone in the chat.
            </h2>
            <div className="mt-16 flex flex-col gap-20">
              <FeatureRow
                title="For owners"
                items={["Upload FAQs, docs and PDFs", "Set the tone and handoff rules", "See what it couldn't answer"]}
                visual={<OwnerVisual />}
              />
              <FeatureRow
                reverse
                title="For agents"
                items={["Queues with waiting timers", "Notes, saved and suggested replies", "Claim, transfer, resolve"]}
                visual={<AgentVisual />}
              />
              <FeatureRow
                title="For customers"
                items={["Answers with sources", "A person, any time", "Their history when they return"]}
                visual={<CustomerVisual />}
              />
            </div>
          </div>
        </section>

        {/* Realtime */}
        <section id="realtime" className="scroll-mt-20 bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
            <h2 className="type-display max-w-2xl text-3xl font-semibold sm:text-4xl" data-reveal>
              Realtime by Nexconn. Answers by Gemini.
            </h2>
            <ol className="mt-12 grid gap-3 sm:grid-cols-4" data-reveal>
              {PIPELINE.map((p, i) => (
                <li key={p.label} className="relative flex items-center gap-3 rounded-[14px] border border-ink-line bg-ink-raised px-4 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-brass">
                    <p.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">{p.label}</span>
                  {i < PIPELINE.length - 1 ? (
                    <ArrowRight aria-hidden className="absolute top-1/2 -right-[13px] z-10 hidden size-4 -translate-y-1/2 text-white/40 sm:block" />
                  ) : null}
                </li>
              ))}
            </ol>
            <dl className="mt-3 grid gap-px overflow-hidden rounded-[16px] border border-ink-line bg-[color:var(--ink-line)] sm:grid-cols-2 lg:grid-cols-3" data-reveal>
              {REALTIME.map((r) => (
                <div key={r.api} className="bg-ink p-5 transition-colors hover:bg-ink-raised">
                  <dt className="text-sm font-semibold">{r.api}</dt>
                  <dd className="mt-1 text-sm text-white/60">{r.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-28">
            <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]" data-reveal>
              Questions.
            </h2>
            <div className="divide-y divide-line border-y border-line" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-[1.05rem] font-semibold transition-colors hover:text-enamel">
                    {f.q}
                    <Plus className="faq-plus size-5 shrink-0 text-muted transition-transform duration-300" aria-hidden />
                  </summary>
                  <p className="pb-5 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="px-4 pb-24 sm:px-6">
          <div
            data-reveal
            className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 overflow-hidden rounded-[24px] bg-enamel px-6 py-14 text-white sm:px-12 lg:flex-row lg:items-center lg:justify-between"
          >
            <BrandGlyph
              size={300}
              body="#fff"
              bell="var(--enamel)"
              button="var(--enamel)"
              className="pointer-events-none absolute -right-8 -bottom-20 rotate-[-8deg] opacity-[0.13]"
            />
            <h2 className="type-display relative text-3xl font-semibold sm:text-[2.6rem]">Open your help desk today.</h2>
            <Link
              href={primaryHref}
              className="relative inline-flex h-12 shrink-0 items-center gap-2 rounded-[10px] bg-white px-6 text-base font-semibold text-enamel-strong shadow-md transition-transform hover:-translate-y-px"
            >
              {primaryLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <BrandMark />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <a href="https://www.nexconn.ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
              Nexconn <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </nav>
          <p className="text-xs text-faint">&copy; {new Date().getFullYear()} HelpDesk AI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({ title, items, visual, reverse }: { title: string; items: string[]; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : undefined} data-reveal>
        <h3 className="type-display text-2xl font-semibold sm:text-3xl">{title}</h3>
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 text-lg">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-enamel-wash text-enamel">
                <Check className="size-3.5" aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : undefined} data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
        <div className="dot-grid rounded-[20px] border border-line bg-canvas p-5 sm:p-8" aria-hidden>
          {visual}
        </div>
      </div>
    </div>
  );
}

function OwnerVisual() {
  const sources = [
    { icon: FileText, name: "Shipping and delivery.md", status: "ready", meta: "6 passages" },
    { icon: FileText, name: "Returns policy.pdf", status: "ready", meta: "11 passages" },
    { icon: BookOpen, name: "Warranty and repairs", status: "indexing", meta: "Indexing" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-line bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold">Knowledge</span>
          <span className="rounded-full bg-enamel px-2.5 py-1 text-xs font-medium text-white">Add knowledge</span>
        </div>
        <ul className="divide-y divide-line">
          {sources.map((s) => (
            <li key={s.name} className="flex items-center gap-3 px-4 py-3 text-sm">
              <s.icon className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              {s.status === "ready" ? (
                <span className="rounded-full bg-fern-wash px-2 py-0.5 text-xs font-medium text-fern">{s.meta}</span>
              ) : (
                <span className="skeleton h-5 w-20" />
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="ml-auto w-[88%] rounded-[14px] border border-line bg-surface p-4 shadow-md">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-brass-strong" /> Couldn&apos;t answer
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-wash px-3 py-2.5 text-sm">
          <span className="min-w-0 truncate">&ldquo;Do you price-match?&rdquo;</span>
          <span className="type-figures shrink-0 text-xs text-muted">4 times</span>
        </div>
        <span className="mt-3 inline-flex rounded-[8px] border border-line-strong px-2.5 py-1 text-xs font-medium">Write article</span>
      </div>
    </div>
  );
}

function AgentVisual() {
  const rows = [
    { name: "Sam Ortiz", topic: "Where is my order?", wait: "6:12", level: "breach" },
    { name: "Lena Fischer", topic: "Bike won't shift into 3rd", wait: "2:40", level: "warn" },
    { name: "Omar Haddad", topic: "Gift card balance", wait: "0:35", level: "ok" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-line bg-surface shadow-md">
        <div className="flex gap-1 border-b border-line px-3 py-2.5 text-xs">
          <span className="rounded-full bg-ink px-2.5 py-1 font-medium text-white">Unassigned 3</span>
          <span className="rounded-full px-2.5 py-1 font-medium text-muted">Mine 2</span>
          <span className="rounded-full px-2.5 py-1 font-medium text-muted">All open 7</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wash text-xs font-semibold">
                {r.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-muted">{r.topic}</span>
              </span>
              <span
                className={
                  r.level === "breach"
                    ? "type-figures flex items-center gap-1 rounded-full bg-brass px-2 py-0.5 text-xs font-semibold text-ink"
                    : r.level === "warn"
                      ? "type-figures flex items-center gap-1 rounded-full bg-brass-wash px-2 py-0.5 text-xs font-semibold"
                      : "type-figures flex items-center gap-1 rounded-full bg-wash px-2 py-0.5 text-xs font-medium text-muted"
                }
              >
                <Clock className="size-3" /> {r.wait}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] border border-dashed border-[color:var(--brass-strong)] bg-brass-wash p-3.5 text-sm shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-brass-strong">
            <Lock className="size-3" /> Internal note
          </p>
          <p className="mt-1">Second order this month. Expedite.</p>
        </div>
        <div className="rounded-[14px] border border-line bg-surface p-3.5 text-sm shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-enamel">
            <MessageSquareReply className="size-3" /> Suggested reply
          </p>
          <p className="mt-1 text-muted">It arrives Friday.</p>
        </div>
      </div>
    </div>
  );
}

function CustomerVisual() {
  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[18px] border border-line bg-canvas shadow-lg">
      <div className="flex items-center gap-3 bg-[#0E6378] px-4 py-3 text-white">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">L</span>
        <div>
          <p className="text-sm font-semibold">Larkspur Ceramics</p>
          <p className="text-xs text-white/80">AI assistant replies in seconds</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p className="ml-auto max-w-[80%] rounded-[12px] rounded-br-[4px] bg-[#0E6378] px-3 py-2 text-white">Are your mugs dishwasher safe?</p>
        <div>
          <span className="mb-1 flex items-center gap-1 text-[11px] text-muted">
            <Bot className="size-3" /> Larkspur Assistant (AI)
          </span>
          <div className="max-w-[88%] rounded-[12px] rounded-bl-[4px] border border-line bg-surface px-3 py-2">
            Yes, on the top rack.
            <span className="mt-2 flex w-fit items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px]">
              <BookOpen className="size-3" /> <span className="type-figures font-semibold">1</span> Caring for your ceramics
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium">That helped</span>
          <span className="flex items-center gap-1 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium">
            <UserRound className="size-3" /> Talk to a person
          </span>
        </div>
      </div>
    </div>
  );
}
