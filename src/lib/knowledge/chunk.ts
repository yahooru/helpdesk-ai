/**
 * Splits knowledge text into overlapping chunks for embedding.
 * Paragraph-aware: packs whole paragraphs up to `maxChars`, splitting long paragraphs on sentence
 * boundaries, and carries a small tail of the previous chunk forward for context.
 */
export type ChunkOptions = { maxChars?: number; overlapChars?: number };

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.match(/[^.!?\n]+[.!?]*\s*/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) parts.push(current.trim());
      current = "";
      for (let i = 0; i < sentence.length; i += maxChars) parts.push(sentence.slice(i, i + maxChars).trim());
      continue;
    }
    if ((current + sentence).length > maxChars && current) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 1100;
  const overlapChars = options.overlapChars ?? 160;
  const text = normalizeText(input);
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => splitLongParagraph(p, maxChars));

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      const tail = current.slice(Math.max(0, current.length - overlapChars));
      const boundary = tail.search(/\s/);
      const overlap = boundary >= 0 ? tail.slice(boundary + 1) : "";
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Prefixes each chunk with its article title so retrieval keeps the topic. */
export function chunkArticle(title: string, body: string, options?: ChunkOptions): string[] {
  return chunkText(body, options).map((c) => `${title.trim()}\n\n${c}`);
}
