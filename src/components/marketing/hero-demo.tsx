"use client";
import { Angry, BookOpen, Bot, Check, Frown, Laugh, Lock, Meh, Send, Smile, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The landing page's one orchestrated moment: a single support conversation played end to end.
 * Everything on screen is derived from one clock, so the chat and the agent's inbox stay in step.
 * With reduced motion the finished conversation is shown, still.
 */

const LOOP_MS = 21_000;
const T = {
  ask1: 700,
  think1: 1500,
  answer1: 2700,
  ask2: 6200,
  think2: 7000,
  answer2: 7900,
  press: 10_000,
  queued: 10_400,
  joined: 13_200,
  typing: 14_000,
  reply: 15_600,
  seen: 16_200,
  rating: 17_600,
  rated: 18_900,
};

const ANSWER_1 = "Yes. Standard delivery to Canada takes 5 to 7 business days, and it's free on orders over $60.";
const ANSWER_2 = "I can't change an order myself, but someone on the team can. Want me to bring them in?";
const REPLY = "Done. Order 4821 now ships to 18 King St. A new confirmation email is on its way.";

const FACES = [Angry, Frown, Meh, Smile, Laugh];

function streamed(text: string, start: number, t: number, wordMs = 55) {
  if (t < start) return "";
  const words = text.split(" ");
  return words.slice(0, Math.min(words.length, Math.floor((t - start) / wordMs) + 1)).join(" ");
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="typing-dot size-1.5 rounded-full bg-current" />
      <span className="typing-dot size-1.5 rounded-full bg-current" />
      <span className="typing-dot size-1.5 rounded-full bg-current" />
    </span>
  );
}

export function HeroDemo() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- motion preference is only known in the browser
      setT(T.rated + 800);
      return;
    }
    let visible = true;
    let start = performance.now();
    let pausedAt: number | null = null;
    setRunning(true);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (rootRef.current) io.observe(rootRef.current);
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!visible || document.hidden) {
        pausedAt ??= now;
        return;
      }
      if (pausedAt !== null) {
        start += now - pausedAt;
        pausedAt = null;
      }
      setT((now - start) % LOOP_MS);
    }, 60);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, []);

  const at = (ms: number) => t >= ms;
  const queued = at(T.queued) && !at(T.joined);
  const assigned = at(T.joined);
  const waited = assigned ? T.joined - T.queued : Math.max(0, t - T.queued);
  const fading = running && t > LOOP_MS - 700;

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[690px]" aria-label="A customer conversation moving from the AI assistant to a person" role="img">
      <div className={cn("relative h-[540px] transition-opacity duration-500 sm:h-[590px]", fading ? "opacity-0" : "opacity-100")} aria-hidden>
        {/* The agent's side: the inbox, sitting behind the customer's chat. */}
        <p className="absolute top-0 left-1 hidden text-xs font-medium text-muted sm:block">What your agent sees</p>
        <p className="absolute top-0 right-1 hidden text-xs font-medium text-muted sm:block">What your customer sees</p>
        <div className="absolute top-14 left-0 hidden w-[292px] overflow-hidden rounded-[16px] border border-line bg-surface shadow-md sm:block">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="type-heading text-sm font-semibold">Inbox</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="size-2 rounded-full bg-fern" /> Maya, available
            </span>
          </div>
          <div className="flex gap-1 border-b border-line px-3 py-2 text-xs">
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 font-medium", queued ? "bg-ink text-white" : "text-muted")}>
              Unassigned <span className="type-figures">{queued ? 1 : 0}</span>
            </span>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 font-medium", !queued ? "bg-ink text-white" : "text-muted")}>
              Mine <span className="type-figures">{assigned ? 3 : 2}</span>
            </span>
          </div>
          <ul className="divide-y divide-line text-sm">
            {at(T.queued) ? (
              <li key="casey" className={cn("pop-in px-4 py-3", queued ? "bg-brass-wash" : "bg-enamel-wash")}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Casey Morgan</span>
                  {queued ? (
                    <span className="type-figures flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold shadow-sm">
                      <span className="waiting-pulse size-2 rounded-full bg-brass" />
                      {clock(waited)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-enamel-strong">
                      <span className="flex size-4 items-center justify-center rounded-full bg-enamel text-[9px] text-white">M</span>
                      Assigned to you
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">Change the address on order 4821</p>
                <p className="mt-1.5 text-[11px] text-faint">{queued ? "Asked for a person" : `First reply in ${clock(T.reply - T.queued)}`}</p>
              </li>
            ) : null}
            <li className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Priya Nair</span>
                <span className="text-xs text-muted">4m</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">Refund for a damaged helmet</p>
            </li>
            <li className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Jordan Lee</span>
                <span className="rounded-full bg-fern-wash px-1.5 py-0.5 text-[10px] font-semibold text-fern">Resolved by AI</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">Which frame size fits 5&apos;10&quot;?</p>
            </li>
          </ul>
          <div className="m-3 rounded-[10px] border border-dashed border-line-strong bg-wash px-3 py-2 text-xs text-muted">
            <span className="flex items-center gap-1 font-medium text-ink">
              <Lock className="size-3" /> Internal note
            </span>
            Casey is a repeat customer. Offer free express if it slips.
          </div>
        </div>

        {/* The customer's side: the chat widget. */}
        <div className="absolute top-0 right-0 bottom-0 flex w-full flex-col overflow-hidden rounded-[20px] border border-line bg-canvas shadow-lg sm:top-7 sm:w-[372px]">
          <div className="flex items-center gap-3 bg-enamel px-4 py-3.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/18 text-sm font-semibold">N</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Northwind Bikes</p>
              <p className="flex items-center gap-1.5 text-xs text-white/80">
                <span className="size-1.5 rounded-full bg-white" />
                {assigned ? "You're chatting with Maya" : queued ? "Connecting you with the team" : "AI assistant replies in seconds"}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 pt-4 pb-3 [mask-image:linear-gradient(to_bottom,transparent,black_56px)]">
            <div className="flex items-end gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-enamel text-white">
                <Bot className="size-4" />
              </span>
              <p className="max-w-[80%] rounded-[14px] rounded-bl-[4px] border border-line bg-surface px-3.5 py-2.5 text-sm">
                Hi there. Ask us anything. A person is one tap away.
              </p>
            </div>

            {at(T.ask1) ? <Mine key="a1" text="Do you ship to Canada?" /> : null}
            {at(T.think1) && !at(T.answer1) ? <Thinking key="th1" /> : null}
            {at(T.answer1) ? (
              <Ai key="ans1" text={streamed(ANSWER_1, T.answer1, t)} source={t > T.answer1 + 1100 ? "Shipping and delivery" : null} />
            ) : null}
            {at(T.ask2) ? <Mine key="a2" text="Can you change the address on order 4821?" seen={at(T.seen)} /> : null}
            {at(T.think2) && !at(T.answer2) ? <Thinking key="th2" /> : null}
            {at(T.answer2) ? <Ai key="ans2" text={streamed(ANSWER_2, T.answer2, t)} /> : null}
            {at(T.answer2 + 1100) && !at(T.queued) ? (
              <div key="actions" className="pop-in flex gap-2 pl-0.5">
                <span className="rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium">That helped</span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
                    at(T.press) ? "scale-95 bg-enamel text-white" : "border border-line-strong bg-surface",
                  )}
                >
                  Talk to a person
                </span>
              </div>
            ) : null}
            {at(T.queued) ? <SystemLine key="q" text="Connecting you with a person from the team" /> : null}
            {at(T.joined) ? <SystemLine key="j" text="Maya joined the conversation" /> : null}
            {at(T.typing) && !at(T.reply) ? (
              <p key="mt" className="pop-in flex items-center gap-2 text-xs text-muted">
                <Dots /> Maya is typing
              </p>
            ) : null}
            {at(T.reply) ? (
              <div key="r" className="pop-in flex flex-col items-start">
                <span className="mb-1 flex items-center gap-1 text-[11px] text-muted">
                  <UserRound className="size-3" /> Maya
                </span>
                <p className="max-w-[85%] rounded-[14px] rounded-bl-[4px] bg-surface px-3.5 py-2.5 text-sm shadow-[inset_0_0_0_1px_var(--line-strong)]">{REPLY}</p>
              </div>
            ) : null}
            {at(T.rating) ? (
              <div key="csat" className="pop-in mx-auto w-full max-w-[290px] rounded-[12px] border border-line bg-surface px-3.5 py-3">
                <p className="text-xs font-medium">{at(T.rated) ? "Thanks for your rating" : "How did we do?"}</p>
                <div className="mt-2 flex justify-between gap-1">
                  {FACES.map((Face, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-[8px] border py-1.5 transition-colors duration-300",
                        at(T.rated) && i === 4 ? "border-enamel bg-enamel text-white" : "border-line text-muted",
                      )}
                    >
                      <Face className="size-4" />
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line bg-surface px-3 pt-2 pb-3">
            <div className="flex items-center gap-2 rounded-[12px] border border-line-strong px-3 py-2 text-sm text-faint">
              <span className="flex-1">Write a message</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-enamel text-white opacity-40">
                <Send className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mine({ text, seen }: { text: string; seen?: boolean }) {
  return (
    <div className="pop-in flex flex-col items-end">
      <p className="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-enamel px-3.5 py-2.5 text-sm text-white">{text}</p>
      <span className="mt-1 flex h-3.5 items-center gap-1 text-[11px] text-faint">
        {seen ? (
          <>
            <Check className="size-3 text-fern" /> Seen
          </>
        ) : null}
      </span>
    </div>
  );
}

function Thinking() {
  return (
    <p className="pop-in flex items-center gap-2 text-xs text-muted">
      <Dots /> Assistant is looking this up
    </p>
  );
}

function Ai({ text, source }: { text: string; source?: string | null }) {
  return (
    <div className="pop-in flex flex-col items-start">
      <span className="mb-1 flex items-center gap-1 text-[11px] text-muted">
        <Bot className="size-3" /> Northwind Assistant (AI)
      </span>
      <div className="max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-line bg-surface px-3.5 py-2.5 text-sm">
        {text}
        {source ? (
          <span className="pop-in mt-2 flex w-fit items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px]">
            <BookOpen className="size-3" />
            <span className="type-figures font-semibold">1</span> {source}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SystemLine({ text }: { text: string }) {
  return (
    <p className="pop-in flex items-center gap-2 text-[11px] text-muted">
      <span className="h-px flex-1 bg-line" />
      <span>{text}</span>
      <span className="h-px flex-1 bg-line" />
    </p>
  );
}
