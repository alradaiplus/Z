import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const log = (m) => console.log(m);
const errors = [];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

const ctx = await browser.newContext();
const p = await ctx.newPage();
p.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    errors.push(m.text());
});

try {
  // Log in as demo.
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="email"]', "demo@z.app");
  await p.fill('input[name="password"]', "password123");
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  log("✓ logged in");

  // Open a page (Welcome to Z).
  await p.click("text=Welcome to Z");
  await p.waitForSelector(".ProseMirror");
  log("✓ opened a page");

  // --- Emoji picker (replaces window.prompt) ---
  await p.click('button[title="Set icon"]');
  await p.waitForSelector("text=Pick an icon", { timeout: 5000 });
  await p.click('button:has-text("🚀")');
  await p.waitForTimeout(600);
  const iconText = await p.locator('button[title="Set icon"]').innerText();
  if (!iconText.includes("🚀")) throw new Error("emoji not set, got: " + iconText);
  log("✓ emoji picker set icon 🚀");

  // --- Header ••• menu (Import/Export/History folded in) ---
  await p.click('button[aria-label="Page options"]');
  await p.waitForSelector("text=Version history", { timeout: 5000 });
  await p.waitForSelector("text=Import Markdown");
  await p.waitForSelector("text=Export Markdown");
  log("✓ header ••• menu shows Import/Export/History");
  // Open history from menu.
  await p.click("text=Version history");
  await p.waitForTimeout(800);
  // Close the drawer by clicking its backdrop (top-left, away from the panel).
  await p.mouse.click(20, 20);
  await p.waitForTimeout(400);
  log("✓ opened version history from menu");

  // --- Selection bubble menu (bold / highlight / link) ---
  await p.click(".ProseMirror");
  await p.keyboard.press("Control+End");
  await p.keyboard.type("BubbleTest sentence here.");
  await p.waitForTimeout(300);
  // Select the last-typed line.
  await p.keyboard.down("Shift");
  for (let i = 0; i < 24; i++) await p.keyboard.press("ArrowLeft");
  await p.keyboard.up("Shift");
  await p.waitForTimeout(500);
  // Bubble menu should appear with a Bold button.
  await p.waitForSelector('button[title="Bold"]', { timeout: 5000 });
  await p.click('button[title="Highlight"]');
  await p.waitForTimeout(300);
  const markCount = await p.locator(".ProseMirror mark").count();
  if (markCount < 1) throw new Error("highlight mark not applied");
  log("✓ bubble menu applied highlight (mark present)");

  // Link via inline input (no prompt).
  await p.waitForSelector('button[title="Link"]', { timeout: 3000 });
  await p.click('button[title="Link"]');
  await p.waitForSelector('input[placeholder="https://…"]', { timeout: 3000 });
  await p.fill('input[placeholder="https://…"]', "https://example.com");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(500);
  const linkCount = await p.locator(".ProseMirror a.editor-link").count();
  if (linkCount < 1) throw new Error("link not applied");
  log("✓ bubble menu applied link via inline input");

  await p.waitForTimeout(1200); // let autosave flush

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ POLISH PASS VERIFIED — no console errors");
  }
} catch (e) {
  log("✗ FAILED: " + e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
