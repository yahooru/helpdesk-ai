import type { Metadata } from "next";
import { WidgetApp } from "@/components/customer/widget-app";
import { anyTeammateOnline } from "@/lib/conversations/service";
import { toPublicWorkspace, workspaceBySlug } from "@/lib/widget/public";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; title?: string; side?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const workspace = await workspaceBySlug(slug);
  // A snippet with a wrong or deleted workspace shows nothing on the host site, not a 404 page.
  if (!workspace) return <style>{`html,body{background:transparent!important}`}</style>;
  const teamOnline = await anyTeammateOnline(workspace).catch(() => false);
  const pageUrl = sp.page && /^https?:\/\//i.test(sp.page) ? sp.page.slice(0, 1000) : null;
  return (
    <>
      {/* The iframe must be see-through so only the launcher or the panel shows on the host page. */}
      <style>{`html,body{background:transparent!important;height:100%;overflow:hidden}`}</style>
      <div className="h-dvh">
        <WidgetApp
          workspace={toPublicWorkspace(workspace)}
          teamOnline={teamOnline}
          pageUrl={pageUrl}
          pageTitle={sp.title?.slice(0, 200) ?? null}
          side={sp.side === "left" ? "left" : "right"}
        />
      </div>
    </>
  );
}
