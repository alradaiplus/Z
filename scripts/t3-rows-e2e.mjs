import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const log = (m) => console.log(m);
const errors = [];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    errors.push(m.text());
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@z.app");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  await page.click("text=Project Tracker");
  await page.waitForSelector("table tbody tr");
  log("✓ opened database");

  // Open the first row as a page.
  await page.locator('button[title="Open as page"]').first().click();
  await page.waitForURL(/\/app\/[^/]+$/, { timeout: 10000 });
  await page.waitForSelector(".ProseMirror", { timeout: 10000 });
  const rowPageUrl = page.url();

  // Breadcrumb back to the database is present.
  await page.waitForSelector('a:has-text("Project Tracker")', { timeout: 8000 });
  const title = await page.inputValue('input[placeholder="Untitled"]');
  if (title !== "Design landing page")
    throw new Error("row page title mismatch: " + title);
  log(`✓ row opened as page (title "${title}", breadcrumb present)`);

  // Add content to the row's page.
  await page.click(".ProseMirror");
  await page.keyboard.type("Detail notes for this row.");
  await page.waitForTimeout(1200);

  // Rename the row page; the table's Name cell should update (two-way sync).
  await page.fill('input[placeholder="Untitled"]', "Renamed via page");
  await page.waitForTimeout(1200);
  await page.click('a:has-text("Project Tracker")');
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const values = await page.$$eval("table input[type=text]", (els) =>
    els.map((e) => e.value),
  );
  if (!values.includes("Renamed via page"))
    throw new Error("Name cell not synced from page title: " + values.join(", "));
  log("✓ page title ↔ Name cell two-way sync works");

  // Reopen and confirm the content persisted.
  await page.goto(rowPageUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Detail notes for this row.", {
    timeout: 8000,
  });
  log("✓ row page content persisted");

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ ROWS-AS-PAGES VERIFIED — no console errors");
  }
} catch (e) {
  log("✗ FAILED: " + e.message);
  await page.screenshot({ path: "/tmp/t3-fail.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
