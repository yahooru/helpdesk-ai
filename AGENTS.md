# AGENTS.md: HelpDesk AI

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Purpose

HelpDesk AI is a customer-support platform a small business can set up in five minutes. An AI
assistant answers customers first, grounded only in the business's own knowledge, and hands the
same live conversation to a human agent when the customer asks or the AI cannot answer.
Realtime messaging runs on Nexconn (Chat SDK for Web + Platform Chat API).

## User journeys

### Business owner (admin)
1. **First visit**: lands on `/`, reads the one-line install promise, clicks "Create your help desk".
2. **Sign up** (`/signup`): name, email, password (bcrypt). Session cookie (httpOnly JWT).
3. **Onboarding** (`/onboarding`), a three-step sequence:
   1. Workspace: business name, URL slug (auto, editable, uniqueness checked), brand color from the
      curated swatch set, optional logo upload (Vercel Blob), greeting line.
   2. Knowledge: write a first FAQ article, paste text, or upload `.txt/.md/.pdf` (parsed server-side,
      chunked, embedded with Gemini into pgvector). Can be skipped; the inbox reminds them.
   3. Install: copy the one-line `<script>` snippet, open the hosted page `/s/<slug>`.
4. **Daily use**: Inbox (`/app/inbox`), Knowledge (`/app/knowledge`), Analytics (`/app/analytics`),
   Settings (workspace, AI behavior, install, team, saved replies).
5. **Invite teammates**: Settings → Team → invite by email with role (admin/agent). The invite link
   (`/invite/<token>`, single-use, 7-day expiry, hashed in DB) is shown to copy and share.
6. **Knowledge gaps**: Analytics lists questions the AI could not answer (clustered by embedding
   similarity). "Write article" opens the editor pre-filled with the question and a draft built
   from the human agent's actual reply in that conversation.
7. **Edge cases**: duplicate slug, oversized/unsupported upload, scanned PDF with no text, Gemini
   unavailable (article saved, indexing marked failed with retry), removing the last admin blocked.

### Customer
1. Opens the widget launcher on the business's site (or the hosted page `/s/<slug>`).
2. Sees the business greeting and is asked for a name (email optional), then chats.
3. Sends a message; sees "Assistant is typing", then a streamed AI answer with citation chips
   linking to the source articles. Can mark the answer "That helped" (resolves) or ask for a person.
4. "Talk to a person" is always visible; asking in words ("can I speak to someone") is detected.
5. Sees a system line when a human joins ("Maya joined the conversation"), their typing, and "Seen"
   under their own messages once read.
6. Attaches images/files (Nexconn media messages).
7. When resolved, a rating card (CSAT, 1–5 + optional comment) appears in the chat.
8. **Returning**: identity persists in the iframe's storage; the same conversation and its history
   (Nexconn history pagination) load. Writing in a resolved conversation reopens it.
9. **Edge cases**: offline (reconnect banner, queued sends with retry), AI quota error (polite
   fallback and handoff offer), no agents online (told the team will reply here; email prompt).

### Human agent
1. Accepts invite, signs up or logs in, lands in the inbox.
2. Queues: Unassigned, Mine, All open, Resolved, with counts, unread badges, live updates and an
   SLA timer (time the customer has waited for a first human reply).
3. Claims a conversation (joins the Nexconn group) or receives one by round-robin auto-assign
   among available agents who are online (Nexconn presence).
4. Replies (text, image, file), sees customer typing and read receipts, uses saved replies,
   inserts and edits AI reply suggestions, writes internal notes (never sent to the customer channel).
5. Sees customer context: name, email, page URL and title they came from, past conversations.
6. Transfers to another agent (server removes/adds group members), resolves (sends CSAT card),
   reopens.

## Architecture

```
 External site                       HelpDesk AI (Next.js on Vercel)                 Nexconn (SG)
 ┌──────────────┐  <script>    ┌───────────────────────────────────────────┐
 │ widget.js    │─────────────▶│ /embed/<slug> (iframe, same origin as API)│──SDK──▶ WebSocket
 │ launcher +   │◀─postMessage─│ chat UI (Chat SDK for Web)                │
 │ iframe resize│              ├───────────────────────────────────────────┤
 └──────────────┘              │ /app/* console (inbox uses Chat SDK)      │──SDK──▶ WebSocket
                               ├───────────────────────────────────────────┤
                               │ /api/* route handlers                     │──REST─▶ Platform Chat API
                               │  auth, workspaces, knowledge, inbox,      │        (tokens, groups,
                               │  widget, AI pipeline (after())            │         bot/system msgs,
                               └───────┬───────────────┬───────────────────┘         streaming, metadata,
                                       │               │                              presence)
                                Neon Postgres     Gemini (@google/genai)
                                + pgvector        generate + embed
                                Vercel Blob (logos, uploaded docs)
```

* Each support conversation = one Nexconn **group channel** (owner: workspace bot user; members:
  customer + assigned agent). Transfer = server `leave` + `join`.
* Each workspace has one **staff group channel** (all teammates) used for live inbox events
  (custom status messages) and internal notes. Customers are never members.
* The AI bot is a real Nexconn user per workspace. The customer client calls
  `POST /api/widget/conversations/:id/messages` after a successful SDK send; the server verifies
  the visitor owns the conversation, mirrors the message, and in `after()` runs triage → retrieval
  → Gemini streaming → Nexconn group **streaming message** with citations in message metadata.
* Messages are mirrored in Postgres (`messages`) so agents who join later see the full transcript
  (Nexconn group history starts at join time by default) and analytics can be computed.

## Folder map

```
src/app/(auth)/            sign-up, sign-in, invite acceptance
src/app/onboarding/        three-step setup (workspace, knowledge, install)
src/app/app/               console: inbox, knowledge (+ editor, gap drafts), analytics, settings/*
src/app/s/[slug]/          hosted support page + public articles
src/app/embed/[slug]/      widget iframe content (launcher + chat), framed by public/widget.js
src/app/api/               route handlers: auth, workspace(s), chat session, knowledge, inbox,
                           team/invites, replies, gaps, me/availability, widget/* (customer APIs)
src/components/ui/         primitives (button, field, dialog, toast, switch, avatar, misc)
src/components/inbox/      agent inbox (list, conversation view, transcript, composer, customer panel)
src/components/customer/   customer chat hook + UI, widget app, hosted page chat
src/components/knowledge/  add knowledge (FAQ / paste / upload), list, editor, gap article form
src/components/analytics/  daily outcome chart, knowledge gaps
src/components/settings/   workspace, assistant, team, saved replies
src/lib/db/                Drizzle schema + Neon client (retrying fetch)
src/lib/nexconn/           server.ts (Platform API), client.ts (browser SDK wrapper), types.ts
src/lib/ai/                gemini.ts, prompts.ts, retrieval.ts, reply.ts (AI pipeline), assist.ts
src/lib/knowledge/         chunk.ts, parse.ts (txt/md/pdf), indexer.ts
src/lib/conversations/     service.ts (handoff, claim, transfer, resolve, CSAT), queries.ts
src/lib/auth/              password, session JWT cookie, guards, visitor credentials
drizzle/                   SQL migrations (committed)
public/widget.js           embeddable loader (iframe + postMessage resize)
examples/                  plain external HTML page with the one-line snippet
scripts/                   serve-examples.mjs (other origin for tests), cleanup-test-data.mjs
tests/e2e/                 Playwright (multi-context journeys, screenshots)
tests/unit/                Vitest
```

## Data model (Postgres, Drizzle)

users, workspaces, memberships, invites, visitors, conversations, messages, notes, articles,
chunks (pgvector 768), knowledge_gaps (pgvector 768), saved_replies, rate_limits. See
`src/lib/db/schema.ts`.

## Nexconn features used (and where)

The README table "How this uses Nexconn" lists each feature with file paths. Summary:

* Tokens / registration: `lib/nexconn/server.ts#issueToken` (bot per workspace, teammates, customers).
* Web SDK: init with `AreaCode.SG`, custom type registration, connection/message handlers, token
  refresh (31004), kick (31010), manual reconnect (33007), resync after reconnect: `lib/nexconn/client.ts`.
* Group channels: create (conversation + staff group), join/leave (claim, transfer, team changes),
  profile update, dismiss: `lib/widget/service.ts`, `lib/conversations/service.ts`, `lib/workspaces/service.ts`.
* Server-sent messages: bot replies, `HD:Event`, `HD:Csat`, `HD:Note`, `HD:Inbox`, `HD:Typing`, `HD:Stream`.
* Streaming: `RC:StreamMsg` via `/v4/group-channel/message/stream/send` (`lib/ai/reply.ts`); browsers attach
  with `getMessagesByIds` + `requestStreamMessage` + `onStreamMessageRequestDelta`. The Web SDK (26.2.1)
  does not deliver stream messages through `onMessageReceived`, hence the `HD:Stream` announcement.
* Metadata: citations and final text on AI answers, helpful feedback, CSAT rating (server
  `/v4/channel-type/message/metadata/set`; clients `onMessageMetadataUpdated`).
* Read receipts (`needReceipt`, `sendReadReceiptResponse`, `onMessageReceiptResponse`); typing via custom
  status messages (the SDK's `sendTypingStatus` exists only on direct channels); unread counts
  (`getUnreadChannels`, `clearUnreadCount`); history pagination (`createMessagesQuery`); media messages
  (`Helper.createSend*MessageParams` + `sendMediaMessage`); presence (server `/v4/user/connection-status/get`
  for round-robin, SDK `subscribeEvent(ONLINE_STATUS)` on the Team page).

## Environment variables (names only)

DATABASE_URL, DATABASE_URL_UNPOOLED, BLOB_READ_WRITE_TOKEN, NEXCONN_APP_KEY, NEXCONN_APP_SECRET,
NEXCONN_API_BASE, NEXCONN_ID_PREFIX, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL,
GEMINI_EMBED_MODEL, SESSION_SECRET, NEXT_PUBLIC_APP_URL (optional).

## Commands

```
npm run dev            # next dev on :3101
npm run typecheck      # tsc --noEmit
npm run lint
npm run test:unit      # vitest
npm run test:e2e       # playwright; E2E_BASE_URL targets production; starts the examples server on :3199
SCREENSHOTS=1 npx playwright test tests/e2e/screenshots.spec.ts   # refresh docs/*.png
npm run db:generate    # drizzle-kit generate after schema changes
npm run db:migrate     # apply migrations (uses DATABASE_URL_UNPOOLED)
node scripts/cleanup-test-data.mjs [--dry-run]   # delete @example.com test accounts + their Nexconn groups
vercel deploy --prod   # remote build; vercel.json pins framework nextjs + region sin1
```

## Testing approach

* Unit (Vitest): chunking, prompt helpers (citations, NO_ANSWER sentinel, human-request intent),
  palette contrast, slugs, ids, visitor credentials, SLA and time formatting.
* E2E (Playwright, real Neon + Nexconn + Gemini, no mocks): `support-journey.spec.ts` (owner, invited
  agent, customer on another origin: grounded AI answer, handoff, claim, typing, receipts, note,
  transfer, resolve, CSAT, returning customer; plus an authorization check) and
  `knowledge-analytics.spec.ts` (file upload, hosted page on a phone, knowledge gap to article).
  Test accounts use @example.com so `scripts/cleanup-test-data.mjs` can remove them.

## Known limitations

* Late-joining agents can't read Nexconn history from before they joined (console default), so the
  agent transcript comes from the Postgres mirror. The mirror depends on clients reporting their
  sends (retried 3 times) and on the server recording bot and system messages.
* No outbound email: customer emails are collected and shown to agents.
* Gemini free tier: 429/503 trigger backoff, then the fallback model, then a polite handoff.
* Customer identity lives in the widget iframe's storage, which modern browsers partition per
  top-level site, so it persists per site and browser, not across devices.
* Local dev and production share one Neon database; tests create @example.com accounts there.

## Conventions

* TypeScript strict; zod validation on every route; authorization on every route.
* Nexconn IDs: `${NEXCONN_ID_PREFIX}${nanoid(alnum)}` only (letters and digits).
* App Secret and Gemini key are server-only (`server-only` import in those modules).
* Palette: 4 colors (porcelain, slate ink, ledger green, marker amber). No gradients.
