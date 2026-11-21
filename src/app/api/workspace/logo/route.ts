import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { HttpError, requireAdmin } from "@/lib/auth/guards";
import { safeFileName, storeFile } from "@/lib/blob";
import { json, route } from "@/lib/http";
import { refreshBotProfile } from "@/lib/workspaces/service";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const POST = route(async (req: Request) => {
  const { workspace } = await requireAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload", "no_file");
  if (!TYPES.includes(file.type)) throw new HttpError(415, "Use a PNG, JPG, WebP or GIF image", "unsupported_type");
  if (file.size > MAX_LOGO_BYTES) throw new HttpError(413, "Logos can be up to 2 MB", "too_large");
  const url = await storeFile(`logos/${workspace.id}/${safeFileName(file.name)}`, file);
  const [updated] = await db().update(workspaces).set({ logoUrl: url }).where(eq(workspaces.id, workspace.id)).returning();
  await refreshBotProfile(updated);
  return json({ logoUrl: url });
});
