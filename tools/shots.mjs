// Targeted section shots for the Tomo-01 build.
// usage: node tools/shots.mjs <url> <outdir> <w> <h> "sel:frac" "sel:frac" ...
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const NODE = process.env.STUDIO_QA_NODE_MODULES || '/opt/data/integrations/node/node_modules';
const { chromium } = require(path.join(NODE, 'playwright'));
const CHROME = process.env.STUDIO_QA_CHROME || '/opt/data/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const [url, out, w = 1440, h = 900, ...targets] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'load', timeout: 90000 }).catch((e) => errs.push('goto: ' + e.message));
await page.waitForTimeout(6000);

for (const t of targets) {
  const [sel, frac = '0', name] = t.split('|');
  const y = await page.evaluate(([s, f]) => {
    const el = document.querySelector(s);
    if (!el) return -1;
    return Math.round(el.getBoundingClientRect().top + window.scrollY + parseFloat(f) * window.innerHeight);
  }, [sel, frac]);
  if (y < 0) { console.log('missing', sel); continue; }
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1800);
  const file = path.join(out, `${name || sel.replace(/[^a-z0-9]/gi, '')}.png`);
  try {
    await page.screenshot({ path: file, timeout: 120000 });
    const st = await page.evaluate(() => {
      const s = window.__stage?.state;
      return s ? { open: Math.round(s.open * 100) / 100, op: Math.round(s.opacity * 100) / 100, mode: window.__stage.screens.mode } : null;
    });
    console.log('ok', file, sel, JSON.stringify(st));
  } catch (e) {
    console.log('shot failed', sel, e.message.slice(0, 120));
  }
}
console.log('errors:', errs.length ? errs.slice(0, 8).join(' | ') : 'none');
await browser.close();
