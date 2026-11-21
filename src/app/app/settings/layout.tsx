import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/misc";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <PageHeader title="Settings" description="Branding, assistant behavior, installation, teammates and saved replies." />
        <div className="mt-6 grid gap-8 md:grid-cols-[180px_minmax(0,1fr)]">
          <SettingsNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
