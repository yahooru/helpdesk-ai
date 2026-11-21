import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-base text-ink shadow-[inset_0_1px_1px_rgb(15_27_45/0.04)] placeholder:text-faint transition-[border-color,box-shadow] hover:border-[color:var(--faint)] focus:border-enamel focus:shadow-[0_0_0_3px_var(--enamel-wash)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-brass-strong aria-[invalid=true]:shadow-[0_0_0_3px_var(--brass-wash)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-center text-sm font-medium text-ink">
          <span className="mr-1.5 inline-block size-2 shrink-0 rounded-full bg-brass" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[color:color-mix(in_oklab,var(--brass)_45%,transparent)] bg-brass-wash px-3 py-2.5 text-sm text-ink">
      <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-brass" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
