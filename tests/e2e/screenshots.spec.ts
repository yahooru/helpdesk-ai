import { expect, test } from "@playwright/test";
import { createWorkspaceWithKnowledge, newContext, openExternalSite, uniq } from "./helpers";

/**
 * Captures real product screenshots into docs/ for the README (run with SCREENSHOTS=1).
 * Everything shown is created through the product itself during the run.
 */
test.skip(!process.env.SCREENSHOTS, "Set SCREENSHOTS=1 to capture README screenshots");

test("capture product screenshots", async ({ browser, baseURL }) => {
  const id = uniq("shot");
  const owner = await newContext(browser);
  const customer = await newContext(browser);
  const phone = await newContext(browser, { mobile: true });
  const op = await owner.newPage();
  const cp = await customer.newPage();
  const pp = await phone.newPage();

  await op.goto("/");
  await op.screenshot({ path: "docs/landing.png" });

  const slug = await createWorkspaceWithKnowledge(op, {
    owner: "Olivia Owner",
    email: `${id}@example.com`,
    business: "Northwind Bikes",
    slug: `northwind-${id.slice(-6).toLowerCase()}`,
    faqTitle: "How long does delivery take?",
    faqBody: "Standard delivery takes 3 to 5 business days. Express delivery takes 1 business day and costs 12 dollars.",
  });
  await op.screenshot({ path: "docs/install.png" });
  await op.goto("/app/settings/ai");
  await op.getByRole("switch", { name: "Auto-assign handed-off chats" }).click();
  await op.getByRole("button", { name: "Save changes" }).click();
  await expect(op.getByText("Saved assistant settings")).toBeVisible();
  await op.screenshot({ path: "docs/assistant-settings.png" });

  const frame = await openExternalSite(cp, baseURL!, slug);
  await frame.getByLabel("Your name").fill("Casey Customer");
  await frame.getByRole("button", { name: "Start chat" }).click();
  const input = frame.getByLabel("Write a message");
  await input.fill("How long does express delivery take?");
  await input.press("Enter");
  await expect(frame.getByTestId("ai-message").last()).toContainText(/business day/i, { timeout: 90_000 });
  await cp.waitForTimeout(1500);
  await cp.screenshot({ path: "docs/widget-ai-answer.png" });
  await frame.getByRole("button", { name: "Talk to a person" }).last().click();
  await expect(frame.getByTestId("chat-event").filter({ hasText: "Connecting you" })).toBeVisible();

  await op.goto("/app/inbox?queue=unassigned");
  const row = op.locator("[data-conversation-id]", { hasText: "Casey Customer" });
  await row.click();
  await op.getByRole("button", { name: "Claim" }).click();
  await expect(frame.getByTestId("chat-event").filter({ hasText: "joined the conversation" })).toBeVisible({ timeout: 30_000 });
  await op.getByLabel("Reply to customer").fill("Hi Casey, express orders placed before 2 pm ship the same day.");
  await op.getByLabel("Reply to customer").press("Enter");
  await expect(frame.getByTestId("agent-message").last()).toBeVisible({ timeout: 20_000 });
  await op.getByRole("tab", { name: "Internal note" }).click();
  await op.getByLabel("Internal note").fill("Customer is asking about a gift order. Follow up on Friday.");
  await op.getByRole("button", { name: "Add note" }).click();
  await op.waitForTimeout(1500);
  await op.screenshot({ path: "docs/inbox.png" });
  await cp.screenshot({ path: "docs/widget-human.png" });

  await pp.goto(`/s/${slug}`);
  await pp.waitForTimeout(1500);
  await pp.screenshot({ path: "docs/support-page-mobile.png" });

  await op.goto("/app/analytics");
  await op.screenshot({ path: "docs/analytics.png", fullPage: true });
  await op.goto("/app/knowledge");
  await op.screenshot({ path: "docs/knowledge.png" });

  await Promise.all([owner.close(), customer.close(), phone.close()]);
});
