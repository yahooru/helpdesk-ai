/**
 * Cached teammate tokens are stored as `nx1|<appKey>|<token>`, so a token issued by a different
 * Nexconn app (after an App Key change) is never handed to the browser again. Tokens stored by
 * earlier versions have no prefix and are treated as stale.
 */
const FORMAT = "nx1";

export function packToken(token: string, appKey: string): string {
  return `${FORMAT}|${appKey}|${token}`;
}

export function unpackToken(stored: string | null | undefined, appKey: string): string | null {
  if (!stored || !stored.startsWith(`${FORMAT}|`)) return null;
  const rest = stored.slice(FORMAT.length + 1);
  const bar = rest.indexOf("|");
  if (bar < 0 || rest.slice(0, bar) !== appKey) return null;
  return rest.slice(bar + 1) || null;
}
