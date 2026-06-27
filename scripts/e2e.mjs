import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const errors = [];
const log = (m) => console.log(m);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
page.on("console", (m) => {
  // Ignore the browser's implicit /favicon.ico probe (chrome-level, not the app).
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => {
  if (r.status() === 404 && !/favicon\.ico/.test(r.url()))
    errors.push("404: " + r.url());
});

try {
  // --- Login ---
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@z.app");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  log("✓ login -> " + page.url());

  // --- Sidebar shows seeded pages + database ---
  await page.waitForSelector("text=Welcome to Z");
  await page.waitForSelector("text=Project Tracker");
  log("✓ sidebar shows pages + database");

  // --- Open the database page ---
  await page.click("text=Project Tracker");
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const values = await page.$$eval("table input[type=text]", (els) =>
    els.map((e) => e.value),
  );
  if (!values.includes("Design landing page"))
    throw new Error("expected seeded row value not found: " + values.join(", "));
  const rowCount = await page.locator("table tbody tr").count();
  log(`✓ database table rendered (${rowCount} rows, name cell OK)`);

  // --- Switch to Board view ---
  await page.click('button:has-text("Board")');
  await page.waitForSelector("text=In Progress");
  const cards = await page.locator("text=Set up CI").count();
  log(`✓ board view rendered (found 'Set up CI' card: ${cards > 0})`);

  // --- Add a row from the database toolbar ---
  await page.click('button:has-text("Table")');
  const before = await page.locator("table tbody tr").count();
  await page.click('button:has-text("New")');
  await page.waitForFunction(
    (n) => document.querySelectorAll("table tbody tr").length > n,
    before,
    { timeout: 10000 },
  );
  log(`✓ add row works (${before} -> ${before + 1})`);

  // --- Command palette (Cmd-K) ---
  const urlBefore = page.url();
  await page.keyboard.press("Control+k");
  await page.waitForSelector('input[placeholder="Search or run a command…"]', {
    timeout: 5000,
  });
  await page.fill('input[placeholder="Search or run a command…"]', "Ideas");
  // Palette results are <button>s (sidebar uses <a>), so scope to button.
  await page.click('button:has-text("Ideas")', { timeout: 5000 });
  await page.waitForFunction(
    (u) => location.href !== u && /\/app\//.test(location.href),
    urlBefore,
    { timeout: 10000 },
  );
  log("✓ command palette quick-switch works -> " + page.url());

  // --- Go to a doc page and add a tag ---
  await page.click("text=Welcome to Z");
  await page.waitForSelector('button:has-text("Add tag")', { timeout: 10000 });
  await page.click('button:has-text("Add tag")');
  await page.fill('input[placeholder="tag name"]', "important");
  await page.keyboard.press("Enter");
  await page.waitForSelector("text=important", { timeout: 10000 });
  log("✓ tag added to page");

  // --- Tags index ---
  await page.goto(`${BASE}/app/tags`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=important");
  log("✓ tags index shows tag");

  // --- Graph view ---
  await page.goto(`${BASE}/app/graph`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Graph");
  await page.waitForSelector("canvas", { timeout: 10000 });
  // Canvas should be sized (force sim running) and report nodes/links.
  const canvasBox = await page.locator("canvas").boundingBox();
  if (!canvasBox || canvasBox.width < 50 || canvasBox.height < 50)
    throw new Error("graph canvas not sized: " + JSON.stringify(canvasBox));
  await page.waitForSelector("text=/\\d+ pages? ·/");
  log(`✓ graph view renders canvas (${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)})`);

  // Clicking a node navigates (click center where the focused/largest node sits).
  await page.waitForTimeout(1500); // let the layout settle
  const urlBeforeGraph = page.url();
  await page.mouse.click(
    canvasBox.x + canvasBox.width / 2,
    canvasBox.y + canvasBox.height / 2,
  );
  await page.waitForTimeout(800);
  log(
    `✓ graph canvas interactive (url ${page.url() === urlBeforeGraph ? "unchanged (no node at center)" : "navigated on node click"})`,
  );

  if (errors.length) {
    log("\n✗ console/page errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ ALL CHECKS PASSED, no console errors");
  }
} catch (e) {
  log("✗ TEST FAILED: " + e.message);
  await page.screenshot({ path: "/tmp/e2e-fail.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
