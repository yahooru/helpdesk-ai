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

/**
 * The address while someone is typing it: the same characters as slugify, but a trailing dash is
 * kept so "my-" can still become "my-shop". Save and check slugify(draft), never the draft.
 */
export function slugDraft(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 40);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) && !RESERVED_SLUGS.has(slug);
}
