import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Product mark: a desk bell inside a speech bubble. The front-desk bell is what you ring for help;
 * the bubble is where the answer comes back. The brass button is the same brass that marks
 * "someone is waiting" across the product. Mirrors public/logo.svg and app/icon.svg.
 */
export function BrandGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      <rect x="2.5" y="3.5" width="27" height="21" rx="8" fill="var(--enamel)" />
      <path d="M7.6 20.5v7.6c0 .9 1 1.4 1.7.8l7.4-5.9z" fill="var(--enamel)" />
      <path d="M9.6 19a6.4 6.4 0 0 1 12.8 0z" fill="#fff" />
      <rect x="8.2" y="19.9" width="15.6" height="2" rx="1" fill="#fff" />
      <circle cx="16" cy="10.6" r="1.75" fill="var(--brass)" />
    </svg>
  );
}

export function BrandMark({
  href = "/",
  className,
  tone = "ink",
  size = 26,
}: {
  href?: string;
  className?: string;
  tone?: "ink" | "white";
  size?: number;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold", tone === "white" ? "text-white" : "text-ink", className)}
      aria-label="HelpDesk AI home"
    >
      <BrandGlyph size={size} />
      <span className="type-heading text-[1.05rem] tracking-[-0.02em]">HelpDesk AI</span>
    </Link>
  );
}
