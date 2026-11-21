import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app/app-nav";
import { StaffChatProvider } from "@/components/app/staff-chat";
import { ToastProvider } from "@/components/ui/toast";
import { currentUser, staffContext, userWorkspaces } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/app");
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const all = await userWorkspaces(user.id);
  return (
    <ToastProvider>
      <StaffChatProvider myNexconnId={user.nexconnUserId} staffChannelId={ctx.workspace.staffChannelId}>
        <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
          <AppNav
            user={{ name: user.name, email: user.email }}
            workspace={{ id: ctx.workspace.id, name: ctx.workspace.name, slug: ctx.workspace.slug, logoUrl: ctx.workspace.logoUrl }}
            workspaces={all.map((r) => ({ id: r.workspace.id, name: r.workspace.name }))}
            role={ctx.membership.role}
            availability={ctx.membership.availability}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </StaffChatProvider>
    </ToastProvider>
  );
}
