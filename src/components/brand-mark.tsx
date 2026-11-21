import Link from "next/link";
import { cn } from "@/lib/cn";

/** Product mark: a service-desk bell inside a ledger-green tile. */
export function BrandGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <rect width="24" height="24" rx="6" fill="var(--ledger)" />
      <path d="M6.5 15.5a5.5 5.5 0 0 1 11 0z" fill="white" />
      <rect x="5" y="16.3" width="14" height="1.7" rx="0.85" fill="white" />
      <rect x="11.1" y="7.2" width="1.8" height="2.6" rx="0.9" fill="white" />
    </svg>
  );
}

export function BrandMark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold text-ink", className)}>
      <BrandGlyph />
      <span className="type-heading text-base">HelpDesk AI</span>
    </Link>
  );
}
