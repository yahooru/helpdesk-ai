import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";

/**
 * Gemini access (server only). Model names always come from env:
 * GEMINI_MODEL (primary), GEMINI_FALLBACK_MODEL, GEMINI_EMBED_MODEL.
 * Free-tier keys see 429/503 regularly, so every call retries with exponential backoff and then
 * falls back to the fallback model.
 */

export class AiUnavailableError extends Error {
  constructor(message = "The AI assistant is not configured") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiBusyError extends Error {
  constructor(message = "The AI assistant is busy right now") {
    super(message);
    this.name = "AiBusyError";
  }
}

let client: GoogleGenAI | null = null;

export function aiConfigured(): boolean {
  const e = env();
  return Boolean(e.GEMINI_API_KEY && e.GEMINI_MODEL && e.GEMINI_EMBED_MODEL);
}

function gemini(): GoogleGenAI {
  const key = env().GEMINI_API_KEY;
  if (!key) throw new AiUnavailableError();
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

function chatModels(): string[] {
  const { GEMINI_MODEL, GEMINI_FALLBACK_MODEL } = env();
  if (!GEMINI_MODEL) throw new AiUnavailableError();
  return GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL
    ? [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]
    : [GEMINI_MODEL];
}

function embedModel(): string {
  const m = env().GEMINI_EMBED_MODEL;
  if (!m) throw new AiUnavailableError();
  return m;
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof e.status === "number") return e.status;
    if (typeof e.code === "number") return e.code;
    if (typeof e.message === "string") {
      const m = /\b(429|500|502|503|504)\b/.exec(e.message);
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  if (status && [429, 500, 502, 503, 504].includes(status)) return true;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket|network|aborted|timeout/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn` per model with retries: up to `attempts` tries per model with exponential backoff
 * (300ms, 900ms, ...) on retryable errors, then moves to the fallback model.
 */
async function withModels<T>(fn: (model: string) => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (const model of chatModels()) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await fn(model);
      } catch (err) {
        lastError = err;
        if (!isRetryable(err)) throw err;
        await sleep(300 * Math.pow(3, attempt) + Math.random() * 150);
      }
    }
  }
  if (isRetryable(lastError)) throw new AiBusyError();
  throw lastError instanceof Error ? lastError : new AiBusyError();
}

type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Embeds texts (768 dims, L2-normalized for cosine search). Retries transient failures. */
export async function embedTexts(texts: string[], taskType: EmbedTask): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  const BATCH = 50;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    let lastError: unknown;
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      try {
        const res = await gemini().models.embedContent({
          model: embedModel(),
          contents: batch,
          config: {
            taskType,
            outputDimensionality: EMBEDDING_DIMENSIONS,
            abortSignal: AbortSignal.timeout(30_000),
          },
        });
        const embeddings = res.embeddings ?? [];
        if (embeddings.length !== batch.length) throw new Error("Embedding count mismatch");
        for (const e of embeddings) {
          const values = e.values ?? [];
          if (values.length !== EMBEDDING_DIMENSIONS) throw new Error(`Unexpected embedding size ${values.length}`);
          out.push(normalize(values));
        }
        done = true;
      } catch (err) {
        lastError = err;
        if (!isRetryable(err)) throw err;
        await sleep(400 * Math.pow(2.5, attempt) + Math.random() * 200);
      }
    }
    if (!done) throw isRetryable(lastError) ? new AiBusyError() : lastError;
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text.slice(0, 2000)], "RETRIEVAL_QUERY");
  return v;
}

/** Calls Gemini with a JSON response schema and parses the result. */
export async function generateJson<T>(input: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<T> {
  return withModels(async (model) => {
    const res = await gemini().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      config: {
        systemInstruction: input.system,
        responseMimeType: "application/json",
        responseSchema: input.schema,
        maxOutputTokens: input.maxOutputTokens ?? 600,
        temperature: input.temperature ?? 0.2,
        abortSignal: AbortSignal.timeout(input.timeoutMs ?? 20_000),
      },
    });
    const text = res.text ?? "";
    return JSON.parse(text) as T;
  });
}

/** Generates plain text (non-streaming). */
export async function generateText(input: {
  system: string;
  contents: { role: "user" | "model"; text: string }[];
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  return withModels(async (model) => {
    const res = await gemini().models.generateContent({
      model,
      contents: input.contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
      config: {
        systemInstruction: input.system,
        maxOutputTokens: input.maxOutputTokens ?? 600,
        temperature: input.temperature ?? 0.3,
        abortSignal: AbortSignal.timeout(input.timeoutMs ?? 25_000),
      },
    });
    return (res.text ?? "").trim();
  });
}

/**
 * Opens a Gemini text stream (retrying the *opening* of the stream across models) and returns an
 * async iterator of text deltas.
 */
export async function openTextStream(input: {
  system: string;
  contents: { role: "user" | "model"; text: string }[];
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<AsyncGenerator<string>> {
  const stream = await withModels((model) =>
    gemini().models.generateContentStream({
      model,
      contents: input.contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
      config: {
        systemInstruction: input.system,
        maxOutputTokens: input.maxOutputTokens ?? 700,
        temperature: input.temperature ?? 0.3,
        abortSignal: AbortSignal.timeout(input.timeoutMs ?? 45_000),
      },
    }),
  );
  async function* deltas() {
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }
  return deltas();
}
