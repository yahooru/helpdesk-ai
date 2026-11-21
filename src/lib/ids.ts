import { customAlphabet } from "nanoid";

const alnum = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 22);

/** Nexconn user / channel IDs: prefix + random letters and digits only (never sequential). */
export function nexconnId(prefix: string): string {
  return `${prefix}${alnum()}`;
}

export function isNexconnId(value: string): boolean {
  return /^[A-Za-z0-9]{1,64}$/.test(value);
}
