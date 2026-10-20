import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/data/integrations/node/node_modules/playwright');

const URL = process.argv[2] || 'https://hermesalfredguy.github.io/tomo-01/';
const OUT = process.argv[3] || '/opt/data/cache/scratch/film/raw16x9';
const W = Number(process.argv[4] || 2560);
const H = Number(process.argv[5] || 1440);
const TOTAL = Number(process.argv[6] || 20);

fs.mkdirSync(OUT, { recursive: true });

// Timeline (seconds): [label, selector, dwell]
const SHOTS = [
  ['hero', '#top', 2.4],
  ['boot-a', '#boot', 2.2],
  ['boot-b', '#boot', 2.4],
  ['screens', '#screens', 2.0],
  ['tapes', '#tapes', 2.6],
  ['play', '#play', 2.6],
  ['colours', '#colours', 2.2],
  ['manifesto', '.manifesto', 1.8],
  ['order', '#order', 1.8],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: '/opt/data/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(3500);
// preloader gone, fonts in
await page.evaluate(() => document.fonts.ready);
// kill smooth-scroll easing influence for deterministic framing
await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });

// turn sound on so the hinge/boot cues exist in the capture (WebAudio is silent in headless, but state is real)
const state = async (label) => {
  const s = await page.evaluate(() => (window.__stage ? JSON.stringify(window.__stage.state) : 'no-stage'));
  console.log('state', label, s);
};
await state('load');

const scale = TOTAL / SHOTS.reduce((a, s) => a + s[2], 0);
let i = 0;
for (const [label, sel, dwell] of SHOTS) {
  await page.evaluate((q) => {
    const el = document.querySelector(q);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
  }, sel);
  await sleep(200);
  await page.evaluate((q, frac) => {
    const el = document.querySelector(q);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + el.offsetHeight * frac);
  }, sel, label === 'boot-b' ? 0.42 : 0.06);
  await sleep(900);
  await state(label);
  i += 1;
}
console.log('captured stops', i);
await ctx.close();
await browser.close();