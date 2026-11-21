"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, Info } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "info" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pop-in pointer-events-auto flex items-center gap-2.5 rounded-full bg-ink py-2 pr-4 pl-2 text-sm text-white shadow-lg">
            <span className={t.tone === "success" ? "flex size-6 items-center justify-center rounded-full bg-fern" : "flex size-6 items-center justify-center rounded-full bg-ink-raised"}>
              {t.tone === "success" ? <Check className="size-3.5" aria-hidden /> : <Info className="size-3.5" aria-hidden />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
