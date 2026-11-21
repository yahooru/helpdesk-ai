import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { visitors, workspaces, type Visitor, type Workspace } from "@/lib/db/schema";
import { HttpError } from "./guards";
import { safeEqualHex, sha256 } from "./tokens";

/**
 * Customer (visitor) authentication for widget / hosted page APIs.
 * The browser keeps `<visitorId>.<secret>` in the embed origin's localStorage and sends it as
 * `Authorization: Bearer ...`. Only the SHA-256 of the secret is stored.
 */
export function visitorCredential(visitorId: string, secret: string): string {
  return `${visitorId}.${secret}`;
}

export function parseVisitorCredential(header: string | null): { visitorId: string; secret: string } | null {
  if (!header) return null;
  const m = /^Bearer\s+([0-9a-f-]{36})\.([A-Za-z0-9_-]{20,})$/i.exec(header.trim());
  return m ? { visitorId: m[1], secret: m[2] } : null;
}

export async function findVisitor(header: string | null): Promise<{ visitor: Visitor; workspace: Workspace } | null> {
  const cred = parseVisitorCredential(header);
  if (!cred) return null;
  const [row] = await db()
    .select({ visitor: visitors, workspace: workspaces })
    .from(visitors)
    .innerJoin(workspaces, eq(workspaces.id, visitors.workspaceId))
    .where(eq(visitors.id, cred.visitorId))
    .limit(1);
  if (!row) return null;
  if (!safeEqualHex(sha256(cred.secret), row.visitor.secretHash)) return null;
  return row;
}

export async function requireVisitor(req: Request): Promise<{ visitor: Visitor; workspace: Workspace }> {
  const found = await findVisitor(req.headers.get("authorization"));
  if (!found) throw new HttpError(401, "Your chat session expired. Reload to start again.", "visitor_unauthenticated");
  return found;
}
