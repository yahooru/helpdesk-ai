/** Compact elapsed duration: 45s, 3m, 1h 05m, 2d 4h. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** Clock-style timer for SLA chips: 0:42, 12:07, 1:02:33. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Relative timestamp for lists: "now", "4m", "2h", "Mon", "Nov 3". */
export function formatRelative(date: Date | string | number, now = Date.now()): string {
  const t = new Date(date).getTime();
  const diff = now - t;
  if (diff < 45_000) return "now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3600_000)}h`;
  if (diff < 6 * 86_400_000) return new Date(t).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** SLA severity for time waiting on a first human reply. */
export function slaLevel(waitMs: number): "ok" | "warn" | "breach" {
  if (waitMs >= 5 * 60_000) return "breach";
  if (waitMs >= 2 * 60_000) return "warn";
  return "ok";
}
