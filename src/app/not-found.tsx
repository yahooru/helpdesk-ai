import type { Metadata } from "next";
import Link from "next/link";
import { BrandGlyph, BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5 sm:px-8">
        <BrandMark />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="max-w-md text-center">
          <BrandGlyph size={64} className="mx-auto" />
          <p className="type-figures mt-6 text-sm font-semibold text-muted">Error 404</p>
          <h1 className="type-display mt-2 text-4xl font-semibold">Nobody at this desk.</h1>
          <p className="mt-4 text-muted">
            The page you rang for doesn&apos;t exist, or the link is out of date. If you were looking for a business&apos;s support page, check
            the address they shared.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-enamel px-5 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-enamel-strong"
            >
              Go to the home page
            </Link>
            <Link
              href="/app"
              className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-line-strong bg-surface px-5 font-medium shadow-sm hover:bg-wash"
            >
              Open the console
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
