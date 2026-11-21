"use client";
import { BarChart3, BookOpen, ChevronsUpDown, Inbox, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandGlyph } from "@/components/brand-mark";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3, admin: true },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

type WorkspaceOption = { id: string; name: string };

export function AppNav({
  user,
  workspace,
  workspaces,
  role,
  availability: initialAvailability,
}: {
  user: { name: string; email: string };
  workspace: { id: string; name: string; slug: string; logoUrl: string | null };
  workspaces: WorkspaceOption[];
  role: "admin" | "agent";
  availability: "available" | "away";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [availability, setAvailability] = useState(initialAvailability);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function toggleAvailability() {
    const next = availability === "available" ? "away" : "available";
    setAvailability(next);
    try {
      await api("/api/me/availability", { method: "PATCH", body: { availability: next } });
    } catch {
      setAvailability(availability);
    }
  }

  async function switchTo(id: string) {
    await api("/api/workspace/switch", { body: { workspaceId: id } });
    setMenu(false);
    router.replace("/app/inbox");
    router.refresh();
  }

  async function signOut() {
    await api("/api/auth/logout", { body: {} }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  const items = NAV.filter((n) => !n.admin || role === "admin");

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 items-center gap-1 border-b border-line bg-surface px-2 py-1.5 md:h-dvh md:w-[208px] md:flex-col md:items-stretch md:gap-0 md:border-r md:border-b-0 md:px-3 md:py-3"
    >
      <div ref={menuRef} className="relative md:mb-4">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-haspopup="menu"
          className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1.5 text-left hover:bg-wash"
        >
          {workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt="" className="size-7 rounded-md object-cover" />
          ) : (
            <BrandGlyph size={28} />
          )}
          <span className="hidden min-w-0 flex-1 md:block">
            <span className="block truncate text-sm font-semibold">{workspace.name}</span>
            <span className="block truncate text-xs text-muted">{user.name}</span>
          </span>
          <ChevronsUpDown className="hidden size-4 text-muted md:block" aria-hidden />
        </button>
        {menu ? (
          <div role="menu" className="rise-in absolute left-0 z-30 mt-1 w-64 rounded-[var(--radius-panel)] border border-line-strong bg-surface p-1.5 shadow-[0_14px_32px_-12px_rgba(29,38,34,0.3)]">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar name={user.name} size={28} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <button
              role="menuitemcheckbox"
              aria-checked={availability === "available"}
              type="button"
              onClick={toggleAvailability}
              className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-2 py-2 text-sm hover:bg-wash"
            >
              <span className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", availability === "available" ? "bg-enamel" : "bg-[color:var(--faint)]")} />
                {availability === "available" ? "Available for new chats" : "Away"}
              </span>
              <span className="text-xs text-muted">Change</span>
            </button>
            {workspaces.length > 1 ? (
              <div className="mt-1 border-t border-line pt-1">
                <p className="px-2 py-1 text-xs text-muted">Switch workspace</p>
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    role="menuitem"
                    type="button"
                    disabled={w.id === workspace.id}
                    onClick={() => switchTo(w.id)}
                    className="flex w-full items-center rounded-[var(--radius-control)] px-2 py-1.5 text-left text-sm hover:bg-wash disabled:font-semibold disabled:hover:bg-transparent"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-1 border-t border-line pt-1">
              <Link role="menuitem" href="/onboarding?new=1" className="block rounded-[var(--radius-control)] px-2 py-1.5 text-sm hover:bg-wash">
                Create another workspace
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm hover:bg-wash"
              >
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <ul className="flex flex-1 items-center gap-0.5 overflow-x-auto md:flex-none md:flex-col md:items-stretch">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-ink text-white" : "text-muted hover:bg-wash hover:text-ink",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto hidden md:block">
        <a
          href={`/s/${workspace.slug}`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-[var(--radius-control)] px-2.5 py-2 text-xs text-muted hover:bg-wash hover:text-ink"
        >
          Open support page
        </a>
      </div>
    </nav>
  );
}
