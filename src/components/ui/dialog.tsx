"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Accessible modal built on the native dialog element (focus trap and Escape built in). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(520px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line-strong bg-surface p-0 text-ink shadow-[0_18px_48px_-12px_rgba(29,38,34,0.35)] backdrop:bg-[rgba(29,38,34,0.38)]",
        className,
      )}
    >
      {open ? (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="type-heading text-lg font-semibold">
                {title}
              </h2>
              {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-wash hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
