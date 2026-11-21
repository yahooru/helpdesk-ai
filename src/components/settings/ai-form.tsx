"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type Settings = {
  botName: string;
  aiEnabled: boolean;
  aiTone: "friendly" | "professional" | "concise";
  handoffOnNoAnswer: "offer" | "auto";
  aiInstructions: string;
  autoAssign: boolean;
};

const TONES = [
  { id: "friendly", label: "Friendly", body: "Warm and plain-spoken." },
  { id: "professional", label: "Professional", body: "Polite, precise, neutral." },
  { id: "concise", label: "Concise", body: "One to three sentences." },
] as const;

function Choice({ selected, onSelect, label, body, disabled }: { selected: boolean; onSelect: () => void; label: string; body: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-start rounded-[var(--radius-panel)] border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
        selected ? "border-enamel bg-enamel-wash" : "border-line-strong bg-surface hover:bg-wash",
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-muted">{body}</span>
    </button>
  );
}

export function AiForm({ initial, canEdit, aiConfigured }: { initial: Settings; canEdit: boolean; aiConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/workspace", { method: "PATCH", body: { ...s, botName: s.botName.trim(), aiInstructions: s.aiInstructions.trim() } });
      toast("Saved assistant settings");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-7" noValidate>
      <FormError message={error} />
      {!aiConfigured ? (
        <p className="rounded-[var(--radius-control)] border border-line bg-brass-wash px-3 py-2 text-sm">
          AI isn&apos;t configured on this server, so every conversation goes to your team.
        </p>
      ) : null}
      <Switch
        id="ai-enabled"
        checked={s.aiEnabled}
        onChange={(v) => set("aiEnabled", v)}
        disabled={!canEdit}
        label="Let the assistant answer first"
        description="When off, new conversations go straight to your team's Unassigned queue."
      />
      <Field label="Assistant name" htmlFor="bot-name" hint="Shown to customers next to its replies, always marked as AI.">
        <Input id="bot-name" value={s.botName} onChange={(e) => set("botName", e.target.value)} disabled={!canEdit} maxLength={60} />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Tone</span>
        <div role="radiogroup" aria-label="Tone" className="flex flex-col gap-2 sm:flex-row">
          {TONES.map((t) => (
            <Choice key={t.id} selected={s.aiTone === t.id} onSelect={() => set("aiTone", t.id)} label={t.label} body={t.body} disabled={!canEdit} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">When the assistant can&apos;t find an answer</span>
        <div role="radiogroup" aria-label="When there is no answer" className="flex flex-col gap-2 sm:flex-row">
          <Choice
            selected={s.handoffOnNoAnswer === "offer"}
            onSelect={() => set("handoffOnNoAnswer", "offer")}
            label="Offer a person"
            body="Say so and show a Talk to a person button."
            disabled={!canEdit}
          />
          <Choice
            selected={s.handoffOnNoAnswer === "auto"}
            onSelect={() => set("handoffOnNoAnswer", "auto")}
            label="Hand off right away"
            body="Move the chat to your queue automatically."
            disabled={!canEdit}
          />
        </div>
        <p className="text-xs text-muted">Customers can always ask for a person, by button or in their own words.</p>
      </div>
      <Field label="Extra instructions" htmlFor="ai-instructions" hint="Optional. For example: always mention our 30-day return window when refunds come up.">
        <Textarea id="ai-instructions" value={s.aiInstructions} onChange={(e) => set("aiInstructions", e.target.value)} rows={4} maxLength={1500} disabled={!canEdit} />
      </Field>
      <Switch
        id="auto-assign"
        checked={s.autoAssign}
        onChange={(v) => set("autoAssign", v)}
        disabled={!canEdit}
        label="Auto-assign handed-off chats"
        description="Round-robin among teammates who are online and marked available. Otherwise chats wait in Unassigned."
      />
      {canEdit ? (
        <div>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Only admins can change the assistant.</p>
      )}
    </form>
  );
}
