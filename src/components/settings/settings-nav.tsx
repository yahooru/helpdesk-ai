"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app/settings", label: "Workspace" },
  { href: "/app/settings/ai", label: "Assistant" },
  { href: "/app/settings/install", label: "Install" },
  { href: "/app/settings/team", label: "Team" },
  { href: "/app/settings/replies", label: "Saved replies" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {ITEMS.map((i) => {
          const active = pathname === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium",
                  active ? "bg-wash text-ink" : "text-muted hover:bg-wash hover:text-ink",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
