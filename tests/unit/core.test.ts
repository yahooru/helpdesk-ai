import { describe, expect, it } from "vitest";
import { chunkArticle, chunkText, normalizeText } from "@/lib/knowledge/chunk";
import { citedSourceNumbers, isNoAnswer, looksLikeHumanRequest, mayBeNoAnswer, answerSystemPrompt } from "@/lib/ai/prompts";
import { BRAND_SWATCHES, contrastRatio, isBrandColor } from "@/lib/brand";
import { isValidSlug, slugify } from "@/lib/slug";
import { formatClock, formatDuration, slaLevel } from "@/lib/time";
import { isNexconnId, nexconnId } from "@/lib/ids";
import { parseVisitorCredential, visitorCredential } from "@/lib/auth/visitor";
import { titleFromFileName, extensionOf } from "@/lib/knowledge/parse";
import { packToken, unpackToken } from "@/lib/nexconn/token-cache";

describe("knowledge chunking", () => {
  it("normalizes whitespace and line endings", () => {
    expect(normalizeText("a\r\n\r\n\r\n\r\nb  \nc")).toBe("a\n\nb\nc");
  });
  it("keeps short text as one chunk", () => {
    expect(chunkText("Delivery takes 3 days.")).toEqual(["Delivery takes 3 days."]);
  });
  it("splits long text into bounded, overlapping chunks", () => {
    const para = "Sentence about refunds and returns policy. ".repeat(30).trim();
    const text = Array.from({ length: 6 }, () => para).join("\n\n");
    const chunks = chunkText(text, { maxChars: 600, overlapChars: 80 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(600 + 80 + 2);
  });
  it("prefixes chunks with the article title", () => {
    const [first] = chunkArticle("Shipping", "We ship worldwide.");
    expect(first.startsWith("Shipping\n\n")).toBe(true);
  });
  it("returns nothing for empty input", () => {
    expect(chunkText("   \n\n ")).toEqual([]);
  });
});

describe("assistant prompt helpers", () => {
  it("extracts cited source numbers in order without duplicates", () => {
    expect(citedSourceNumbers("Express costs $12 [2]. Standard is free [1][2]. See [1, 3].", 3)).toEqual([2, 1, 3]);
  });
  it("ignores citations to sources that don't exist", () => {
    expect(citedSourceNumbers("Something [7]", 3)).toEqual([]);
  });
  it("detects the NO_ANSWER sentinel and its prefixes", () => {
    expect(isNoAnswer("NO_ANSWER")).toBe(true);
    expect(isNoAnswer("NO_ANSWER.")).toBe(true);
    expect(isNoAnswer("Express delivery is 1 day")).toBe(false);
    expect(mayBeNoAnswer("NO_")).toBe(true);
    expect(mayBeNoAnswer("Express")).toBe(false);
  });
  it("recognizes explicit requests for a human", () => {
    expect(looksLikeHumanRequest("Can I talk to a human please?")).toBe(true);
    expect(looksLikeHumanRequest("I want to speak with a real person")).toBe(true);
    expect(looksLikeHumanRequest("connect me to an agent")).toBe(true);
    expect(looksLikeHumanRequest("How long does delivery take?")).toBe(false);
  });
  it("puts numbered sources and the grounding rule in the system prompt", () => {
    const p = answerSystemPrompt({
      businessName: "Northwind",
      botName: "Northwind Assistant",
      tone: "concise",
      instructions: "",
      sources: [{ n: 1, title: "Shipping", content: "We ship in 3 days." }],
    });
    expect(p).toContain("[1] Shipping");
    expect(p).toContain("NO_ANSWER");
  });
});

describe("brand palette", () => {
  it("only offers swatches with AA contrast for white text", () => {
    for (const s of BRAND_SWATCHES) expect(contrastRatio(s.hex, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("validates brand colors case-insensitively", () => {
    expect(isBrandColor(BRAND_SWATCHES[0].hex.toLowerCase())).toBe(true);
    expect(isBrandColor("#ff00ff")).toBe(false);
  });
});

describe("slugs and ids", () => {
  it("slugifies business names", () => {
    expect(slugify("Northwind Bikes & Co.")).toBe("northwind-bikes-co");
    expect(slugify("  Café Été ")).toBe("cafe-ete");
  });
  it("rejects reserved and malformed slugs", () => {
    expect(isValidSlug("app")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("northwind-bikes")).toBe(true);
  });
  it("creates prefixed alphanumeric Nexconn ids", () => {
    const id = nexconnId("hdk");
    expect(id.startsWith("hdk")).toBe(true);
    expect(isNexconnId(id)).toBe(true);
    expect(nexconnId("hdk")).not.toBe(id);
  });
});

describe("visitor credentials", () => {
  it("round-trips the bearer credential format", () => {
    const cred = visitorCredential("3f1c2a7e-1111-4222-8333-944455556666", "abcdefghijklmnopqrstuvwxyz012345");
    expect(parseVisitorCredential(`Bearer ${cred}`)).toEqual({
      visitorId: "3f1c2a7e-1111-4222-8333-944455556666",
      secret: "abcdefghijklmnopqrstuvwxyz012345",
    });
    expect(parseVisitorCredential("Bearer nope")).toBeNull();
    expect(parseVisitorCredential(null)).toBeNull();
  });
});

describe("time formatting and SLA", () => {
  it("formats durations and clocks", () => {
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatDuration(3 * 60_000)).toBe("3m");
    expect(formatDuration(65 * 60_000)).toBe("1h 05m");
    expect(formatClock(62_000)).toBe("1:02");
    expect(formatClock(3_723_000)).toBe("1:02:03");
  });
  it("escalates SLA levels at 2 and 5 minutes", () => {
    expect(slaLevel(60_000)).toBe("ok");
    expect(slaLevel(3 * 60_000)).toBe("warn");
    expect(slaLevel(6 * 60_000)).toBe("breach");
  });
});

describe("upload helpers", () => {
  it("derives titles and extensions from file names", () => {
    expect(titleFromFileName("refund-policy_v2.md")).toBe("Refund policy v2");
    expect(extensionOf("Guide.PDF")).toBe(".pdf");
  });
});

describe("Nexconn token cache", () => {
  it("returns a cached token only for the App Key that issued it", () => {
    const stored = packToken("tok@abc|with|bars", "appA");
    expect(unpackToken(stored, "appA")).toBe("tok@abc|with|bars");
    expect(unpackToken(stored, "appB")).toBeNull();
  });
  it("treats tokens stored by earlier versions, or nothing, as stale", () => {
    expect(unpackToken("rawTokenFromOldVersion", "appA")).toBeNull();
    expect(unpackToken(null, "appA")).toBeNull();
    expect(unpackToken("nx1|appA|", "appA")).toBeNull();
  });
});
