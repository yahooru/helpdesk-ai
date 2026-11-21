import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, QueuePreview } from "@/components/auth/auth-shell";
import { currentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  if (await currentUser()) redirect(next && next.startsWith("/") ? next : "/app");
  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where your team left off."
      aside={<QueuePreview />}
    >
      <AuthForm mode="login" next={next} defaultEmail={email} />
    </AuthShell>
  );
}
