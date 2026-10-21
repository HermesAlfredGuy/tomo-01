#!/usr/bin/env node
/**
 * Tomo-01 phone QA.
 *
 * Scrolls the page in steps of 0.8 viewport at a phone width and, at every
 * step, measures the 3D device's projected screen box against every visible
 * text node and interactive control. The canvas is fixed to the viewport, so
 * "overlap" here means the drawn object — not the canvas rect.
 *
 * Also reports: text nodes under 12px, body copy under 15px, tap targets under
 * 44px, and the studio-qa leak / line-clash / clipped scans.
 *
 *   node tools/phone-qa.mjs --shots --width 390 --height 844
 */
import { createRequire } from 'module';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/data/integrations/node/node_modules/playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const URL = arg('url', 'http://127.0.0.1:5199/');
const WIDTH = Number(arg('width', 390));
const HEIGHT = Number(arg('height', 844));
const SHOTS = process.argv.includes('--shots');
const DPR = Number(arg('dpr', 1));

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/opt/data/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
    isMobile: WIDTH < 900,
    hasTouch: WIDTH < 900,
    userAgent: UA,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !!window.__stage, null, { timeout: 60000 });
  await page.waitForTimeout(3000);

  await page.addScriptTag({ path: path.join(ROOT, 'tools', 'phone-qa-probe.js') });
  await page.addScriptTag({ path: '/opt/data/scripts/studio-qa/leaks.js' });

  const go = (y) => page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);

  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const stepPx = Math.round(HEIGHT * 0.8);
  const ys = [];
  for (let y = 0; y <= total; y += stepPx) ys.push(y);
  if (ys[ys.length - 1] !== total) ys.push(total);

  const outDir = path.join(ROOT, 'docs', 'final', 'mobile', arg('dir', 'after'));
  await fs.mkdir(outDir, { recursive: true });
  const steps = [];
  for (let i = 0; i < ys.length; i++) {
    await go(ys[i]);
    await page.waitForTimeout(700);
    const res = await page.evaluate((label) => window.__phoneStep ? window.__phoneStep(label) : null, `s${String(i).padStart(2, '0')}`);
    steps.push(res);
    if (SHOTS) await page.screenshot({ path: path.join(outDir, `${String(i).padStart(2, '0')}-${String(ys[i]).padStart(5, '0')}.png`) });
  }

  /* The play section: the console must sit with the D-pad and A/B visible, and
     a D-pad press must be visible on screen. */
  const play = await page.evaluate(() => {
    const c = document.querySelector('.console');
    const dpad = document.querySelector('.dpad');
    const ab = document.querySelector('.ab');
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    return { console: r(c), dpad: r(dpad), ab: r(ab), vh: window.innerHeight };
  });
  await page.evaluate(() => {
    const c = document.querySelector('.console');
    c.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(900);
  const play2 = await page.evaluate(() => {
    const c = document.querySelector('.console');
    const dpad = document.querySelector('.dpad');
    const ab = document.querySelector('.ab');
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    return { console: r(c), dpad: r(dpad), ab: r(ab), vh: window.innerHeight, y: Math.round(window.scrollY) };
  });
  console.log(`\nPLAY console+dpad+ab in one viewport: ${JSON.stringify(play2)}`);
  const oneView = ['console', 'dpad', 'ab'].every((k) => play2[k].t >= 0 && play2[k].b <= play2.vh);
  console.log(`all three fully inside the viewport: ${oneView ? 'YES' : 'NO'}`);

  await page.screenshot({ path: path.join(outDir, 'play-idle.png') });
  /* Press and hold the right D-pad button: the press must be visible (the :active
     transform) and the press must actually move the character on the canvas. */
  const before = await page.evaluate(() => document.querySelector('#game').toDataURL().length);
  const btn = await page.$('.dpad__right');
  const bb = await btn.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  const press = await page.evaluate(() => {
    const el = document.querySelector('.dpad__right');
    const s = getComputedStyle(el);
    return {
      transform: s.transform,
      held: document.querySelector('.console').classList.contains('is-held'),
      scrollY: Math.round(window.scrollY),
      canvasLen: document.querySelector('#game').toDataURL().length,
    };
  });
  console.log(`D-pad press: transform=${press.transform} held=${press.held} scrollY=${press.scrollY} canvasLen ${before} -> ${press.canvasLen}`);
  console.log(`press visible (transform changed): ${press.transform !== 'none' && press.transform !== 'matrix(1, 0, 0, 1, 0, 0)' ? 'YES' : 'NO'}`);
  await page.screenshot({ path: path.join(outDir, 'play-press.png') });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.querySelector('#game').toDataURL().length);
  console.log(`canvas changed by the press: ${before !== after ? 'YES' : 'NO'} (${before} -> ${after})`);

  const pageWide = await page.evaluate(() => window.__phonePageWide ? window.__phonePageWide() : null);

  const leaks = await page.evaluate(() => window.__qaLeaks ? window.__qaLeaks() : 'missing');
  const clash = await page.evaluate(() => window.__qaLineClash ? window.__qaLineClash() : 'missing');
  const clipped = await page.evaluate(() => window.__qaClipped ? window.__qaClipped() : 'missing');

  console.log(`# ${WIDTH}x${HEIGHT}  ${URL}`);
  console.log(`device present: ${steps.filter((s) => s && s.device && s.device.width > 1).length}/${steps.length} steps`);
  for (const s of steps) {
    if (!s) continue;
    const d = s.device ? `d=${Math.round(s.device.left)},${Math.round(s.device.top)},${Math.round(s.device.right)},${Math.round(s.device.bottom)}` : 'd=-';
    console.log(`  ${s.label} y=${String(s.y).padStart(5)} op=${s.opacity} band=${s.band} ev=${s.events} ${d} hits=${s.overlaps.length} raw=${s.raw || 0} ${JSON.stringify(s.st)}`);
  }
  const totalOverlaps = steps.reduce((n, s) => n + (s ? s.overlaps.length : 0), 0);
  console.log(`OVERLAPS: ${totalOverlaps}`);
  for (const s of steps) {
    if (!s || !s.overlaps.length) continue;
    console.log(`  @y=${s.y} (${s.label}) device ${JSON.stringify(s.device && { l: Math.round(s.device.left), t: Math.round(s.device.top), r: Math.round(s.device.right), b: Math.round(s.device.bottom) })}`);
    for (const o of s.overlaps) console.log(`     ${o.kind} "${o.cls}" :: ${o.txt}`);
  }
  console.log(`\n__qaLeaks: ${Array.isArray(leaks) ? (leaks.length ? JSON.stringify(leaks, null, 1) : 'clean') : leaks}`);
  console.log(`__qaLineClash: ${Array.isArray(clash) ? (clash.length ? JSON.stringify(clash, null, 1) : 'clean') : clash}`);
  console.log(`__qaClipped: ${Array.isArray(clipped) ? (clipped.length ? JSON.stringify(clipped, null, 1) : 'clean') : clipped}`);
  if (pageWide) {
    console.log(`\ntext <12px: ${pageWide.smallText.length}`);
    for (const r of pageWide.smallText) console.log(`   ${r.fs}  ${r.cls}  :: ${r.txt}`);
    console.log(`body <15px: ${pageWide.bodySmall.length}`);
    for (const r of pageWide.bodySmall) console.log(`   ${r.fs}  ${r.cls}  :: ${r.txt}`);
    console.log(`tap targets <44px: ${pageWide.smallTargets.length}`);
    for (const r of pageWide.smallTargets) console.log(`   ${r.w}x${r.h}  ${r.cls}  :: ${r.txt}`);
  }
  if (errors.length) console.log(`\nJS ERRORS:\n${errors.slice(0, 12).join('\n')}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
