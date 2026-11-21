"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api-client";

export function AcceptInvite({
  token,
  workspaceName,
  userEmail,
  invitedEmail,
}: {
  token: string;
  workspaceName: string;
  userEmail: string;
  invitedEmail: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setPending(true);
    setError(null);
    try {
      await api(`/api/invites/${token}/accept`, { body: {} });
      router.replace("/app/inbox");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      <p className="text-sm text-muted">
        You&apos;re signed in as <span className="font-medium text-ink">{userEmail}</span>.
        {userEmail !== invitedEmail ? ` The invite was sent to ${invitedEmail}; you can still accept it with this account.` : ""}
      </p>
      <Button size="lg" onClick={accept} loading={pending}>
        Join {workspaceName}
      </Button>
    </div>
  );
}
