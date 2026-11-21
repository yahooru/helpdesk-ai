import { z } from "zod";
import { isBrandColor } from "@/lib/brand";
import { isValidSlug, slugify } from "@/lib/slug";

export const workspaceNameSchema = z.string().trim().min(2, "Use at least 2 characters").max(60, "Use at most 60 characters");
export const slugSchema = z
  .string()
  .trim()
  .transform((s) => slugify(s))
  .refine(isValidSlug, "Use 3 to 40 lowercase letters, digits or dashes");
export const brandColorSchema = z.string().refine(isBrandColor, "Pick one of the brand colors");
export const greetingSchema = z.string().trim().min(2, "Write a short greeting").max(240, "Keep the greeting under 240 characters");

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  slug: slugSchema,
  brandColor: brandColorSchema,
  greeting: greetingSchema,
});

export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema,
    slug: slugSchema,
    brandColor: brandColorSchema,
    greeting: greetingSchema,
    botName: z.string().trim().min(2, "Use at least 2 characters").max(60, "Use at most 60 characters"),
    aiEnabled: z.boolean(),
    aiTone: z.enum(["friendly", "professional", "concise"]),
    handoffOnNoAnswer: z.enum(["offer", "auto"]),
    aiInstructions: z.string().trim().max(1500, "Keep instructions under 1,500 characters"),
    autoAssign: z.boolean(),
    removeLogo: z.literal(true),
  })
  .partial();
