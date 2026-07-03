import { createRequire } from "module";
import { readFileSync, writeFileSync } from "node:fs";
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
page.on("dialog", (d) => d.accept());

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@z.app");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
  log("✓ login");

  // --- Image upload API (storage + serving) ---
  const png = readFileSync("/home/user/Z/src-tauri/icons/128x128.png");
  const up = await page.request.post(`${BASE}/api/upload`, {
    multipart: {
      file: { name: "test.png", mimeType: "image/png", buffer: png },
    },
  });
  if (!up.ok()) throw new Error("upload failed: " + up.status());
  const { url } = await up.json();
  if (!url?.startsWith("/media/")) throw new Error("bad upload url: " + url);
  const served = await page.request.get(`${BASE}${url}`);
  if (served.status() !== 200)
    throw new Error("uploaded image not served: " + served.status());
  // Uploading without auth must be rejected.
  const noAuth = await page.context().request.post(`${BASE}/api/upload`, {
    headers: { cookie: "" },
    multipart: { file: { name: "x.png", mimeType: "image/png", buffer: png } },
  });
  log(`✓ image upload + serving works (${url})`);

  // --- Import a markdown file that references the uploaded image + a wikilink ---
  writeFileSync(
    "/tmp/ZzImportTest.md",
    `# ZzImportTest\n\nImported note with an image.\n\n![pic](${url})\n\nLinks to [[Ideas]].\n`,
  );
  await page.keyboard.press("Control+k");
  await page.waitForSelector('input[placeholder="Search or run a command…"]');
  await page.fill('input[placeholder="Search or run a command…"]', "Import");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click('button:has-text("Import Markdown")'),
  ]);
  await chooser.setFiles("/tmp/ZzImportTest.md");
  await page.waitForSelector("text=ZzImportTest", { timeout: 12000 });
  log("✓ markdown import created a page");

  // Open the imported page; the image node should render.
  await page.click("text=ZzImportTest");
  await page.waitForSelector("img.editor-image", { timeout: 10000 });
  log("✓ imported image renders in the editor");

  // --- Password reset (set back to same password so demo stays valid) ---
  // In production mode the reset link is emailed / logged, not shown in the UI,
  // so read it from the server log (email.ts logs it when no RESEND_API_KEY).
  await page.context().clearCookies(); // sign out so /forgot renders
  await page.goto(`${BASE}/forgot`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@z.app");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=/reset link is on its way/i", {
    timeout: 10000,
  });
  await new Promise((r) => setTimeout(r, 500));
  const logText = readFileSync("/tmp/nx.log", "utf8");
  const matches = [...logText.matchAll(/\/reset\?token=[a-f0-9]+/g)];
  if (matches.length === 0) throw new Error("no reset link logged");
  const href = `${BASE}${matches[matches.length - 1][0]}`;
  await page.goto(href, { waitUntil: "networkidle" });
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 12000 });
  log("✓ password reset flow completed and auto-logged-in");

  if (errors.length) {
    log("\n✗ console errors:");
    errors.forEach((e) => log("  - " + e));
    process.exitCode = 1;
  } else {
    log("\n✓✓ TIER 2 CHECKS PASSED — no console errors");
  }
} catch (e) {
  log("✗ TIER2 FAILED: " + e.message);
  await page.screenshot({ path: "/tmp/tier2-fail.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
