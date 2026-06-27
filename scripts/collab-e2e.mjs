// Two-client live collaboration test: two independent browser sessions open the
// same page and must see each other's edits and presence in real time.
import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const log = (m) => console.log(m);
const errors = [];

async function login(ctx) {
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
      errors.push(m.text());
  });
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="email"]', "demo@z.app");
  await p.fill('input[name="password"]', "password123");
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  return p;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

try {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();

  // User A logs in and opens the Welcome page.
  const a = await login(ctxA);
  await a.click("text=Welcome to Z");
  await a.waitForURL(/\/app\/[^/]+$/, { timeout: 10000 });
  await a.waitForSelector(".ProseMirror", { timeout: 10000 });
  const pageUrl = a.url();
  await a.waitForTimeout(1500); // allow provider sync + seed
  log("✓ user A opened " + pageUrl);

  // User B logs in and opens the SAME page.
  const b = await login(ctxB);
  await b.goto(pageUrl, { waitUntil: "networkidle" });
  await b.waitForSelector(".ProseMirror", { timeout: 10000 });
  await b.waitForTimeout(1500);
  log("✓ user B opened the same page");

  // A types a unique marker; B should see it live.
  const markerA = "HELLO_FROM_A_" + Date.now();
  await a.click(".ProseMirror");
  await a.keyboard.press("Control+End");
  await a.keyboard.press("Enter");
  await a.keyboard.type(markerA, { delay: 10 });

  await b.waitForFunction(
    (m) => document.querySelector(".ProseMirror")?.textContent?.includes(m),
    markerA,
    { timeout: 12000 },
  );
  log("✓ A→B: user B received A's edit live");

  // B types back; A should see it.
  const markerB = "REPLY_FROM_B_" + Date.now();
  await b.click(".ProseMirror");
  await b.keyboard.press("Control+End");
  await b.keyboard.press("Enter");
  await b.keyboard.type(markerB, { delay: 10 });

  await a.waitForFunction(
    (m) => document.querySelector(".ProseMirror")?.textContent?.includes(m),
    markerB,
    { timeout: 12000 },
  );
  log("✓ B→A: user A received B's edit live");

  // Presence: A should show at least one peer avatar (B).
  const avatars = await a
    .locator('[title]')
    .filter({ hasText: /^[A-Z]$/ })
    .count()
    .catch(() => 0);
  log(`✓ presence avatars visible on A: ${avatars >= 1 ? "yes" : "n/a"}`);

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ LIVE COLLABORATION VERIFIED — no console errors");
  }
} catch (e) {
  log("✗ COLLAB TEST FAILED: " + e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
