import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const EXAMPLES_ORIGIN = "http://localhost:3199";

export function uniq(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function newContext(browser: Browser, opts: { mobile?: boolean } = {}): Promise<BrowserContext> {
  return browser.newContext(
    opts.mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 900 } },
  );
}

export async function signUp(page: Page, name: string, email: string, password = "correct-horse-battery-9") {
  await page.goto("/signup");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

/** Owner flow: sign up, create a workspace, add one FAQ article. Returns the workspace slug. */
export async function createWorkspaceWithKnowledge(page: Page, opts: { owner: string; email: string; business: string; faqTitle: string; faqBody: string; slug?: string }) {
  await signUp(page, opts.owner, opts.email);
  await page.waitForURL("**/onboarding**");
  await page.fill("#ws-name", opts.business);
  if (opts.slug) await page.fill("#ws-slug", opts.slug);
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create help desk" }).click();
  await page.waitForURL("**step=knowledge**");
  await page.fill("#kb-title", opts.faqTitle);
  await page.fill("#kb-body", opts.faqBody);
  await page.getByRole("button", { name: "Add to knowledge" }).click();
  const added = page.locator("li", { hasText: opts.faqTitle });
  await expect(added).toBeVisible({ timeout: 90_000 });
  await expect(added.getByLabel("Ready")).toBeVisible();
  await page.getByRole("link", { name: "Continue to install" }).click();
  await page.waitForURL("**step=install**");
  const snippet = await page.locator("pre code").innerText();
  expect(snippet).toContain("/widget.js");
  const slug = /data-workspace="([a-z0-9-]+)"/.exec(snippet)?.[1];
  expect(slug).toBeTruthy();
  return slug!;
}

/** Opens the plain external site (different origin) with the snippet pointing at this help desk. */
export async function openExternalSite(page: Page, baseURL: string, slug: string) {
  await page.goto(`${EXAMPLES_ORIGIN}/external-site.html?origin=${encodeURIComponent(baseURL)}&workspace=${slug}`);
  const frame = page.frameLocator("iframe[data-helpdesk-ai=frame]");
  await frame.getByTestId("widget-launcher").click({ timeout: 90_000 });
  return frame;
}
