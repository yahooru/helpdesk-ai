import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "ink" | "quiet";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ledger text-white hover:bg-ledger-strong border border-transparent",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-wash",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-wash",
  ink: "bg-ink text-white border border-transparent hover:opacity-90",
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
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
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
