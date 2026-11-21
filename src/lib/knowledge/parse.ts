import "server-only";
import { HttpError } from "@/lib/auth/guards";
import { normalizeText } from "./chunk";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_KNOWLEDGE_CHARS = 200_000;
export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".pdf"] as const;

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i).toLowerCase() : "";
}

/** Extracts plain text from an uploaded .txt / .md / .pdf file (server-side). */
export async function extractFileText(file: File): Promise<{ text: string; pages?: number }> {
  const ext = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new HttpError(415, "Upload a .txt, .md or .pdf file", "unsupported_type");
  }
  if (file.size === 0) throw new HttpError(400, "That file is empty", "empty_file");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files can be up to 10 MB", "too_large");

  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let result: { totalPages: number; text: string };
    try {
      const pdf = await getDocumentProxy(bytes);
      result = await extractText(pdf, { mergePages: true });
    } catch {
      throw new HttpError(422, "We could not read that PDF. Check that it is not password-protected.", "pdf_unreadable");
    }
    const text = normalizeText(result.text);
    if (text.length < 20) {
      throw new HttpError(
        422,
        "That PDF has no selectable text (it may be a scan). Paste the text instead.",
        "pdf_no_text",
      );
    }
    return { text: text.slice(0, MAX_KNOWLEDGE_CHARS), pages: result.totalPages };
  }

  const text = normalizeText(new TextDecoder("utf-8", { fatal: false }).decode(await file.arrayBuffer()));
  if (!text) throw new HttpError(400, "That file has no text", "empty_file");
  return { text: text.slice(0, MAX_KNOWLEDGE_CHARS) };
}

/** Title from a file name: "refund-policy_v2.md" -> "Refund policy v2". */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const t = base.charAt(0).toUpperCase() + base.slice(1);
  return t.slice(0, 160) || "Uploaded document";
}
