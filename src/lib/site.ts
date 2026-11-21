/** Canonical public URL for metadata, sitemap and share images (no request needed). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3101";
}

export const SITE_DESCRIPTION =
  "Customer support a small business can set up in five minutes: an AI assistant answers from your own help articles, cites its source, and hands the same live chat to your team.";
