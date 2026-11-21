// Usage: node shot.mjs <url> <outPrefix> [--mobile] [--full] [--wait=ms] [--scroll=px] [--storage=state.json]
import { chromium } from "playwright";

const [url, out] = process.argv.slice(2);
const flags = process.argv.slice(4);
const mobile = flags.includes("--mobile");
const full = flags.includes("--full");
const wait = Number(flags.find((f) => f.startsWith("--wait="))?.slice(7) ?? 1200);
const scroll = Number(flags.find((f) => f.startsWith("--scroll="))?.slice(9) ?? 0);
const storage = flags.find((f) => f.startsWith("--storage="))?.slice(10);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: storage,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle" });
if (full) {
  // Trigger every scroll reveal before a full-page capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}
if (scroll) await page.evaluate((y) => window.scrollTo(0, y), scroll);
await page.waitForTimeout(wait);
await page.screenshot({ path: `${out}.png`, fullPage: full });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
console.log("saved", `${out}.png`);
