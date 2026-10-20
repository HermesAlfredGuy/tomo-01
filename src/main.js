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
    ScrollTrigger.refresh();
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

function updateStageVisibility() {
  if (!stage) return;
  const vh = window.innerHeight;
  const any = deviceSections.some((el) => {
    const r = el.getBoundingClientRect();
    const overlap = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return overlap > vh * 0.12;
  });
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
    stage.apply();

    const open = stage.state.open;
    const deg = Math.round(open * 113);
    if (readLid) readLid.textContent = `${String(deg).padStart(3, '0')}°`;
    if (readScreen) readScreen.textContent = open < 0.35 ? 'Off' : open < 0.5 ? 'Wake' : 'Live';
    if (readBoot) {
      const pr = stage.screens.progress;
      readBoot.textContent = open < 0.35 ? '—' : stage.screens.mode === 'play' ? 'OK' : `${Math.round(Math.min(1, pr) * 100)}%`;
    }
    if (readBar) readBar.style.width = `${Math.round(Math.min(1, open) * 100)}%`;
  },
});

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
  if (stage) Object.assign(stage.state, poses().hero);
  ScrollTrigger.refresh();
});
ScrollTrigger.addEventListener('refreshInit', () => {});
window.addEventListener('load', () => ScrollTrigger.refresh());
