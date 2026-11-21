import "server-only";
import { headers } from "next/headers";

/** Public origin of this deployment (env override, else the request host). */
export async function appOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3101";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function widgetSnippet(origin: string, slug: string): string {
  return `<script src="${origin}/widget.js" data-workspace="${slug}" async></script>`;
}
