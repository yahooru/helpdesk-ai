import "server-only";
import { put } from "@vercel/blob";
import { HttpError } from "@/lib/auth/guards";

/** Stores a file in the public Vercel Blob store under a random suffix and returns its URL. */
export async function storeFile(pathname: string, file: File | Blob, contentType?: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, "File storage is not configured", "storage_unavailable");
  const result = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: contentType ?? (file instanceof File ? file.type : undefined),
  });
  return result.url;
}

export function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";
}
