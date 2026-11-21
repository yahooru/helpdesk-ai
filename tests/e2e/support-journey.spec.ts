import { expect, test } from "@playwright/test";
import { createWorkspaceWithKnowledge, newContext, openExternalSite, signUp, uniq } from "./helpers";

/**
 * The full done-criteria journey with three browser contexts and real Neon, Nexconn and Gemini:
 * owner sets up + invites an agent; a customer on a different origin gets a grounded AI answer,
 * escalates, the agent claims and replies in real time (typing, read receipts), leaves an internal
 * note, transfers to the owner, the owner resolves and the customer rates the conversation.
 */
test("owner setup, grounded AI answer, live human handoff, transfer and CSAT", async ({ browser, baseURL }) => {
  const id = uniq("e2e");
  const owner = await newContext(browser);
  const agent = await newContext(browser);
  const customer = await newContext(browser);
  const op = await owner.newPage();
  const ap = await agent.newPage();
  const cp = await customer.newPage();

  // 1. Owner signs up, creates the workspace and adds knowledge.
  const slug = await createWorkspaceWithKnowledge(op, {
    owner: "Olivia Owner",
    email: `${id}-owner@example.com`,
    business: `Northwind ${id}`,
    faqTitle: "How long does delivery take?",
    faqBody:
      "Standard delivery takes 3 to 5 business days. Express delivery takes 1 business day and costs 12 dollars. Orders placed before 2 pm ship the same day.",
  });

  // Deterministic queue: turn off auto-assign so the handoff waits in Unassigned.
  await op.goto("/app/settings/ai");
  await op.getByRole("switch", { name: "Auto-assign handed-off chats" }).click();
  await op.getByRole("button", { name: "Save changes" }).click();
  await expect(op.getByText("Saved assistant settings")).toBeVisible();

  // 2. Owner invites an agent; the agent accepts through the invite link.
  await op.goto("/app/settings/team");
  await op.fill("#invite-email", `${id}-agent@example.com`);
  await op.getByRole("button", { name: "Create invite" }).click();
  const inviteUrl = await op.getByTestId("invite-url").innerText();
  await ap.goto(inviteUrl);
  await ap.getByRole("link", { name: "Create an account to join" }).click();
  await ap.fill("#name", "Aaron Agent");
  await ap.fill("#password", "correct-horse-battery-9");
  await ap.click("button[type=submit]");
  await ap.getByRole("button", { name: /^Join Northwind/ }).click();
  await ap.waitForURL("**/app/inbox**");

  // 3. Customer on a different origin opens the embedded widget and asks a question.
  const frame = await openExternalSite(cp, baseURL!, slug);
  await frame.getByLabel("Your name").fill("Casey Customer");
  await frame.getByRole("button", { name: "Start chat" }).click();
  const input = frame.getByLabel("Write a message");
  await input.fill("How long does express delivery take, and what does it cost?");
  await input.press("Enter");
  const aiAnswer = frame.getByTestId("ai-message").last();
  await expect(aiAnswer).toContainText(/1 business day/i, { timeout: 90_000 });
  await expect(aiAnswer).toContainText(/12/);
  await expect(aiAnswer.getByRole("link", { name: /How long does delivery take\?/ })).toBeVisible();

  // 4. Customer asks for a person.
  await frame.getByRole("button", { name: "Talk to a person" }).last().click();
  await expect(frame.getByTestId("chat-event").filter({ hasText: "Connecting you with a person" })).toBeVisible();

  // 5. The agent sees it live in Unassigned with a waiting timer, opens it and claims it.
  await ap.goto("/app/inbox?queue=unassigned");
  const row = ap.locator("[data-conversation-id]", { hasText: "Casey Customer" });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row.getByLabel(/^Waiting/)).toBeVisible();
  await row.click();
  await expect(ap.getByLabel("Conversation transcript")).toContainText(/1 business day/i);
  await expect(ap.getByRole("complementary", { name: "Customer details" })).toContainText("Northwind Bikes (example external site)");
  await ap.getByRole("button", { name: "Claim" }).click();
  await expect(frame.getByTestId("chat-event").filter({ hasText: "Aaron Agent joined the conversation" })).toBeVisible({ timeout: 30_000 });

  // 6. Real-time reply with typing indicator, then customer reply and read receipt.
  const reply = ap.getByLabel("Reply to customer");
  await reply.pressSequentially("Hi Casey, I can help with ", { delay: 40 });
  await expect(frame.getByTestId("typing-indicator")).toContainText("Aaron Agent is typing", { timeout: 15_000 });
  await reply.pressSequentially("that.", { delay: 20 });
  await reply.press("Enter");
  await expect(frame.getByTestId("agent-message").last()).toContainText("Hi Casey, I can help with that.", { timeout: 20_000 });
  await input.fill("Great, can I change my delivery address?");
  await input.press("Enter");
  await expect(ap.getByLabel("Conversation transcript")).toContainText("can I change my delivery address?", { timeout: 20_000 });
  await expect(frame.getByTestId("seen").last()).toBeVisible({ timeout: 20_000 });

  // 7. Internal note: visible to the team live, never to the customer.
  const note = `Check order ${id} before replying`;
  await ap.getByRole("tab", { name: "Internal note" }).click();
  await ap.getByLabel("Internal note").fill(note);
  await ap.getByRole("button", { name: "Add note" }).click();
  await expect(ap.getByLabel("Conversation transcript")).toContainText(note);
  await op.goto("/app/inbox?queue=open");
  await op.locator("[data-conversation-id]", { hasText: "Casey Customer" }).click();
  await expect(op.getByLabel("Conversation transcript")).toContainText(note);
  await expect(frame.locator("body")).not.toContainText(note);

  // 8. Transfer to the owner (server swaps Nexconn group members).
  await ap.getByLabel("Transfer conversation").selectOption({ label: "Olivia Owner" });
  await expect(frame.getByTestId("chat-event").filter({ hasText: "transferred the conversation to Olivia Owner" })).toBeVisible({ timeout: 30_000 });
  await expect(op.getByText("Assigned to you")).toBeVisible({ timeout: 30_000 });

  // 9. Owner replies and resolves; the customer rates the conversation.
  await op.getByLabel("Reply to customer").fill("Yes, I've updated the address for you.");
  await op.getByLabel("Reply to customer").press("Enter");
  await expect(frame.getByTestId("agent-message").last()).toContainText("updated the address", { timeout: 20_000 });
  await op.getByRole("button", { name: "Resolve" }).click();
  const csat = frame.getByTestId("csat-card");
  await expect(csat).toBeVisible({ timeout: 30_000 });
  await csat.getByRole("radio", { name: /5 of 5/ }).click();
  await csat.getByLabel("Comment (optional)").fill("Fast and friendly");
  await csat.getByRole("button", { name: "Send rating" }).click();
  await expect(frame.getByText("You rated this conversation 5/5.")).toBeVisible({ timeout: 20_000 });
  await expect(op.getByLabel("Conversation transcript")).toContainText("5/5", { timeout: 30_000 });

  // 10. Returning customer: reload the external site; the same conversation comes back.
  await cp.reload();
  const again = cp.frameLocator("iframe[data-helpdesk-ai=frame]");
  await again.getByTestId("widget-launcher").click();
  await expect(again.getByTestId("my-message").filter({ hasText: "change my delivery address" })).toBeVisible({ timeout: 45_000 });

  await Promise.all([owner.close(), agent.close(), customer.close()]);
});

test("agents can't open another workspace's data", async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const id = uniq("e2eiso");
  await signUp(page, "Iso User", `${id}@example.com`);
  await page.waitForURL("**/onboarding**");
  // Requests go through the browser (same cookies, same network stack as a real user).
  const status = await page.evaluate(async () => (await fetch("/api/inbox/00000000-0000-4000-8000-000000000000")).status);
  expect([403, 404]).toContain(status);
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const res = await anonPage.goto(new URL("/api/inbox", page.url()).toString());
  expect(res?.status()).toBe(401);
  await Promise.all([ctx.close(), anon.close()]);
});
