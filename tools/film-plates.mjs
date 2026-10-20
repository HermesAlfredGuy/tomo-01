// Renders the film-only type plates (title + end card) with the real site fonts.
// usage: node tools/film-plates.mjs <outdir>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const NODE = process.env.STUDIO_QA_NODE_MODULES || '/opt/data/integrations/node/node_modules';
const { chromium } = require(path.join(NODE, 'playwright'));
const CHROME = process.env.STUDIO_QA_CHROME || '/opt/data/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.SITE_URL || 'https://hermesalfredguy.github.io/tomo-01/';

const out = process.argv[2] || '/opt/data/cache/scratch/film/plates';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });

// Pull the real woff2 faces out of the built site so the plates match the page exactly.
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(7000);

const css = await page.evaluate(async () => {
  const wanted = ['Big Shoulders Display', 'Barlow', 'DM Mono'];
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (r.constructor.name === 'CSSFontFaceRule' && wanted.some((w) => r.style.fontFamily.includes(w))) {
        out.push(r.cssText);
      }
    }
  }
  return out.join('\n');
});
console.log('faces collected', css.length);

async function plate(name, w, h, markup, scale) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.addStyleTag({ content: css });
  await p.setContent(`<!doctype html><html><head><style>
    @import url('${BASE}');
    :root { --ground:#f2ede3; --ground-2:#e7e0d2; --ink:#17140f; --ink-2:#57503f; --accent:#e5432b; --shell:#ffce3a; }
    *{box-sizing:border-box;margin:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden}
    body{background:var(--ground);color:var(--ink);
      font-family:'Barlow',system-ui,sans-serif;
      display:flex;flex-direction:column;justify-content:space-between;
      padding:${Math.round(h * 0.06)}px ${Math.round(w * 0.055)}px;
      position:relative}
    body::after{content:"";position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(120% 90% at 60% 40%, rgba(255,255,255,0) 55%, rgba(23,20,15,0.07) 100%)}
    .kicker{font-family:'DM Mono',monospace;font-size:${Math.round(h * 0.021)}px;letter-spacing:.34em;
      text-transform:uppercase;color:var(--ink-2)}
    .big{font-family:'Big Shoulders Display','Barlow',sans-serif;font-weight:800;
      font-size:${Math.round(h * 0.185)}px;line-height:.86;letter-spacing:-.01em;text-transform:uppercase}
    .big em{font-style:normal;color:var(--accent)}
    .sub{font-size:${Math.round(h * 0.038)}px;line-height:1.32;max-width:${Math.round(w * 0.46)}px;color:#3b3529}
    .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:6%}
    .price{font-family:'Big Shoulders Display',sans-serif;font-weight:800;font-size:${Math.round(h * 0.1)}px;
      line-height:.9;text-transform:uppercase}
    .pill{display:inline-flex;align-items:center;gap:.6em;background:var(--accent);color:#fff;
      font-family:'DM Mono',monospace;font-size:${Math.round(h * 0.026)}px;letter-spacing:.2em;
      text-transform:uppercase;padding:${Math.round(h * 0.018)}px ${Math.round(h * 0.03)}px}
    .rule{height:${Math.max(2, Math.round(h * 0.004))}px;background:var(--ink);opacity:.9}
    .v{writing-mode:vertical-rl;text-orientation:mixed;font-family:'DM Mono',monospace;
      font-size:${Math.round(h * 0.019)}px;letter-spacing:.42em;text-transform:uppercase;color:var(--ink-2)}
  </style></head><body>${markup}</body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  const geo = await p.evaluate(() => [...document.body.children].map((e) => {
    const r = e.getBoundingClientRect();
    return `${e.tagName}.${e.className || '-'} x${Math.round(r.x)} y${Math.round(r.y)} w${Math.round(r.width)} h${Math.round(r.height)}`;
  }));
  console.log('  geo', name, geo.join(' || '));
  await p.screenshot({ path: path.join(out, `${name}.png`) });
  const px = fs.statSync(path.join(out, `${name}.png`));
  console.log('plate', name, w * scale, 'x', h * scale, px.size);
  await p.close();
}

const shellTag = (w, h, pos) => {
  const px = (n) => `${Math.round(n)}px`;
  const place = pos === 'top' ? `top:${px(h * 0.055)}` : `bottom:${px(h * 0.13)}`;
  const size = pos === 'top' ? w * 0.2 : w * 0.28;
  return `
  <div style="position:absolute;${place};right:${px(w * 0.055)};
    width:${px(size)};height:${px(size * 0.7)};
    border:${px(w * 0.007)} solid var(--ink);border-radius:${px(w * 0.018)};
    background:var(--shell);display:grid;place-items:center;
    transform:rotate(-4deg);box-shadow:${px(w * 0.011)} ${px(w * 0.013)} 0 rgba(23,20,15,.18)">
    <span style="font-family:'Big Shoulders Display',sans-serif;font-weight:800;text-transform:uppercase;
      font-size:${px(size * 0.3)}px;letter-spacing:.08em">Tomo</span>
  </div>`;
};

await plate('title-16x9', 2560, 1440, `
  <div class="kicker">Tomo Supply Co. — Kyoto</div>
  <div>
    <h1 class="big">Open it.<br /><em>You&rsquo;re</em> somewhere<br />else.</h1>
  </div>
  <div class="foot">
    <p class="sub">Two screens. Ten buttons. Nothing to check.<br />A clamshell handheld, $149, shipping March&nbsp;12.</p>
    <span class="pill">Pre-order</span>
  </div>${shellTag(2560, 1440, 'top')}`, 1);

await plate('end-16x9', 2560, 1440, `
  <div class="kicker">First run — 500 units of Bone</div>
  <div>
    <h1 class="big">Tomo&#8209;01</h1>
    <div class="rule" style="width:52%;margin:${Math.round(1440 * 0.035)}px 0 ${Math.round(1440 * 0.028)}px"></div>
    <p class="sub">Tapes from $12. Six at launch. No accounts, no updates, no wifi.</p>
  </div>
  <div class="foot">
    <span class="price">$149</span>
    <span class="pill">tomo-01 — Ships March 12</span>
  </div>${shellTag(2560, 1440, 'bottom')}`, 1);

await plate('title-9x16', 1080, 1920, `
  <div class="kicker">Tomo Supply Co.</div>
  <div>
    <h1 class="big" style="font-size:${Math.round(1920 * 0.15)}px">Open it.<br /><em>You&rsquo;re</em><br />somewhere<br />else.</h1>
    <p class="sub" style="margin-top:${Math.round(1920 * 0.035)}px;font-size:${Math.round(1920 * 0.032)}px;max-width:82%">
      Two screens. Ten buttons.<br />Nothing to check.</p>
  </div>
  <div class="foot">
    <span class="price" style="font-size:${Math.round(1920 * 0.09)}px">$149</span>
    <span class="pill" style="font-size:${Math.round(1920 * 0.022)}px">Ships March 12</span>
  </div>${shellTag(1080, 1920, 'bottom')}`, 1);

await plate('end-9x16', 1080, 1920, `
  <div class="kicker">Now you&rsquo;re playing with paper</div>
  <div>
    <h1 class="big" style="font-size:${Math.round(1920 * 0.15)}px">Tomo&#8209;01</h1>
    <div class="rule" style="width:70%;margin:${Math.round(1920 * 0.04)}px 0 ${Math.round(1920 * 0.03)}px"></div>
    <p class="sub" style="font-size:${Math.round(1920 * 0.032)}px">It is a toy, not a service.<br />When it&rsquo;s flat, it&rsquo;s a bookend.</p>
  </div>
  <div class="foot">
    <span class="pill" style="font-size:${Math.round(1920 * 0.022)}px">tomo-01</span>
  </div>${shellTag(1080, 1920, 'bottom')}`, 1);

await browser.close();