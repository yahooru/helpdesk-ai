import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { staffContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Workspace settings" };

export default async function WorkspaceSettingsPage() {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const w = ctx.workspace;
  return (
    <WorkspaceForm
      workspace={{ id: w.id, name: w.name, slug: w.slug, brandColor: w.brandColor, greeting: w.greeting, logoUrl: w.logoUrl }}
      canEdit={ctx.membership.role === "admin"}
    />
  );
}
