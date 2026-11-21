"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveals every [data-reveal] element once it scrolls into view. Mounted once per page; the
 * hidden state only applies under html.js, so content is never lost without JavaScript.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      for (const el of els) el.dataset.shown = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "true";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}

/** Sticky site header that gains a surface and hairline once the page scrolls. */
export function StickyHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line bg-[color:color-mix(in_oklab,var(--porcelain)_82%,transparent)] backdrop-blur-md" : "border-transparent",
      )}
    >
      {children}
    </header>
  );
}

/**
 * Ordered steps whose connecting rail fills as the reader scrolls through them; each step lights
 * up when it crosses the middle of the viewport.
 */
export function ScrollJourney({
  steps,
}: {
  steps: { title: string; body: string; aside: ReactNode }[];
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const list = listRef.current;
      if (!list) return;
      const mid = window.innerHeight * 0.55;
      const rect = list.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (mid - rect.top) / rect.height)));
      const items = Array.from(list.children) as HTMLElement[];
      let current = -1;
      items.forEach((item, i) => {
        if (item.getBoundingClientRect().top < mid) current = i;
      });
      setActive(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative">
      <div aria-hidden className="absolute top-2 bottom-2 left-[19px] w-px bg-line-strong">
        <div className="h-full w-full origin-top bg-enamel" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <ol ref={listRef} className="flex flex-col gap-14">
        {steps.map((step, i) => {
          const on = i <= active;
          return (
            <li key={step.title} className="relative grid gap-5 pl-16 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:gap-10">
              <span
                className={cn(
                  "type-figures absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-500",
                  on ? "border-enamel bg-enamel text-white" : "border-line-strong bg-canvas text-muted",
                )}
              >
                {i + 1}
              </span>
              <div className={cn("transition-opacity duration-500", on ? "opacity-100" : "opacity-55")}>
                <h3 className="type-heading text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-md text-muted">{step.body}</p>
              </div>
              <div
                className={cn(
                  "transition-[opacity,transform] duration-700",
                  on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-40",
                )}
              >
                {step.aside}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
