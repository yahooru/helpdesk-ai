export const RESERVED_SLUGS = new Set([
  "app", "api", "admin", "login", "signup", "logout", "invite", "embed", "widget", "s", "settings",
  "help", "support", "www", "static", "assets", "onboarding", "docs", "me", "conversations", "chat-session",
]);

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) && !RESERVED_SLUGS.has(slug);
}
