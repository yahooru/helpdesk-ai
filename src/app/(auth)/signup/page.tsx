import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, SetupSteps } from "@/components/auth/auth-shell";
import { currentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Create your help desk" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  if (await currentUser()) redirect(next && next.startsWith("/") ? next : "/app");
  return (
    <AuthShell title="Create your help desk" subtitle="Free to start. No credit card." aside={<SetupSteps />}>
      <AuthForm mode="signup" next={next} defaultEmail={email} />
    </AuthShell>
  );
}
