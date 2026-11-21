"use client";
import { useMemo } from "react";
import { BrandStyle, CustomerChat } from "./customer-chat";
import { useCustomerChat, type PublicWorkspace } from "./use-customer-chat";

/** Full-page chat on the hosted support page (/s/<slug>). */
export function SupportPageChat({ workspace, teamOnline }: { workspace: PublicWorkspace; teamOnline: boolean }) {
  const context = useMemo(() => ({ pageUrl: null, pageTitle: "Hosted support page", source: "page" as const }), []);
  const chat = useCustomerChat(workspace, context);
  return (
    <BrandStyle color={workspace.brandColor} className="h-full">
      <CustomerChat workspace={workspace} chat={chat} teamOnline={teamOnline} variant="page" />
    </BrandStyle>
  );
}
