"use client";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { BrandStyle, CustomerChat } from "./customer-chat";
import { useCustomerChat, type PublicWorkspace } from "./use-customer-chat";

type HostMessage = { source?: string; type?: string; url?: string; title?: string };

/**
 * Runs inside the widget iframe. Renders the launcher (closed) or the chat panel (open) and asks
 * the host page's widget.js to resize the iframe via postMessage.
 */
export function WidgetApp({
  workspace,
  teamOnline,
  pageUrl,
  pageTitle,
  side,
}: {
  workspace: PublicWorkspace;
  teamOnline: boolean;
  pageUrl: string | null;
  pageTitle: string | null;
  side: "left" | "right";
}) {
  const [embedded, setEmbedded] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const inFrame = window.parent !== window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- whether we run inside an iframe is only known in the browser
    setEmbedded(inFrame);
    setOpen(!inFrame);
  }, []);
  const [page, setPage] = useState({ url: pageUrl, title: pageTitle });
  const context = useMemo(() => ({ pageUrl: page.url, pageTitle: page.title, source: "widget" as const }), [page.url, page.title]);
  const chat = useCustomerChat(workspace, context);

  useEffect(() => {
    if (embedded === null) return;
    chat.setVisible(open);
    if (embedded) window.parent.postMessage({ source: "helpdesk-ai", type: "state", state: open ? "open" : "closed" }, "*");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, embedded]);

  useEffect(() => {
    if (!embedded) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      const d = e.data as HostMessage;
      if (!d || d.source !== "helpdesk-ai-host") return;
      if (d.type === "open") setOpen(true);
      if (d.type === "close") setOpen(false);
      if (d.type === "page" && typeof d.url === "string") setPage({ url: d.url.slice(0, 1000), title: (d.title ?? "").slice(0, 200) });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedded]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && embedded) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded]);

  if (embedded === null) return null;
  return (
    <BrandStyle color={workspace.brandColor} className="h-full">
      {open ? (
        <div className={cn("h-full", embedded ? "panel-in p-0 sm:p-3" : "mx-auto max-w-[440px] p-3", side === "left" && "origin-bottom-left")}>
          <CustomerChat workspace={workspace} chat={chat} teamOnline={teamOnline} onClose={embedded ? () => setOpen(false) : undefined} variant="widget" />
        </div>
      ) : (
        <div className={cn("flex h-full items-end p-4", side === "left" ? "justify-start" : "justify-end")}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Chat with ${workspace.name}${chat.unseenCount ? `, ${chat.unseenCount} new` : ""}`}
            className="pop-in relative flex size-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_10px_24px_-8px_rgba(15,27,45,0.55),inset_0_1px_0_rgb(255_255_255/0.2)] transition-transform duration-200 hover:scale-105 active:scale-95"
            data-testid="widget-launcher"
          >
            <MessageCircle className="size-6" aria-hidden />
            {chat.unseenCount > 0 ? (
              <span className="type-figures absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-brass px-1 text-xs font-bold text-ink">
                {chat.unseenCount}
              </span>
            ) : null}
            <X className="hidden" aria-hidden />
          </button>
        </div>
      )}
    </BrandStyle>
  );
}
