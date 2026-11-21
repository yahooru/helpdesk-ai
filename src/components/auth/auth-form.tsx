"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { api, ApiError, errorMessage } from "@/lib/api-client";

type Mode = "signup" | "login";

function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function AuthForm({ mode, next, defaultEmail }: { mode: Mode; next?: string; defaultEmail?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const errs: Record<string, string> = {};
    if (mode === "signup" && !name) errs.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email address";
    if (mode === "signup" && password.length < 8) errs.password = "Use at least 8 characters";
    if (mode === "login" && !password) errs.password = "Enter your password";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { body: mode === "signup" ? { name, email, password } : { email, password } });
      router.replace(safeNext(next, mode === "signup" ? "/onboarding" : "/app"));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.code === "email_taken" ? err.message : errorMessage(err));
      setPending(false);
    }
  }

  const other = mode === "signup" ? "/login" : "/signup";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      {mode === "signup" ? (
        <Field label="Your name" htmlFor="name" error={fieldErrors.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fieldErrors.name} />
        </Field>
      ) : null}
      <Field label="Work email" htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
          aria-invalid={!!fieldErrors.email}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={fieldErrors.password}
        hint={mode === "signup" ? "At least 8 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          aria-invalid={!!fieldErrors.password}
        />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-sm text-muted">
        {mode === "signup" ? "Already have an account? " : "New to HelpDesk AI? "}
        <Link href={otherHref} className="font-medium text-enamel underline-offset-4 hover:underline">
          {mode === "signup" ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
