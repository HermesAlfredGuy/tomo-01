import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { gsap, ScrollTrigger, reduced, lenis, initSmoothScroll } from './motion/core.js';
import { initReveals, refreshOnFonts, splitReveal } from './motion/reveal.js';
import { initMarquees, initMagnetic, initCursor, initHorizontal, initCounters } from './motion/interactions.js';
import { createGarden } from './game/garden.js';
import { initSound, sfx } from './audio.js';
import { drawTapeArt } from './game/tapeArt.js';

initSound();
initSmoothScroll();
initHorizontal();
initReveals();
initMarquees();
initMagnetic();
initCursor();
initCounters();
refreshOnFonts();

/* ------------------------------------------------------------------ *
 * The device: one WebGL object, anchored to the page.
 * Three.js is a large chunk, so it is loaded on demand — never on the
 * critical path. The hero copy and the intro run without waiting for it;
 * the device fades in as soon as its chunk resolves.
 * ------------------------------------------------------------------ */
let stage = null;
let deviceStarted = false;
let heroRevealed = false;

function startDevice() {
  if (deviceStarted) return;
  deviceStarted = true;
  import('./device/stage.js').then(({ createStage }) => {
    stage = createStage(document.getElementById('stage'));
    window.__stage = stage; // debug handle used by the studio QA harness
    Object.assign(stage.state, poses().hero, { opacity: 0, open: 0.16 });
    stage.screens.preview();
    stage.setShell(currentShell);
    stage.apply();
    if (heroRevealed) {
      gsap.to(stage.state, { opacity: 1, duration: 0.9, onUpdate: stage.apply });
    } else {
      updateStageVisibility();
    }
    queuePhoneBand();
    ScrollTrigger.refresh();
    // Keep the device pinned to its band after a refresh re-measures the page.
    setTimeout(queuePhoneBand, 250);
  }).catch((err) => {
    // A failed device load must not take the page down with it.
    console.error('device failed to load', err);
  });
}

// Give the first paint the network to itself, then fetch the device.
if ('requestIdleCallback' in window) {
  requestIdleCallback(startDevice, { timeout: 1500 });
} else {
  setTimeout(startDevice, 400);
}

const mq = window.matchMedia('(min-width: 900px)');
const POSES = {
  desktop: {
    hero: { fx: 0.43, fy: 0.03, w: 0.5, rotX: 0.3, rotY: -0.66, rotZ: 0 },
    boot: { fx: 0.24, fy: 0.02, w: 0.52, rotX: 0.44, rotY: -0.2, rotZ: 0 },
    colours: { fx: 0.36, fy: -0.02, w: 0.5, rotX: 0.3, rotY: -0.4, rotZ: 0 },
  },
  mobile: {
    hero: { fx: 0.02, fy: -0.62, w: 0.96, rotX: 0.24, rotY: -0.3, rotZ: -0.86 },
    boot: { fx: 0, fy: -0.1, w: 0.92, rotX: 0.42, rotY: -0.08, rotZ: -1.02 },
    colours: { fx: 0, fy: -0.34, w: 1.02, rotX: 0.26, rotY: -0.26, rotZ: -0.88 },
  },
};
const poses = () => (mq.matches ? POSES.desktop : POSES.mobile);

const KEYS = ['fx', 'fy', 'w', 'rotX', 'rotY', 'rotZ'];
const blend = (a, b, k) => {
  KEYS.forEach((key) => { stage.state[key] = a[key] + (b[key] - a[key]) * k; });
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Stage visibility: on for hero, the boot sequence and the colour studio only.
const deviceSections = [...document.querySelectorAll('.hero, .boot, .colours')];
let stageVisible = false;
let visTick = false;

/* ------------------------------------------------------------------ *
 * Phone layout: the device rides reserved bands in the flow.
 *
 * The WebGL canvas is fixed to the viewport and cannot scroll, so the device
 * used to be placed by hand-tuned numbers — which is exactly why it landed on
 * the hero CTA, the spec strip and the "Two screens" heading. On a phone it is
 * instead fitted to a real, measured, empty rect in the document
 * (.hero__band, .boot__band, .colours__space), so "nothing sits under the
 * device" is structural rather than a tuning accident, and the object travels
 * with the page. See docs/final/mobile/PLAN.md.
 *
 * Desktop (>= 900px) keeps the pose system untouched.
 * ------------------------------------------------------------------ */
const isPhone = () => !mq.matches;
const bandEls = [...document.querySelectorAll('[data-band]')];
const BAND_ROT = {
  hero: [0.24, -0.3, -0.86],
  boot: [0.42, -0.08, -1.02],
  colours: [0.26, -0.26, -0.88],
};
/* The lid angle each band is solved at is NOT fixed: the fit always uses the
   live `state.open`, so the device exactly fills its band at whatever angle the
   lid is at. That is what makes "nothing sits under the device" hold during the
   boot sequence, when the lid swings from 0.16 to 1. */
const BAND_OPEN = { hero: null, boot: null, colours: null };
let activeBand = null;
let bandTick = false;

function pickBand() {
  const vh = window.innerHeight;
  let best = null;
  let bestScore = 0;
  for (const el of bandEls) {
    const vis = bandVis(el);
    if (vis <= 0) continue;
    const score = vis / Math.max(1, el.getBoundingClientRect().height);
    if (score > bestScore) { bestScore = score; best = el; }
  }
  return best;
}

/* How much of a band is actually visible: clipped to the viewport AND to below
   the sticky nav, which is opaque and paints above the canvas. */
function navBottom() {
  const nav = document.querySelector('.nav');
  return nav ? nav.getBoundingClientRect().bottom : 0;
}
function bandVis(el) {
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, navBottom()));
}

function updatePhoneBand() {
  if (!stage || !isPhone()) return;
  const vh = window.innerHeight;
  /* Stay with the band the device is already travelling in until that band has
     completely left the viewport. Switching earlier would teleport the object
     mid-screen; switching only when it is off-screen means the handoff is
     invisible — the device travels out of the top, then travels into the next
     band. */
  if (activeBand && bandVis(activeBand) > 0) {
    stage.setBand(activeBand, {
      rot: BAND_ROT[activeBand.dataset.band] || null,
      open: stage.state.open,
      pad: 14,
    });
    /* Re-fit every frame: the band moves with the scroll, and setBand alone is a
       no-op once the band and its options are unchanged. */
    stage.fitBand(stage.state.open);
    return;
  }
  const el = pickBand();
  if (!el) { activeBand = null; return; }
  activeBand = el;
  stage.setBand(el, {
    rot: BAND_ROT[el.dataset.band] || null,
    open: stage.state.open,
    pad: 14,
  });
}

function queuePhoneBand() {
  if (bandTick) return;
  bandTick = true;
  window.__bandEvents = (window.__bandEvents || 0) + 1;
  requestAnimationFrame(() => {
    bandTick = false;
    updatePhoneBand();
    /* Placement and visibility must agree on which band owns the object. */
    updateStageVisibility();
  });
}

window.__bandDebug = () => ({
  active: activeBand ? activeBand.dataset.band : null,
  stageBanded: stage ? stage.isBanded : null,
  w: stage ? +stage.state.w.toFixed(4) : null,
  open: stage ? +stage.state.open.toFixed(3) : null,
  fx: stage ? +stage.state.fx.toFixed(4) : null,
  fy: stage ? +stage.state.fy.toFixed(4) : null,
  opacity: stage ? +stage.state.opacity.toFixed(3) : null,
  events: window.__bandEvents || 0,
  y: Math.round(window.scrollY),
  bandRects: bandEls.map((el) => {
    const r = el.getBoundingClientRect();
    return `${el.dataset.band}@${Math.round(r.top)}..${Math.round(r.bottom)}`;
  }),
});

function updateStageVisibility() {
  if (!stage) return;
  const vh = window.innerHeight;
  const inView = (el, frac) => {
    const r = el.getBoundingClientRect();
    const overlap = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return overlap > vh * frac;
  };
  /* On a phone the object exists exactly where its ACTIVE band is visible below
     the nav — not merely where some band is. Otherwise the device can be parked
     on a band that has left the screen while another band keeps it at opacity 1,
     which is what puts it behind the header. */
  const any = isPhone()
    ? !!activeBand && bandVis(activeBand) > Math.min(140, activeBand.getBoundingClientRect().height * 0.5)
    : deviceSections.some((el) => inView(el, 0.12));
  if (any === stageVisible) return;
  stageVisible = any;
  if (reduced) {
    stage.state.opacity = any ? 1 : 0;
    stage.apply();
    return;
  }
  gsap.to(stage.state, {
    opacity: any ? 1 : 0, duration: any ? 0.5 : 0.35, ease: 'power2.out', overwrite: true,
    onUpdate: stage.apply,
  });
}
function queueVisibility() {
  if (visTick) return;
  visTick = true;
  requestAnimationFrame(() => { visTick = false; updateStageVisibility(); });
}
window.addEventListener('scroll', queueVisibility, { passive: true });
window.addEventListener('resize', queueVisibility);
window.addEventListener('scroll', queuePhoneBand, { passive: true });
window.addEventListener('resize', queuePhoneBand);
updateStageVisibility();

/* Boot scroll story: approach pose → hinge open → screen boots. */
const readLid = document.querySelector('[data-readout-lid]');
const readScreen = document.querySelector('[data-readout-screen]');
const readBoot = document.querySelector('[data-readout-boot]');
const readBar = document.querySelector('[data-readout-bar]');

let colourMode = false;

ScrollTrigger.create({
  trigger: '.boot',
  start: 'top bottom',
  end: 'bottom bottom',
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    if (colourMode || !stage) return;
    const p = self.progress;
    if (isPhone()) {
      /* On a phone the band owns placement; the trigger only opens the lid.
         Phases are cut for the shorter 150vh pin so no two frames repeat. */
      const k = Math.min(1, Math.max(0, (p - 0.22) / 0.66));
      const eased = 1 - Math.pow(1 - k, 3);
      const overshoot = Math.sin(Math.PI * Math.min(1, k * 1.1)) * 0.06 * (1 - k);
      const before = stage.state.open;
      stage.setOpen(Math.min(1, eased + overshoot));
      if (k < 0.06 && stage.screens.mode === 'off') stage.screens.preview();
      if (before <= 0.42 && stage.state.open > 0.42) {
        sfx.thunk();
        setTimeout(() => sfx.boot(), 140);
      }
      /* Placement stays with updatePhoneBand (scroll-driven) so the band
         handoff is never fought by two writers in the same frame. */
    } else {
      const P = poses();
      if (p < 0.28) {
        const k = easeInOut(Math.min(1, p / 0.28));
        blend(P.hero, P.boot, reduced ? 1 : k);
        stage.setOpen(0.16 * (1 - k));
        if (k < 0.15 && stage.screens.mode === 'off') stage.screens.preview();
      } else {
        KEYS.forEach((key) => { stage.state[key] = P.boot[key]; });
        const k = Math.min(1, Math.max(0, (p - 0.3) / 0.44));
        const eased = 1 - Math.pow(1 - k, 3);
        const overshoot = Math.sin(Math.PI * Math.min(1, k * 1.1)) * 0.06 * (1 - k);
        const before = stage.state.open;
        stage.setOpen(Math.min(1, eased + overshoot));
        if (before <= 0.42 && stage.state.open > 0.42) {
          sfx.thunk();
          setTimeout(() => sfx.boot(), 140);
        }
      }
    }
    stage.apply();
    syncReadout();
  },
});

/* The LID / SCREEN / BOOT readout is a live status, so it must not freeze just
   because the scroll stopped. On a phone the boot pin is short, so the screen
   keeps booting after the pin ends; without this the readout would sit at 63%
   while the screen is already live. Desktop writes it from the pin only, so its
   behaviour is untouched. */
function syncReadout() {
  if (!stage) return;
  const open = stage.state.open;
  const deg = Math.round(open * 113);
  const lid = `${String(deg).padStart(3, '0')}°`;
  const screen = open < 0.35 ? 'Off' : open < 0.5 ? 'Wake' : 'Live';
  const pr = stage.screens.progress;
  const boot = open < 0.35 ? '—' : stage.screens.mode === 'play' ? 'OK' : `${Math.round(Math.min(1, pr) * 100)}%`;
  if (readLid && readLid.textContent !== lid) readLid.textContent = lid;
  if (readScreen && readScreen.textContent !== screen) readScreen.textContent = screen;
  if (readBoot && readBoot.textContent !== boot) readBoot.textContent = boot;
  if (readBar) readBar.style.width = `${Math.round(Math.min(1, open) * 100)}%`;
}
if (isPhone()) gsap.ticker.add(syncReadout);

/* ------------------------------------------------------------------ *
 * Intro: counter, curtain, then the hero choreography.
 * ------------------------------------------------------------------ */
const heroBits = document.querySelectorAll('[data-intro]');
let heroSplits = [];

function revealHero() {
  // Build the intro splits only once the display face is loaded: re-splitting after
  // the tween starts leaves the new lines paused mid-mask.
  heroSplits = [...document.querySelectorAll('[data-split-intro]')].map((el, i) =>
    splitReveal(el, { intro: true, delay: i * 0.1 }));
  if (reduced) {
    gsap.fromTo(heroBits, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.04 });
    gsap.set(stage.state, { opacity: 1 });
    stage.apply();
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.add(() => heroSplits.forEach((s) => s?.play()))
    .fromTo(heroBits, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.07 }, '-=0.85');
  heroRevealed = true;
  // If the device chunk has already landed, fade it in with the copy;
  // otherwise startDevice() picks this up the moment it resolves.
  if (stage) tl.to(stage.state, { opacity: 1, duration: 1.3, onUpdate: stage.apply }, '-=1.15');
}

function intro() {
  const pre = document.querySelector('.preloader');
  if (reduced || !pre) {
    pre?.remove();
    revealHero();
    return;
  }
  lenis?.stop();
  gsap.set(heroBits, { opacity: 0, y: 22 });
  const num = pre.querySelector('.preloader__num');
  const o = { v: 0 };
  const tl = gsap.timeline({ onComplete: () => lenis?.start() });
  tl.to(o, {
    v: 100, duration: 1.15, ease: 'power2.inOut',
    onUpdate: () => { if (num) num.textContent = String(Math.round(o.v)).padStart(3, '0'); },
  })
    .to('.preloader__mark, .preloader__meta, .preloader__num', { yPercent: -12, opacity: 0, duration: 0.5, ease: 'power2.in' }, '-=0.15')
    .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.95, ease: 'expo.inOut' }, '-=0.25')
    .add(() => pre.remove())
    .add(revealHero, '-=0.55');
}

(document.fonts?.ready ?? Promise.resolve()).then(() => {
  intro();
  requestAnimationFrame(() => ScrollTrigger.refresh());
});

/* ------------------------------------------------------------------ *
 * Colour studio
 * ------------------------------------------------------------------ */
const SHELLS = { butter: ['#ffce3a', 'Butter'], mint: ['#a9e5c3', 'Mint'], cola: ['#e5432b', 'Cola'], bone: ['#e2dac8', 'Bone'] };
let currentShell = '#ffce3a';
const shellName = document.querySelector('[data-shell-name]');
const swatches = [...document.querySelectorAll('.swatch')];

function setShell(key, animate = true) {
  const [hex, name] = SHELLS[key] || SHELLS.butter;
  swatches.forEach((btn) => {
    const on = btn.dataset.shell === key;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-checked', String(on));
  });
  if (shellName) shellName.textContent = name;
  document.documentElement.style.setProperty('--shell', hex);
  const from = [1, 3, 5].map((i) => parseInt(currentShell.slice(i, i + 2), 16));
  const to = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const proxy = { t: 0 };
  const paint = () => {
    const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * proxy.t));
    if (stage) stage.setShell(`#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`);
  };
  if (animate && !reduced) gsap.to(proxy, { t: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: paint });
  else { proxy.t = 1; paint(); }
  currentShell = hex;
}

swatches.forEach((btn) => {
  btn.addEventListener('click', () => {
    setShell(btn.dataset.shell);
    if (btn.dataset.shell === 'bone') {
      // Bone is a sold-out run: keep the colour, say so.
      btn.setAttribute('aria-checked', 'true');
    }
  });
});

/* ------------------------------------------------------------------ *
 * Tape covers
 * ------------------------------------------------------------------ */
document.querySelectorAll('[data-tape-art]').forEach((canvas) => drawTapeArt(canvas, canvas.dataset.tapeArt));

/* ------------------------------------------------------------------ *
 * Pebble Garden — the playable tape
 * ------------------------------------------------------------------ */
const gameCanvas = document.getElementById('game');
const statusEl = document.querySelector('[data-game-status]');
if (gameCanvas) {
  const garden = createGarden(gameCanvas, {
    onCount(n, done) {
      if (statusEl) statusEl.textContent = done ? '12 / 12 — garden complete' : `${String(n).padStart(2, '0')} / 12 planted`;
      if (done) sfx.done();
    },
  });

  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let live = false;

  new IntersectionObserver((entries) => {
    entries.forEach((e) => { live = e.intersectionRatio > 0.35; });
  }, { threshold: [0, 0.35, 0.6] }).observe(gameCanvas);

  window.addEventListener('keydown', (e) => {
    if (!live) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    if (keys[e.key]) {
      e.preventDefault();
      const [dx, dy] = dirs[keys[e.key]];
      garden.move(dx, dy);
      sfx.tick();
    } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      garden.plant();
      sfx.plant();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      garden.reset();
      sfx.reset();
    }
  }, { passive: false });

  document.querySelectorAll('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [dx, dy] = dirs[btn.dataset.dir];
      garden.move(dx, dy);
      sfx.tick();
    });
  });
  document.querySelectorAll('[data-action="a"]').forEach((btn) => btn.addEventListener('click', () => { garden.plant(); sfx.plant(); }));
  document.querySelectorAll('[data-action="b"]').forEach((btn) => btn.addEventListener('click', () => { garden.reset(); sfx.reset(); }));
}

/* ------------------------------------------------------------------ *
 * Pre-order form — local only, and it says so.
 * ------------------------------------------------------------------ */
const form = document.querySelector('[data-order-form]');
if (form) {
  const note = form.querySelector('[data-order-note]');
  const input = form.querySelector('input[name="email"]');
  const done = document.createElement('div');
  done.className = 'order__done';
  done.innerHTML = '<strong>You&rsquo;re on the list.</strong><span class="label">A unit is held for 72 hours. No card was taken.</span>';
  form.append(done);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = (input?.value || '').trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if (!ok) {
      note?.classList.add('is-error');
      if (note) note.textContent = 'That email looks incomplete — check it and try again.';
      input?.focus();
      return;
    }
    note?.classList.remove('is-error');
    form.classList.add('is-done');
    if (note) note.textContent = 'Demo storefront. Nothing left this page.';
  });
  input?.addEventListener('input', () => {
    if (note?.classList.contains('is-error')) {
      note.classList.remove('is-error');
      note.textContent = 'Demo storefront. Nothing leaves this page.';
    }
  });
}

/* Touch must not scroll the page while a finger is on the D-pad or the screen.
   `touch-action: none` stops the browser taking the gesture; Lenis is also
   stopped so a smooth-scroll that is already running cannot carry the page. */
const consoleEl = document.querySelector('.console');
if (consoleEl && lenis) {
  let padHeld = false;
  const padDown = (e) => {
    if (e.pointerType !== 'touch') return;
    padHeld = true;
    lenis.stop();
    consoleEl.classList.add('is-held');
  };
  const padUp = () => {
    if (!padHeld) return;
    padHeld = false;
    consoleEl.classList.remove('is-held');
    lenis.start();
  };
  consoleEl.addEventListener('pointerdown', padDown, { passive: true });
  window.addEventListener('pointerup', padUp, { passive: true });
  window.addEventListener('pointercancel', padUp, { passive: true });
}

/* Closing the lid again for the colour studio. */
ScrollTrigger.create({
  trigger: '.colours',
  start: 'top bottom',
  onEnter: () => {
    colourMode = true;
    if (!stage) return;
    if (reduced) { stage.state.open = 0; stage.screens.reset(); stage.apply(); return; }
    gsap.to(stage.state, { open: 0, duration: 0.9, ease: 'power3.inOut', onUpdate: stage.apply, overwrite: true });
    stage.screens.reset();
  },
});

ScrollTrigger.create({
  trigger: '.colours',
  start: 'top bottom',
  onLeaveBack: () => { colourMode = false; },
});

/* Re-measure once the pinned tape rail exists, and when the desktop breakpoint flips. */
mq.addEventListener('change', () => {
  if (!stage) { ScrollTrigger.refresh(); return; }
  if (isPhone()) {
    /* Crossing onto a phone: hand placement to the bands and re-solve.
       Crossing back to desktop: the pose system takes over again. */
    activeBand = null;
    stage.setBand(null);
    queuePhoneBand();
  } else {
    stage.setBand(null);
    Object.assign(stage.state, poses().hero);
  }
  ScrollTrigger.refresh();
  setTimeout(queuePhoneBand, 250);
});
ScrollTrigger.addEventListener('refreshInit', () => {});
window.addEventListener('load', () => ScrollTrigger.refresh());
