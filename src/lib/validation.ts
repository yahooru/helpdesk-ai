import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(200, "Use at most 200 characters");
export const personNameSchema = z.string().trim().min(1, "Enter your name").max(64, "Use at most 64 characters");
export const uuidSchema = z.string().uuid();
