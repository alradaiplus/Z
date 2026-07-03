import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");
const BASE = "http://localhost:3100";
const log=(m)=>console.log(m); const errors=[];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage();
p.on("console",(m)=>{ if(m.type()==="error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
try {
  await p.goto(`${BASE}/login`,{waitUntil:"networkidle"});
  await p.fill('input[name="email"]',"demo@z.app"); await p.fill('input[name="password"]',"password123");
  await p.click('button[type="submit"]'); await p.waitForURL(/\/app(\/|$)/);
  await p.click("text=Getting Started"); await p.waitForSelector(".ProseMirror");
  // Edit to create a version snapshot of the original content.
  await p.click(".ProseMirror"); await p.keyboard.press("Control+End"); await p.keyboard.press("Enter");
  await p.keyboard.type("MARKER_UNDO_123"); await p.waitForTimeout(1500);
  // Open history; expect at least one version.
  await p.click('button:has-text("History")');
  await p.waitForSelector("text=Version history");
  await p.waitForSelector('button:has-text("Restore")',{timeout:8000});
  log("✓ history panel lists a version after editing");
  // Restore it; MARKER should disappear.
  await p.click('button:has-text("Restore")');
  await p.waitForFunction(()=>!document.querySelector(".ProseMirror")?.textContent?.includes("MARKER_UNDO_123"),{timeout:8000});
  log("✓ restore reverted the content");
  if(errors.length){ log("\n✗ errors:"); errors.forEach(e=>log("  - "+e)); process.exitCode=1; }
  else log("\n✓✓ VERSION HISTORY VERIFIED — no console errors");
} catch(e){ log("✗ FAILED: "+e.message); await p.screenshot({path:"/tmp/t3h-fail.png"}).catch(()=>{}); process.exitCode=1; }
finally { await b.close(); }
