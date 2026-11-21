"use client";
import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";

export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <BrandGlyph size={56} className="mx-auto" />
        <h1 className="type-display mt-6 text-3xl font-semibold">This page didn&apos;t load.</h1>
        <p className="mt-3 text-muted">
          Something failed on our side or the connection dropped. Try again; if it keeps happening, reload the page in a minute.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-enamel px-5 font-medium text-white hover:bg-enamel-strong"
          >
            <RotateCw className="size-4" aria-hidden /> Try again
          </button>
          <Link href="/" className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-line-strong bg-surface px-5 font-medium hover:bg-wash">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
