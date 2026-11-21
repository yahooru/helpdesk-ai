"use client";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  id: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-enamel bg-enamel" : "border-line-strong bg-wash",
        )}
      >
        <span
          className={cn(
            "inline-block size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(29,38,34,0.25)] transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}
