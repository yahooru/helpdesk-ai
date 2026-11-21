import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "ink" | "quiet";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-enamel text-white border border-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(15_27_45/0.18)] hover:bg-enamel-strong",
  secondary: "bg-surface text-ink border border-line-strong shadow-sm hover:border-[color:var(--faint)] hover:bg-wash",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-wash",
  ink: "bg-ink text-white border border-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] hover:bg-ink-raised",
  quiet: "bg-transparent text-muted border border-transparent hover:text-ink hover:bg-wash",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-sm gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
});
