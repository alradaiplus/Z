import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const log = (m) => console.log(m);
const errors = [];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    errors.push(m.text());
});

try {
  // --- Landing page (logged out) ---
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Your notes, connected.");
  await page.waitForSelector('a:has-text("Get started")');
  log("✓ landing page renders for logged-out visitors");

  // --- Login ---
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@z.app");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  await page.waitForSelector("text=Welcome to Z");
  log("✓ login");

  // --- Archive a page via the sidebar menu ---
  const row = page.locator('a:has-text("Ideas")').first();
  await row.hover();
  // The "more" button is the last button in the row group.
  await page.locator('button[title="More"]').first().click();
  await page.click("text=Archive");
  await page.waitForTimeout(800);
  log("✓ archived a page");

  // --- Trash shows it; restore it ---
  await page.goto(`${BASE}/app/trash`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Ideas", { timeout: 8000 });
  await page.click('button:has-text("Restore")');
  await page.waitForTimeout(800);
  const stillThere = await page
    .locator('li:has-text("Ideas")')
    .count()
    .catch(() => 0);
  if (stillThere > 0) throw new Error("restore did not remove page from trash");
  log("✓ trash restore works");

  // --- Vault export downloads a zip ---
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Welcome to Z");
  await page.click("body");
  await page.keyboard.press("Control+k");
  await page.waitForSelector('input[placeholder="Search or run a command…"]');
  await page.fill('input[placeholder="Search or run a command…"]', "vault");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.click('button:has-text("Export workspace to Markdown vault")'),
  ]);
  const fname = download.suggestedFilename();
  if (!fname.endsWith(".zip")) throw new Error("expected a .zip, got " + fname);
  log(`✓ vault export downloaded ${fname}`);

  // --- Mobile: hamburger toggles the sidebar ---
  await page.setViewportSize({ width: 390, height: 800 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label="Open menu"]', { timeout: 8000 });
  log("✓ mobile hamburger present at 390px width");

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ TIER 1 CHECKS PASSED — no console errors");
  }
} catch (e) {
  log("✗ TIER1 FAILED: " + e.message);
  await page.screenshot({ path: "/tmp/tier1-fail.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
