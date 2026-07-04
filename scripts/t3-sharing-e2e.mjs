import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const log = (m) => console.log(m);
const errors = [];
const bEmail = `teammate_${Date.now()}@z.app`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

function watch(p) {
  p.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
      errors.push(m.text());
  });
}

try {
  // --- User B signs up (gets their own workspace) ---
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  watch(b);
  await b.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await b.fill('input[name="name"]', "Teammate");
  await b.fill('input[name="email"]', bEmail);
  await b.fill('input[name="password"]', "password123");
  await b.click('button[type="submit"]');
  await b.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  await b.waitForSelector("text=Welcome to Z");
  // B's own workspace has no "Project Tracker".
  if ((await b.locator("text=Project Tracker").count()) > 0)
    throw new Error("B's own workspace unexpectedly has Project Tracker");
  log("✓ user B signed up with their own workspace");

  // --- Owner (demo) invites user B ---
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  watch(a);
  await a.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await a.fill('input[name="email"]', "demo@z.app");
  await a.fill('input[name="password"]', "password123");
  await a.click('button[type="submit"]');
  await a.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  await a.click('[aria-label="Switch workspace"]');
  await a.click("text=Members & sharing");
  await a.waitForSelector('input[placeholder="teammate@example.com"]');
  await a.fill('input[placeholder="teammate@example.com"]', bEmail);
  await a.click('button:has-text("Invite")');
  await a.waitForSelector("text=Member added.", { timeout: 8000 });
  log("✓ owner invited user B to the shared workspace");

  // --- User B now sees + can open the shared workspace ---
  await b.reload({ waitUntil: "networkidle" });
  await b.screenshot({path:"/tmp/bshot.png"});
  await b.click('[aria-label="Switch workspace"]');
  await b.waitForSelector("text=Demo Workspace", { timeout: 8000 });
  await b.click("text=Demo Workspace");
  await b.waitForSelector("text=Project Tracker", { timeout: 10000 });
  log("✓ user B switched to the shared workspace and sees its pages");

  // --- User B can edit a page in the shared workspace ---
  await b.click("text=Welcome to Z");
  await b.waitForSelector(".ProseMirror");
  await b.click(".ProseMirror");
  await b.keyboard.press("Control+End");
  await b.keyboard.type(" [edited by teammate]");
  await b.waitForTimeout(1200);
  log("✓ user B edited a shared page");

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ WORKSPACE SHARING VERIFIED — no console errors");
  }
} catch (e) {
  log("✗ FAILED: " + e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
