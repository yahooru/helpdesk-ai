import type { Metadata } from "next";
import Link from "next/link";
import {
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
    body: "From the chat launcher on your site, or your hosted support page. A name is all they give, and the conversation is still there when they come back.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 shadow-sm">
        <p className="ml-auto w-fit max-w-[90%] rounded-[12px] rounded-br-[4px] bg-enamel px-3 py-2 text-sm text-white">What&apos;s your return window?</p>
      </div>
    ),
  },
  {
    title: "The assistant answers from your articles",
    body: "The reply streams in within seconds and cites the article it used. If your articles don't cover it, it says so instead of guessing.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 text-sm shadow-sm">
        <p>You can return unused items within 30 days for a full refund.</p>
        <span className="mt-2 flex w-fit items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs">
          <BookOpen className="size-3" aria-hidden /> <span className="type-figures font-semibold">1</span> Returns and refunds
        </span>
      </div>
    ),
  },
  {
    title: "They ask for a person",
    body: "One button, always in view, or just saying it. The conversation lands in Unassigned with a timer showing how long they've waited.",
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
    title: "Your agent joins the same chat",
    body: "No new thread, no email chain. The customer sees who joined, when they're typing, and when their message was read.",
    aside: (
      <div className="rounded-[14px] border border-line bg-surface p-3 text-sm shadow-sm">
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> Maya joined the conversation <span className="h-px flex-1 bg-line" />
        </p>
        <p className="mt-2 flex items-center justify-end gap-1 text-xs text-faint">
          <Check className="size-3 text-fern" aria-hidden /> Seen
        </p>
      </div>
    ),
  },
  {
    title: "Resolved, rated, and smarter next time",
    body: "A rating card closes the loop. Questions the assistant couldn't answer become article drafts, written from what your agent actually said.",
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
  { api: "Group channels", body: "Every conversation is one live room. Agents join it, transfers move them in and out, and the customer never starts over." },
  { api: "Streaming messages", body: "The assistant's answer appears as it's written, in the same message the customer keeps." },
  { api: "Read receipts", body: "“Seen” under the customer's message the moment your agent reads it, and the other way round." },
  { api: "Typing status", body: "Both sides see when the other is typing, including the assistant while it looks things up." },
  { api: "Presence", body: "New conversations go round-robin to teammates who are actually online and available." },
  { api: "Message metadata", body: "Citations, “That helped” and ratings travel on the message itself and update live." },
  { api: "Media messages", body: "Screenshots and files in both directions, with upload progress." },
  { api: "History", body: "Returning customers scroll back through their whole conversation, page by page." },
];

const FAQ = [
  {
    q: "What does the assistant answer from?",
    a: "Only the articles you add: FAQs you write in the app, text you paste, or .txt, .md and .pdf files you upload. Every answer cites the article it used, and customers can open it.",
  },
  {
    q: "What happens when it doesn't know?",
    a: "It says so plainly and offers a person, or hands the conversation to your team right away. You choose which in the assistant settings. Those questions also show up in Analytics so you can write the missing article.",
  },
  {
    q: "Do I need a website?",
    a: "No. Every help desk gets a hosted support page with the chat and your public articles. Link it from your email signature, social profiles or packaging.",
  },
  {
    q: "How does a customer reach a person?",
    a: "“Talk to a person” is always on screen, and asking in words (“can I speak to someone?”) works too. If nobody is online, the customer is told the team will reply in the same chat and can leave an email.",
  },
  {
    q: "How do I add my team?",
    a: "Settings, then Team: create an invite link for an admin or an agent. Links are single use and expire after seven days. Agents set themselves available or away, and only available, online agents receive new conversations.",
  },
  {
    q: "What does it cost?",
    a: "It's free to start, with no credit card. Create a help desk, add your answers and put it on your site in about five minutes.",
  },
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
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="dot-grid absolute inset-x-0 top-0 h-[720px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-10 lg:pt-20 lg:pb-28">
            <div>
              <h1 className="type-display text-[2.6rem] font-semibold sm:text-6xl lg:text-[4.1rem]">
                Answers in seconds. A person when it matters.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                HelpDesk AI answers your customers from your own help articles, cites the source, and hands the same live chat to your team
                the moment someone asks for a person. Set it up in about five minutes.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex h-12 items-center rounded-[10px] bg-enamel px-6 text-base font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-10px_var(--enamel)] transition-[background-color,transform] hover:-translate-y-px hover:bg-enamel-strong"
                >
                  {primaryLabel}
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center rounded-[10px] border border-line-strong bg-surface px-5 text-base font-medium shadow-sm transition-colors hover:bg-wash"
                >
                  See how it works
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {["Free to start, no card", "Live in five minutes", "Works on any website"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="size-4 text-fern" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <HeroDemo />
          </div>
        </section>

        {/* Install */}
        <section className="px-4 sm:px-6">
          <div data-reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] bg-ink text-white">
            <div aria-hidden className="dot-grid-dark absolute inset-0" />
            <div className="relative grid gap-10 px-6 py-12 sm:px-12 sm:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
              <div>
                <h2 className="type-display text-3xl font-semibold sm:text-4xl">The whole install is one line.</h2>
                <p className="mt-4 max-w-md text-white/70">
                  Paste it before the closing body tag of any website or site builder. It adds a chat launcher in the corner; the chat runs
                  on its own, so it never slows your page or clashes with your styles.
                </p>
                <p className="mt-6 flex items-center gap-2 text-sm text-white/70">
                  <Globe className="size-4 text-brass" aria-hidden />
                  No website? You also get a hosted support page at <span className="font-mono text-white">/s/your-business</span>
                </p>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-ink-line bg-ink-raised">
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
          </div>
        </section>

        {/* Journey */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-32">
            <div className="lg:sticky lg:top-28 lg:self-start" data-reveal>
              <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">One conversation, start to finish.</h2>
              <p className="mt-4 text-muted">
                The customer never repeats themselves. The assistant, the handoff, your agent and the rating all happen in one live chat.
              </p>
            </div>
            <ScrollJourney steps={JOURNEY} />
          </div>
        </section>

        {/* Features by role */}
        <section id="features" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
            <div className="max-w-2xl" data-reveal>
              <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">Built for everyone in the conversation.</h2>
              <p className="mt-4 text-muted">The owner who sets it up, the agents who answer, and the customer who just wants their answer.</p>
            </div>

            <div className="mt-16 flex flex-col gap-20">
              <FeatureRow
                title="For the owner"
                body="Teach it once, then see exactly where it needs help."
                items={[
                  "Write FAQs, paste text, or upload .txt, .md and .pdf files",
                  "Choose the assistant's name, tone and when it hands off",
                  "Brand color, logo and greeting on the widget and support page",
                  "See AI-resolved vs handed off, first response time and ratings",
                ]}
                visual={<OwnerVisual />}
              />
              <FeatureRow
                reverse
                title="For agents"
                body="A focused inbox that shows who's been waiting longest."
                items={[
                  "Unassigned, Mine, All open and Resolved, with live counts",
                  "Waiting timers that turn brass when a customer has waited too long",
                  "Saved replies, AI-drafted replies you edit, and internal notes",
                  "Claim, transfer, resolve and reopen without leaving the chat",
                ]}
                visual={<AgentVisual />}
              />
              <FeatureRow
                title="For customers"
                body="An answer now, and a person whenever they want one."
                items={[
                  "Answers in seconds with the source article one tap away",
                  "“Talk to a person” always in view, or just ask in words",
                  "Typing, “Seen” and who joined, so nobody waits in the dark",
                  "Screenshots and files, and their history when they come back",
                ]}
                visual={<CustomerVisual />}
              />
            </div>
          </div>
        </section>

        {/* Realtime */}
        <section id="realtime" className="scroll-mt-20 bg-ink text-white">
          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div data-reveal>
                <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">Realtime by Nexconn. Grounded answers by Gemini.</h2>
                <p className="mt-5 max-w-md text-white/70">
                  Every conversation is a Nexconn group channel that the customer, the assistant and your agents share. Answers come from
                  Gemini, retrieved only from your own articles.
                </p>
                <div className="mt-8 rounded-[14px] border border-ink-line bg-ink-raised p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-brass" aria-hidden /> How an answer is made
                  </p>
                  <ol className="mt-4 flex flex-col gap-3 text-sm text-white/75">
                    {[
                      "Your articles are split into passages and embedded into a vector index.",
                      "Each question pulls the closest passages, and only those reach the model.",
                      "The model must cite a passage or reply that it doesn't know.",
                      "The answer streams into the chat with its sources attached.",
                    ].map((s, i) => (
                      <li key={s} className="grid grid-cols-[1.5rem_1fr] gap-2">
                        <span className="type-figures text-brass">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <dl className="grid gap-px overflow-hidden rounded-[16px] border border-ink-line bg-[color:var(--ink-line)] sm:grid-cols-2" data-reveal>
                {REALTIME.map((r) => (
                  <div key={r.api} className="bg-ink p-5 transition-colors hover:bg-ink-raised">
                    <dt className="text-sm font-semibold text-white">{r.api}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-white/65">{r.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-28">
            <div data-reveal>
              <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">Questions owners ask.</h2>
              <p className="mt-4 text-muted">
                Anything else? Create a help desk and try it on yourself. It takes about as long as reading this page.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-[1.05rem] font-semibold transition-colors hover:text-enamel">
                    {f.q}
                    <Plus className="faq-plus size-5 shrink-0 text-muted transition-transform duration-300" aria-hidden />
                  </summary>
                  <p className="max-w-2xl pb-6 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="px-4 pb-24 sm:px-6">
          <div data-reveal className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 overflow-hidden rounded-[24px] bg-enamel px-6 py-14 text-white sm:px-12 lg:flex-row lg:items-center lg:justify-between">
            <BrandGlyph size={260} className="pointer-events-none absolute -right-10 -bottom-16 opacity-[0.12] [&_*]:fill-white" />
            <div className="relative max-w-xl">
              <h2 className="type-display text-3xl font-semibold sm:text-[2.6rem]">Open your help desk today.</h2>
              <p className="mt-4 text-white/80">Name it, add your top questions, paste one line. The assistant handles the first answer; your team handles the rest.</p>
            </div>
            <Link
              href={primaryHref}
              className="relative inline-flex h-12 shrink-0 items-center rounded-[10px] bg-white px-6 text-base font-semibold text-enamel-strong shadow-md transition-transform hover:-translate-y-px"
            >
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <BrandMark />
            <p className="mt-3 max-w-xs text-sm text-muted">Customer support a small business can set up in five minutes.</p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: "#how-it-works", label: "How it works" },
              { href: "#features", label: "Features" },
              { href: "#faq", label: "FAQ" },
            ]}
          />
          <FooterColumn
            title="Get started"
            links={[
              { href: "/signup", label: "Create your help desk" },
              { href: "/login", label: "Sign in" },
            ]}
          />
          <FooterColumn
            title="Built with"
            links={[
              { href: "https://www.nexconn.ai", label: "Nexconn realtime chat", external: true },
              { href: "https://ai.google.dev", label: "Gemini", external: true },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-faint sm:px-6">&copy; {new Date().getFullYear()} HelpDesk AI</p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string; external?: boolean }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                {l.label} <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            ) : (
              <a href={l.href} className="hover:text-ink">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureRow({
  title,
  body,
  items,
  visual,
  reverse,
}: {
  title: string;
  body: string;
  items: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : undefined} data-reveal>
        <h3 className="type-display text-2xl font-semibold sm:text-3xl">{title}</h3>
        <p className="mt-3 text-lg text-muted">{body}</p>
        <ul className="mt-7 flex flex-col gap-3.5">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-enamel-wash text-enamel">
                <Check className="size-3" aria-hidden />
              </span>
              <span>{item}</span>
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
          <Lightbulb className="size-4 text-brass-strong" /> Questions the assistant couldn&apos;t answer
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-wash px-3 py-2.5 text-sm">
          <span className="min-w-0 truncate">&ldquo;Do you price-match other shops?&rdquo;</span>
          <span className="type-figures shrink-0 text-xs text-muted">asked 4 times</span>
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
        <div className="rounded-[14px] border border-dashed border-line-strong bg-surface p-3.5 text-sm shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Lock className="size-3" /> Internal note
          </p>
          <p className="mt-1">Second bike from Sam this year. Expedite if it&apos;s late.</p>
        </div>
        <div className="rounded-[14px] border border-line bg-surface p-3.5 text-sm shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-enamel">
            <MessageSquareReply className="size-3" /> Suggested reply
          </p>
          <p className="mt-1 text-muted">Your order left our warehouse on Tuesday and arrives Friday.</p>
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
            Yes, on the top rack. Hand-wash the gold-rim range to keep the glaze bright.
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
