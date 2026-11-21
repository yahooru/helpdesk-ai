import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamManager } from "@/components/settings/team-manager";
import { staffContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  return <TeamManager meId={ctx.user.id} canEdit={ctx.membership.role === "admin"} />;
}
