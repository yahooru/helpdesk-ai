import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { currentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  if (await currentUser()) redirect(next && next.startsWith("/") ? next : "/app");
  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where your team left off."
      aside={
        <div className="max-w-md">
          <p className="type-heading text-xl font-semibold">Your queue is waiting</p>
          <p className="mt-3 text-muted">
            Conversations the assistant could not finish land in Unassigned, oldest first, with the time each customer has
            been waiting.
          </p>
        </div>
      }
    >
      <AuthForm mode="login" next={next} defaultEmail={email} />
    </AuthShell>
  );
}
