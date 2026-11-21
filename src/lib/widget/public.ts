import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaces, type Workspace } from "@/lib/db/schema";

export type PublicWorkspace = {
  slug: string;
  name: string;
  brandColor: string;
  logoUrl: string | null;
  greeting: string;
  botName: string;
  botUserId: string;
  aiEnabled: boolean;
};

export function toPublicWorkspace(w: Workspace): PublicWorkspace {
  return {
    slug: w.slug,
    name: w.name,
    brandColor: w.brandColor,
    logoUrl: w.logoUrl,
    greeting: w.greeting,
    botName: w.botName,
    botUserId: w.botUserId,
    aiEnabled: w.aiEnabled,
  };
}

export const workspaceBySlug = cache(async (slug: string): Promise<Workspace | null> => {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const [w] = await db().select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return w ?? null;
});

export const attachmentSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Invalid URL"),
  name: z.string().max(200),
  size: z.number().int().nonnegative().optional(),
  mime: z.string().max(100).optional(),
});

export const recordMessageSchema = z.object({
  nexconnMessageId: z.string().regex(/^[A-Za-z0-9-]{6,64}$/, "Invalid message id"),
  kind: z.enum(["text", "image", "file"]),
  text: z.string().max(5000).default(""),
  attachment: attachmentSchema.nullish(),
});
