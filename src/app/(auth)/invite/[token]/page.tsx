import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInvite } from "@/components/auth/accept-invite";
import { currentUser } from "@/lib/auth/guards";
import { findInvite } from "@/lib/workspaces/invites";

export const metadata: Metadata = { title: "Join your team" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [found, user] = await Promise.all([findInvite(token), currentUser()]);
  if (!found) {
    return (
      <AuthShell title="This invite can't be used" subtitle="It may have expired, been revoked, or already been accepted.">
        <p className="text-sm text-muted">Ask a workspace admin to send you a new invite link.</p>
        <Link href="/login" className="mt-6 inline-block font-medium text-enamel hover:underline">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }
  const next = `/invite/${token}`;
  const role = found.invite.role === "admin" ? "an admin" : "an agent";
  return (
    <AuthShell title={`Join ${found.workspace.name}`} subtitle={`You've been invited as ${role} on HelpDesk AI.`}>
      {user ? (
        <AcceptInvite token={token} workspaceName={found.workspace.name} userEmail={user.email} invitedEmail={found.invite.email} />
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            href={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(found.invite.email)}`}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-control)] bg-enamel px-5 font-medium text-white hover:bg-enamel-strong"
          >
            Create an account to join
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(found.invite.email)}`}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-control)] border border-line-strong px-5 font-medium hover:bg-wash"
          >
            I already have an account
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
