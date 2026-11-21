"use client";
import { BarChart3, BookOpen, Check, ChevronsUpDown, ExternalLink, Inbox, LogOut, Plus, Settings } from "lucide-react";
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
  const available = availability === "available";

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 items-center gap-1 bg-ink px-2 py-1.5 text-white md:h-dvh md:w-[236px] md:flex-col md:items-stretch md:gap-0 md:px-3 md:py-3"
    >
      <div ref={menuRef} className="relative md:mb-5">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-haspopup="menu"
          className="flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left transition-colors hover:bg-white/8"
        >
          {workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt="" className="size-8 rounded-[8px] bg-white object-cover" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-white">
              <BrandGlyph size={24} />
            </span>
          )}
          <span className="hidden min-w-0 flex-1 md:block">
            <span className="block truncate text-sm font-semibold">{workspace.name}</span>
            <span className="block truncate text-xs text-white/55">{role === "admin" ? "Admin" : "Agent"}</span>
          </span>
          <ChevronsUpDown className="hidden size-4 text-white/45 md:block" aria-hidden />
        </button>
        {menu ? (
          <div
            role="menu"
            className="pop-in absolute left-0 z-30 mt-1.5 w-72 rounded-[var(--radius-panel)] border border-line bg-surface p-1.5 text-ink shadow-lg"
          >
            <div className="flex items-center gap-2.5 px-2 py-2">
              <Avatar name={user.name} size={32} tone="enamel" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <div className="mt-1 border-t border-line pt-1">
              <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted">Workspaces</p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  role="menuitem"
                  type="button"
                  disabled={w.id === workspace.id}
                  onClick={() => switchTo(w.id)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-2 py-1.5 text-left text-sm hover:bg-wash disabled:font-semibold disabled:hover:bg-transparent"
                >
                  <span className="truncate">{w.name}</span>
                  {w.id === workspace.id ? <Check className="size-4 text-enamel" aria-hidden /> : null}
                </button>
              ))}
              <Link
                role="menuitem"
                href="/onboarding?new=1"
                className="flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-muted hover:bg-wash hover:text-ink"
              >
                <Plus className="size-4" aria-hidden /> Create another workspace
              </Link>
            </div>
            <div className="mt-1 border-t border-line pt-1">
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

      <ul className="flex flex-1 items-center gap-0.5 overflow-x-auto md:flex-none md:flex-col md:items-stretch md:gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-[8px] px-2.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                )}
              >
                {active ? <span aria-hidden className="absolute top-2 bottom-2 -left-3 hidden w-[3px] rounded-r-full bg-brass md:block" /> : null}
                <item.icon className="size-[18px]" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto hidden flex-col gap-2 md:flex">
        <a
          href={`/s/${workspace.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-[8px] px-2.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/6 hover:text-white"
        >
          Support page
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <div className="flex items-center gap-2.5 rounded-[10px] border border-ink-line bg-ink-raised p-2">
          <Avatar name={user.name} size={30} tone="enamel" online={available} className="[&>span:last-child]:border-ink-raised" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              onClick={toggleAvailability}
              className="text-xs text-white/55 underline-offset-2 hover:text-white hover:underline"
              title={available ? "You receive new conversations. Click to go away." : "You don't receive new conversations. Click to become available."}
            >
              {available ? "Available for new chats" : "Away"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
