"use client";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandSwatches, WidgetPreview } from "@/components/onboarding/workspace-step";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { slugify } from "@/lib/slug";

type W = { id: string; name: string; slug: string; brandColor: string; greeting: string; logoUrl: string | null };

export function WorkspaceForm({ workspace, canEdit }: { workspace: W; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [color, setColor] = useState(workspace.brandColor);
  const [greeting, setGreeting] = useState(workspace.greeting);
  const [logo, setLogo] = useState(workspace.logoUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/workspace", { method: "PATCH", body: { name: name.trim(), slug, brandColor: color, greeting: greeting.trim() } });
      toast("Saved workspace settings");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("Logos can be up to 2 MB");
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await api<{ logoUrl: string }>("/api/workspace/logo", { form });
      setLogo(res.logoUrl);
      toast("Logo updated");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    try {
      await api("/api/workspace", { method: "PATCH", body: { removeLogo: true } });
      setLogo(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form onSubmit={save} className="flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <Field label="Business name" htmlFor="set-name">
          <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} maxLength={60} />
        </Field>
        <Field label="Support page address" htmlFor="set-slug" hint="Changing it breaks old links and requires updating the widget snippet.">
          <div className="flex items-stretch overflow-hidden rounded-[var(--radius-control)] border border-line-strong bg-surface focus-within:border-ledger">
            <span className="flex items-center border-r border-line bg-wash px-3 text-sm text-muted">/s/</span>
            <input
              id="set-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              disabled={!canEdit}
              className="h-10 w-full bg-transparent px-3 text-base focus:outline-none"
              maxLength={40}
            />
          </div>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Brand color</span>
          {canEdit ? <BrandSwatches value={color} onChange={setColor} /> : <span className="size-7 rounded-full" style={{ background: color }} />}
        </div>
        <Field label="Greeting" htmlFor="set-greeting">
          <Textarea id="set-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} maxLength={240} disabled={!canEdit} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Logo</span>
          <div className="flex flex-wrap items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Current logo" className="size-12 rounded-full border border-line object-cover" />
            ) : (
              <span className="text-sm text-muted">No logo. The first letter of your name is used.</span>
            )}
            {canEdit ? (
              <>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-3 py-1.5 text-sm hover:bg-wash">
                  <ImagePlus className="size-4" aria-hidden />
                  {uploading ? "Uploading…" : logo ? "Replace" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => upload(e.target.files?.[0] ?? null)} />
                </label>
                {logo ? (
                  <Button variant="quiet" size="sm" onClick={removeLogo}>
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {canEdit ? (
          <div>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">Only admins can change workspace settings.</p>
        )}
      </form>
      <div>
        <p className="mb-3 text-sm font-medium text-muted">Preview</p>
        <WidgetPreview name={name} color={color} greeting={greeting} logo={logo} />
      </div>
    </div>
  );
}
