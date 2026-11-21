import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CopyButton, SnippetBlock } from "@/components/copy-button";
import { staffContext } from "@/lib/auth/guards";
import { appOrigin, widgetSnippet } from "@/lib/origin";

export const metadata: Metadata = { title: "Install" };

export default async function InstallPage() {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const origin = await appOrigin();
  const hosted = `${origin}/s/${ctx.workspace.slug}`;
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section>
        <h2 className="type-heading text-lg font-semibold">Chat widget</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Paste this before the closing body tag on every page where customers should see the chat. It works on any domain and on phones.
        </p>
        <SnippetBlock snippet={widgetSnippet(origin, ctx.workspace.slug)} />
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted">
          <li>Add data-position=&quot;left&quot; to show the launcher on the left.</li>
          <li>
            Open or close the chat from your own buttons with <code className="rounded bg-wash px-1">window.HelpDeskAI.open()</code> and{" "}
            <code className="rounded bg-wash px-1">window.HelpDeskAI.close()</code>.
          </li>
          <li>The page address and title the customer came from are shown to your agents.</li>
        </ul>
      </section>
      <section>
        <h2 className="type-heading text-lg font-semibold">Hosted support page</h2>
        <p className="mt-1 mb-3 text-sm text-muted">No website? Link customers here. It has the chat and your public articles.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={hosted} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-enamel hover:underline">
            {hosted} <ExternalLink className="size-4" aria-hidden />
          </a>
          <CopyButton value={hosted} label="Copy link" />
        </div>
      </section>
    </div>
  );
}
