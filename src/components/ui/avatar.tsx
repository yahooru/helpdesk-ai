import { cn } from "@/lib/cn";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 32,
  tone = "ink",
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  tone?: "ink" | "enamel" | "brand" | "wash";
  online?: boolean | null;
  className?: string;
}) {
  const tones = {
    ink: "bg-ink text-white",
    enamel: "bg-enamel text-white",
    brand: "bg-brand text-brand-ink",
    wash: "bg-wash text-ink border border-line",
  } as const;
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className={cn("flex size-full items-center justify-center rounded-full font-semibold", tones[tone])}
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials(name)}
        </span>
      )}
      {online != null ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface",
            online ? "bg-fern" : "bg-[color:var(--faint)]",
          )}
          style={{ width: Math.max(9, size * 0.3), height: Math.max(9, size * 0.3) }}
          aria-label={online ? "Online" : "Offline"}
          role="img"
        />
      ) : null}
    </span>
  );
}
