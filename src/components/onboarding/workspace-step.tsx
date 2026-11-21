"use client";
import { Check, ImagePlus, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api-client";
import { BRAND_SWATCHES, DEFAULT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";

const DEFAULT_GREETING = "Hi there. Ask us anything and we'll get you an answer right away.";

export function BrandSwatches({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Brand color" className="flex flex-wrap gap-2">
      {BRAND_SWATCHES.map((s) => {
        const selected = s.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={s.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={s.name}
            title={s.name}
            onClick={() => onChange(s.hex)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border-2 transition-transform",
              selected ? "border-ink" : "border-transparent hover:scale-105",
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full" style={{ background: s.hex }}>
              {selected ? <Check className="size-4 text-white" aria-hidden /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small live preview of the customer-facing chat header. */
export function WidgetPreview({ name, color, greeting, logo }: { name: string; color: string; greeting: string; logo: string | null }) {
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] border border-line-strong bg-surface shadow-[0_18px_40px_-18px_rgba(29,38,34,0.35)]">
      <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ background: color }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-9 rounded-full bg-white object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20 font-semibold">{(name || "Y").slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{name || "Your business"}</p>
          <p className="text-xs text-white/80">Replies in seconds</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="max-w-[85%] rounded-[12px] rounded-tl-[4px] bg-wash px-3 py-2 text-sm">{greeting || DEFAULT_GREETING}</p>
        <div className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-2 text-sm text-faint">
          <MessageCircle className="size-4" aria-hidden /> Write a message
        </div>
      </div>
    </div>
  );
}

export function WorkspaceStep() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slugInput, setSlugInput] = useState<string | null>(null);
  const slug = slugInput ?? slugify(name);
  const [check, setCheck] = useState<{ slug: string; available: boolean | null; reason: string | null } | null>(null);
  const slugState = {
    checking: Boolean(slug) && check?.slug !== slug,
    available: check?.slug === slug ? check.available : null,
    reason: check?.slug === slug ? check.reason : null,
  };
  const [color, setColor] = useState<string>(DEFAULT_BRAND);
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!slug) return;
    timer.current = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean; reason: string | null }>(`/api/workspaces/slug-check?slug=${encodeURIComponent(slug)}`);
        setCheck({ slug, available: res.available, reason: res.reason });
      } catch {
        setCheck({ slug, available: null, reason: null });
      }
    }, 350);
  }, [slug]);

  function pickLogo(file: File | null) {
    setLogo(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Enter your business name");
    if (slugState.available === false) return setError(slugState.reason ?? "Choose another address");
    if (logo && logo.size > 2 * 1024 * 1024) return setError("Logos can be up to 2 MB");
    setPending(true);
    try {
      await api("/api/workspaces", { body: { name: name.trim(), slug, brandColor: color, greeting: greeting.trim() } });
      if (logo) {
        const form = new FormData();
        form.set("file", logo);
        await api("/api/workspace/logo", { form }).catch(() => undefined);
      }
      router.replace("/onboarding?step=knowledge");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <Field label="Business name" htmlFor="ws-name">
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Bikes" maxLength={60} autoFocus />
        </Field>
        <Field
          label="Support page address"
          htmlFor="ws-slug"
          error={slugState.available === false ? slugState.reason : null}
          hint={slugState.checking ? "Checking…" : slugState.available ? "Available" : "Lowercase letters, digits and dashes."}
        >
          <div className="flex items-stretch overflow-hidden rounded-[var(--radius-control)] border border-line-strong bg-surface focus-within:border-ledger">
            <span className="flex items-center border-r border-line bg-wash px-3 text-sm text-muted">/s/</span>
            <input
              id="ws-slug"
              value={slug}
              onChange={(e) => setSlugInput(slugify(e.target.value))}
              className="h-10 w-full bg-transparent px-3 text-base focus:outline-none"
              aria-invalid={slugState.available === false}
              maxLength={40}
            />
          </div>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Brand color</span>
          <BrandSwatches value={color} onChange={setColor} />
        </div>
        <Field label="Greeting" htmlFor="ws-greeting" hint="The first line customers see when they open the chat.">
          <Textarea id="ws-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} maxLength={240} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Logo (optional)</span>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-3 py-2 text-sm hover:bg-wash">
            <ImagePlus className="size-4" aria-hidden />
            {logo ? logo.name : "Choose an image"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
          </label>
          <span className="text-sm text-muted">PNG, JPG, WebP or GIF up to 2 MB. Square images look best.</span>
        </div>
        <div>
          <Button type="submit" size="lg" loading={pending}>
            Create help desk
          </Button>
        </div>
      </form>
      <div className="hidden lg:block">
        <p className="mb-3 text-sm font-medium text-muted">Preview</p>
        <WidgetPreview name={name} color={color} greeting={greeting} logo={logoPreview} />
      </div>
    </div>
  );
}
