"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { api } from "@/lib/api-client";
import { connectChat, subscribe, type ConnectionState } from "@/lib/nexconn/client";

type StaffChat = { state: ConnectionState; myNexconnId: string; staffChannelId: string };

const Ctx = createContext<StaffChat | null>(null);

type Session = { appKey: string; token: string; userId: string; staffChannelId: string };

/** Connects the signed-in teammate to Nexconn once for the whole console. */
export function StaffChatProvider({ children, myNexconnId, staffChannelId }: { children: ReactNode; myNexconnId: string; staffChannelId: string }) {
  const [state, setState] = useState<ConnectionState>("idle");
  useEffect(() => {
    const unsub = subscribe({ onState: (s) => setState(s) });
    connectChat(async (refresh) => {
      const s = await api<Session>("/api/chat/session", { body: { refresh } });
      return { appKey: s.appKey, token: s.token, userId: s.userId };
    }).catch(() => undefined);
    const onOnline = () => {
      connectChat(async (refresh) => {
        const s = await api<Session>("/api/chat/session", { body: { refresh } });
        return { appKey: s.appKey, token: s.token, userId: s.userId };
      }).catch(() => undefined);
    };
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return (
    <Ctx.Provider value={{ state, myNexconnId, staffChannelId }}>
      <ConnectionBanner state={state} />
      {children}
    </Ctx.Provider>
  );
}

export function useStaffChat(): StaffChat {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaffChat outside StaffChatProvider");
  return v;
}

function ConnectionBanner({ state }: { state: ConnectionState }) {
  if (state !== "reconnecting" && state !== "offline" && state !== "kicked" && state !== "error") return null;
  const text =
    state === "kicked"
      ? "You opened HelpDesk AI somewhere else, so live updates stopped here. Reload to continue in this tab."
      : state === "error"
        ? "Live chat couldn't connect. Messages may be delayed."
        : "Reconnecting to live chat…";
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-marker px-4 py-1.5 text-sm font-medium text-ink">
      <WifiOff className="size-4" aria-hidden />
      {text}
      {state === "kicked" || state === "error" ? (
        <button type="button" onClick={() => location.reload()} className="ml-2 underline underline-offset-2">
          Reload
        </button>
      ) : null}
    </div>
  );
}
