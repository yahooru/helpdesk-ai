import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "@/lib/auth/guards";
import { NexconnError } from "@/lib/nexconn/server";
import { AiBusyError, AiUnavailableError } from "@/lib/ai/gemini";

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return json({ error: err.message, code: err.code }, err.status);
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join(".");
    return json(
      { error: first ? `${field ? `${field}: ` : ""}${first.message}` : "Invalid input", code: "invalid", issues: err.issues },
      400,
    );
  }
  if (err instanceof AiUnavailableError) return json({ error: err.message, code: "ai_unavailable" }, 503);
  if (err instanceof AiBusyError) return json({ error: "The AI assistant is busy. Try again in a moment.", code: "ai_busy" }, 503);
  if (err instanceof NexconnError) {
    console.error("[nexconn]", err.message);
    return json({ error: "The chat service did not respond. Try again in a moment.", code: "chat_unavailable" }, 502);
  }
  console.error("[api] unexpected error", err);
  return json({ error: "Something went wrong on our side. Try again.", code: "internal" }, 500);
}

/** Wraps a route handler so thrown HttpError / ZodError become JSON responses. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON", "invalid_json");
  }
  return schema.parse(body);
}
