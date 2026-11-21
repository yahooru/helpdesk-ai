/**
 * Pure prompt-building and parsing helpers for the AI assistant (unit tested).
 */

export const NO_ANSWER = "NO_ANSWER";

export type Tone = "friendly" | "professional" | "concise";

const TONE_RULES: Record<Tone, string> = {
  friendly: "Warm and plain-spoken. Short sentences. Address the customer directly.",
  professional: "Polite, precise and neutral. No slang, no exclamation marks.",
  concise: "As brief as possible: one to three sentences, or a short list for steps.",
};

export type PromptSource = { n: number; title: string; content: string };

export function answerSystemPrompt(input: {
  businessName: string;
  botName: string;
  tone: Tone;
  instructions: string;
  sources: PromptSource[];
}): string {
  const sources = input.sources
    .map((s) => `[${s.n}] ${s.title}\n${s.content.replace(/\n{3,}/g, "\n\n").slice(0, 1800)}`)
    .join("\n\n---\n\n");
  return [
    `You are ${input.botName}, the support assistant for ${input.businessName}.`,
    `Tone: ${TONE_RULES[input.tone]}`,
    "Rules:",
    "- Answer ONLY with facts found in the numbered sources below. Do not use outside knowledge.",
    "- After each fact you use, cite its source number in square brackets, like [1] or [2].",
    `- If the sources do not contain the answer, reply with exactly ${NO_ANSWER} and nothing else.`,
    "- Never invent prices, policies, dates, links, phone numbers or promises.",
    "- Keep it under 120 words unless the customer needs numbered steps. Plain text, no headings.",
    "- If the customer asks for a human, tell them they can press 'Talk to a person'.",
    input.instructions.trim() ? `Business instructions (follow unless they conflict with the rules): ${input.instructions.trim().slice(0, 1500)}` : "",
    "",
    "Sources:",
    sources || "(none)",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function smallTalkSystemPrompt(input: { businessName: string; botName: string; tone: Tone }): string {
  return [
    `You are ${input.botName}, the support assistant for ${input.businessName}.`,
    `Tone: ${TONE_RULES[input.tone]}`,
    "The customer sent a greeting, thanks or small talk. Reply in one or two short sentences and invite",
    "them to ask their question. Do not state any facts about the business.",
  ].join("\n");
}

export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["question", "human_request", "small_talk", "resolved"],
      description:
        "question: wants information or help. human_request: asks for a person/agent/representative or is clearly frustrated with the bot. small_talk: greeting or chit-chat with no question. resolved: says the problem is solved / thanks and goodbye.",
    },
    search_query: {
      type: "string",
      description: "A standalone search query for the help articles, rewritten using the conversation context. Empty for non-questions.",
    },
  },
  required: ["intent", "search_query"],
} as const;

export type Triage = { intent: "question" | "human_request" | "small_talk" | "resolved"; search_query: string };

export function triagePrompt(history: { role: "customer" | "assistant" | "agent"; text: string }[], latest: string): string {
  const lines = history.slice(-8).map((h) => `${h.role}: ${h.text.slice(0, 500)}`);
  return [
    "Classify the customer's latest message in a support chat.",
    lines.length ? `Conversation so far:\n${lines.join("\n")}` : "",
    `Latest customer message: ${latest.slice(0, 1500)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Fast keyword check for explicit human requests (runs before the model call). */
export function looksLikeHumanRequest(text: string): boolean {
  const t = text.toLowerCase();
  const who = "(human|person|agent|representative|rep|someone|somebody|staff|operator|manager|people)";
  return (
    new RegExp(`\\b(talk|speak|chat|connect|transfer|put)\\s+(me\\s+)?(to|with|through to)\\s+(a\\s+|an\\s+|the\\s+|real\\s+|live\\s+)*${who}\\b`).test(t) ||
    new RegExp(`\\b(need|want|get)\\s+(a\\s+|an\\s+|to\\s+talk\\s+to\\s+a\\s+)?(real\\s+|live\\s+)?(human|person|agent|representative)\\b`).test(t) ||
    /\b(real|live)\s+(human|person|agent)\b/.test(t) ||
    /\b(human|agent|representative|operator)\s+please\b/.test(t)
  );
}

/** True when the streamed text so far is (or may still become) the NO_ANSWER sentinel. */
export function mayBeNoAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return NO_ANSWER.startsWith(t.slice(0, NO_ANSWER.length)) && t.length <= NO_ANSWER.length + 2;
}

export function isNoAnswer(text: string): boolean {
  return text.trim().replace(/[.\s]+$/, "") === NO_ANSWER || text.trim().startsWith(NO_ANSWER);
}

/** Source numbers cited in the answer, in first-seen order, limited to known sources. */
export function citedSourceNumbers(answer: string, available: number): number[] {
  const seen: number[] = [];
  for (const m of answer.matchAll(/\[(\d{1,2})(?:\s*,\s*(\d{1,2}))*\]/g)) {
    const nums = m[0].slice(1, -1).split(",").map((x) => Number(x.trim()));
    for (const n of nums) if (n >= 1 && n <= available && !seen.includes(n)) seen.push(n);
  }
  return seen;
}

export function suggestionSystemPrompt(input: { businessName: string; agentName: string; tone: Tone; sources: PromptSource[] }) {
  const sources = input.sources.map((s) => `[${s.n}] ${s.title}\n${s.content.slice(0, 1500)}`).join("\n\n---\n\n");
  return [
    `You draft replies for ${input.agentName}, a human support agent at ${input.businessName}.`,
    `Tone: ${TONE_RULES[input.tone]}`,
    "Write the next reply to the customer in the agent's voice (first person). Use the help articles",
    "when relevant and do not invent facts; if something is unknown, say the agent will check.",
    "Do not include citation markers. Under 90 words.",
    "",
    "Help articles:",
    sources || "(none)",
  ].join("\n");
}

export function articleDraftSystemPrompt(businessName: string) {
  return [
    `You write help-center articles for ${businessName}.`,
    "Turn the support conversation into a short FAQ answer to the customer's question, using only what",
    "the human agent actually said. Write in neutral third person, plain text, under 150 words.",
    "If the agent never answered, return an empty body.",
  ].join("\n");
}

export const ARTICLE_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "The question, phrased as a clear article title" },
    body: { type: "string", description: "The answer, or empty if the conversation has no answer" },
  },
  required: ["title", "body"],
} as const;
