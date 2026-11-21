import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "hd_session";
export const WORKSPACE_COOKIE = "hd_ws";
const SESSION_DAYS = 30;

function key() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export type SessionPayload = { userId: string };

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setIssuer("helpdesk-ai")
    .sign(key());
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: "helpdesk-ai", algorithms: ["HS256"] });
    return typeof payload.uid === "string" ? { userId: payload.uid } : null;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_DAYS * 86400 });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(WORKSPACE_COOKIE);
}

export async function setWorkspaceCookie(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { ...cookieBase, maxAge: 365 * 86400 });
}

export async function getSession(): Promise<SessionPayload | null> {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getWorkspaceCookie(): Promise<string | undefined> {
  return (await cookies()).get(WORKSPACE_COOKIE)?.value;
}
