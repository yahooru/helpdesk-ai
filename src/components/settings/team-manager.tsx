"use client";
import { Link2, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { connectionState, subscribe, subscribePresence } from "@/lib/nexconn/client";
import { formatRelative } from "@/lib/time";

type Member = {
  userId: string;
  name: string;
  email: string;
  nexconnUserId: string;
  role: "admin" | "agent";
  availability: "available" | "away";
  joinedAt: string;
};
type Invite = { id: string; email: string; role: "admin" | "agent"; expiresAt: string; createdAt: string };

export function TeamManager({ meId, canEdit }: { meId: string; canEdit: boolean }) {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ members: Member[]; invites: Invite[] }>("/api/team");
      setMembers(res.members);
      setInvites(res.invites);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    void load();
  }, [load]);

  // Live presence through Nexconn online-status subscriptions.
  useEffect(() => {
    if (members.length === 0) return;
    let cleanup: (() => void) | undefined;
    const start = () => {
      subscribePresence(
        members.map((m) => m.nexconnUserId),
        (id, isOnline) => setOnline((o) => ({ ...o, [id]: isOnline })),
      )
        .then((c) => (cleanup = c))
        .catch(() => undefined);
    };
    if (connectionState() === "connected") start();
    const unsub = subscribe({
      onState: (s) => {
        if (s === "connected" && !cleanup) start();
      },
      onInbox: (e) => {
        if (e.kind === "presence") void load();
      },
    });
    return () => {
      unsub();
      cleanup?.();
    };
  }, [members, load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address");
    setInviting(true);
    setError(null);
    try {
      const res = await api<{ inviteUrl: string }>("/api/team/invites", { body: { email: email.trim(), role } });
      setInviteUrl(res.inviteUrl);
      setEmail("");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(m: Member, next: "admin" | "agent") {
    try {
      await api(`/api/team/members/${m.userId}`, { method: "PATCH", body: { role: next } });
      toast(`${m.name} is now ${next === "admin" ? "an admin" : "an agent"}`);
      await load();
    } catch (err) {
      toast(errorMessage(err), "info");
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await api(`/api/team/members/${removing.userId}`, { method: "DELETE" });
      toast(`Removed ${removing.name}`);
      setRemoving(null);
      await load();
    } catch (err) {
      toast(errorMessage(err), "info");
      setRemoving(null);
    }
  }

  async function revoke(id: string) {
    try {
      await api(`/api/team/invites/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast(errorMessage(err), "info");
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {canEdit ? (
        <section>
          <h2 className="type-heading text-lg font-semibold">Invite a teammate</h2>
          <p className="mt-1 mb-3 text-sm text-muted">You&apos;ll get a single-use link to send them. It expires in 7 days.</p>
          <form onSubmit={invite} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
            <Field label="Email" htmlFor="invite-email" className="flex-1">
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </Field>
            <Field label="Role" htmlFor="invite-role">
              <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as "agent" | "admin")} className="sm:w-36">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Button type="submit" loading={inviting} className="h-10">
              Create invite
            </Button>
          </form>
          <div className="mt-3">
            <FormError message={error} />
          </div>
          {inviteUrl ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-line bg-ledger-wash px-3 py-2.5">
              <Link2 className="size-4 text-ledger" aria-hidden />
              <code className="min-w-0 flex-1 truncate text-sm" data-testid="invite-url">
                {inviteUrl}
              </code>
              <CopyButton value={inviteUrl} label="Copy link" />
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="type-heading text-lg font-semibold">Teammates</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Agents answer conversations. Admins can also change settings, knowledge and the team. The dot shows who is online right now.
        </p>
        {loading ? <p className="text-sm text-muted">Loading…</p> : null}
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.name} size={34} online={online[m.nexconnUserId] ?? false} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name} {m.userId === meId ? <span className="text-muted">(you)</span> : null}
                </p>
                <p className="truncate text-sm text-muted">{m.email}</p>
              </div>
              <Badge tone={m.availability === "available" ? "ledger" : "outline"}>{m.availability === "available" ? "Available" : "Away"}</Badge>
              {canEdit ? (
                <Select
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as "admin" | "agent")}
                  aria-label={`Role for ${m.name}`}
                  className="h-8 w-28 text-sm"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </Select>
              ) : (
                <Badge>{m.role === "admin" ? "Admin" : "Agent"}</Badge>
              )}
              {canEdit && m.userId !== meId ? (
                <Button size="sm" variant="quiet" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                  <UserMinus className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {invites.length ? (
        <section>
          <h2 className="type-heading text-lg font-semibold">Pending invites</h2>
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{i.email}</span>
                <Badge>{i.role === "admin" ? "Admin" : "Agent"}</Badge>
                <span className="text-muted">Sent {formatRelative(i.createdAt)}</span>
                {canEdit ? (
                  <Button size="sm" variant="quiet" onClick={() => revoke(i.id)}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
        description="They lose access right away. Their open conversations go back to the Unassigned queue."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button variant="ink" onClick={remove}>
            Remove teammate
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
