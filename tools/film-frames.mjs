// Frame grabber for the Tomo-01 press loop.
// Desktop: 16:9 2560x1440 (dsf 1). Vertical: 540x960 CSS @ dsf 2 -> 1080x1920.
// usage: node tools/film-frames.mjs <url> <outdir>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const NODE = process.env.STUDIO_QA_NODE_MODULES || '/opt/data/integrations/node/node_modules';
const { chromium } = require(path.join(NODE, 'playwright'));
const CHROME = process.env.STUDIO_QA_CHROME || '/opt/data/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

const DESKTOP = [
  ['01-hero', '#top', 0],
  ['02-hero-device', '#top', 0],
  ['03-boot-crack', '#boot', 0.12],
  ['04-boot-open', '#boot', 0.62],
  ['05-screens', '#screens', 0.04],
  ['06-tapes', '#tapes', 0.05],
  ['07-play', '#play', 0.05],
  ['08-colours', '#colours', 0.05],
  ['09-manifesto', '.manifesto', 0.05],
  ['10-order', '#order', 0.04],
];

const VERTICAL = [
  ['v01-hero', '#top', 0],
  ['v02-boot', '#boot', 0.55],
  ['v03-play', '#play', -0.06],
  ['v04-colours', '#colours', -0.04],
  ['v05-manifesto', '.manifesto', 0.02],
  ['v06-order', '#order', -0.02],
];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const errs = [];

async function grab(width, height, dsf, list, prefix) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(9000);
  await page.evaluate(() => document.fonts.ready);
  // sound on so the capture matches the real product state
  await page.click('[data-sound-toggle]').catch(() => {});
  for (const [name, sel, frac] of list) {
    const y = await page.evaluate(([s, f]) => {
      const el = document.querySelector(s);
      if (!el) return -1;
      return Math.round(el.getBoundingClientRect().top + window.scrollY + parseFloat(f) * window.innerHeight);
    }, [sel, frac]);
    if (y < 0) { console.log('missing', sel); continue; }
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(2200);
    const file = path.join(out, `${name}.png`);
    try {
      await page.screenshot({ path: file, timeout: 180000 });
      const st = await page.evaluate(() => {
        const s = window.__stage?.state;
        return s ? `open=${s.open.toFixed(2)} mode=${window.__stage.screens.mode}` : 'no-stage';
      });
      console.log('ok', name, st, fs.statSync(file).size);
    } catch (e) { console.log('failed', name, e.message.slice(0, 120)); }
  }
  await ctx.close();
}

await grab(2560, 1440, 1, DESKTOP, 'd');
await grab(540, 960, 2, VERTICAL, 'v');
console.log('errors:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
await browser.close();