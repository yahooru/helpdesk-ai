import { requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { isValidSlug, slugify } from "@/lib/slug";
import { slugAvailable } from "@/lib/workspaces/service";

export const GET = route(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const slug = slugify(params.get("slug") ?? "");
  const except = params.get("except");
  if (!isValidSlug(slug)) return json({ slug, available: false, reason: "Use 3 to 40 lowercase letters, digits or dashes." });
  const available = await slugAvailable(slug, except && /^[0-9a-f-]{36}$/.test(except) ? except : undefined);
  return json({ slug, available, reason: available ? null : "That address is taken." });
});
