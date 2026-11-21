import { expect, test } from "@playwright/test";
import { newContext, signUp, uniq } from "./helpers";

/**
 * Knowledge from an uploaded file, the hosted support page on a phone, a question the assistant
 * can't answer becoming a knowledge gap, and turning that gap into an article from Analytics.
 */
test("upload knowledge, answer on hosted page (mobile), capture and close a knowledge gap", async ({ browser }) => {
  const id = uniq("e2ekb");
  const owner = await newContext(browser);
  const customer = await newContext(browser, { mobile: true });
  const op = await owner.newPage();
  const cp = await customer.newPage();

  await signUp(op, "Priya Owner", `${id}@example.com`);
  await op.waitForURL("**/onboarding**");
  await op.fill("#ws-name", `Harbor Cafe ${id}`);
  await expect(op.getByText("Available", { exact: true })).toBeVisible();
  await op.getByRole("button", { name: "Create help desk" }).click();
  await op.waitForURL("**step=knowledge**");

  // Upload a Markdown file; text is parsed server-side and embedded.
  await op.getByRole("tab", { name: "Upload a file" }).click();
  await op.locator("#kb-file").setInputFiles({
    name: "opening-hours.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      "# Opening hours\n\nHarbor Cafe is open Monday to Friday from 7 am to 6 pm, and on Saturday from 8 am to 2 pm. We are closed on Sundays and public holidays.\n\n## Wifi\n\nFree wifi is available for customers. The password is printed on your receipt.",
    ),
  });
  await op.getByRole("button", { name: "Add to knowledge" }).click();
  await expect(op.locator("li", { hasText: "Opening hours" }).getByLabel("Ready")).toBeVisible({ timeout: 90_000 });
  const slugHref = await (async () => {
    await op.goto("/onboarding?step=install");
    return op.locator('a[href^="/s/"]').first().getAttribute("href");
  })();
  expect(slugHref).toBeTruthy();

  // Customer on a phone uses the hosted support page.
  await cp.goto(slugHref!);
  await expect(cp.getByRole("link", { name: /Opening hours/ })).toBeVisible();
  await cp.getByLabel("Your name").fill("Mo Mobile");
  await cp.getByRole("button", { name: "Start chat" }).click();
  const input = cp.getByLabel("Write a message");
  await input.fill("Are you open on Saturday?");
  await input.press("Enter");
  await expect(cp.getByTestId("ai-message").last()).toContainText(/8 ?am|2 ?pm/i, { timeout: 90_000 });

  // A question the knowledge can't answer.
  await input.fill("Do you sell gift cards for corporate events?");
  await input.press("Enter");
  await expect(cp.getByTestId("ai-message").last()).toContainText(/couldn't find/i, { timeout: 90_000 });

  // It shows up as a knowledge gap; the owner writes the article from it.
  await op.goto("/app/analytics");
  await expect(op.getByText("Conversations per day")).toBeVisible();
  const gap = op.locator("li", { hasText: /gift cards/i });
  await expect(gap).toBeVisible({ timeout: 30_000 });
  await gap.getByRole("link", { name: "Write article" }).click();
  await op.waitForURL("**/app/knowledge/new**");
  await expect(op.locator("#kb-title")).toHaveValue(/gift card/i, { timeout: 60_000 });
  await op.fill("#kb-body", "Yes. Harbor Cafe sells gift cards from 10 to 200 dollars at the counter, including bulk orders for corporate events.");
  await op.getByRole("button", { name: "Publish article" }).click();
  await op.waitForURL("**/app/analytics**", { timeout: 90_000 });
  await expect(op.locator("li", { hasText: /gift cards/i })).toHaveCount(0);
  await expect(op.getByText("Resolved by AI", { exact: true }).first()).toBeVisible();

  // The assistant now answers it.
  await input.fill("Can I buy gift cards for a corporate event?");
  await input.press("Enter");
  await expect(cp.getByTestId("ai-message").last()).toContainText(/gift card/i, { timeout: 90_000 });
  await expect(cp.getByTestId("ai-message").last()).not.toContainText(/couldn't find/i);

  await Promise.all([owner.close(), customer.close()]);
});
