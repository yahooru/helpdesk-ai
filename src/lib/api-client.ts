"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal; form?: FormData };

/** Fetch wrapper for our JSON API: throws ApiError with the server's readable message. */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
      headers: opts.form ? opts.headers : { "Content-Type": "application/json", ...(opts.headers ?? {}) },
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, "network");
  }
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; code?: string };
    throw new ApiError(d.error ?? `Request failed (${res.status})`, res.status, d.code);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}
