// Declarative scroll reveals. Put attributes in HTML; no per-element JS needed.
//
//  data-split="lines|words|chars"   masked text reveal on scroll (or on intro if data-split-intro)
//  data-reveal="up|fade|scale"      element entrance on scroll; data-delay="0.2" optional
//  data-reveal-group                children with [data-reveal] stagger together
//  data-scrub-words                 paragraph words brighten as you scroll through it
//  data-parallax="0.15"             element drifts at a different speed (± fraction of its height)
//  data-clip                        image/media wipes in from the bottom with a slight zoom-out
//
// Reduced motion: every effect collapses to a gentle opacity fade; no travel, scale or parallax.
import { gsap, ScrollTrigger, SplitText, reduced } from './core.js';

// Split text is hidden from screen readers (aria: 'hidden') and read from one plain copy instead:
// SplitText's default aria-label on a <p>/<span>/<blockquote> is an invalid ARIA pattern (axe: aria-prohibited-attr).
function readableCopy(el) {
  if (el.dataset.srCopy) return;
  const copy = document.createElement('span');
  copy.className = 'sr-only';
  copy.textContent = el.textContent.trim();
  el.before(copy);
  el.dataset.srCopy = '1';
}

const START = 'top 85%';

function show(el) { gsap.set(el, { visibility: 'visible' }); }

function gentleFade(targets, trigger, delay = 0) {
  gsap.fromTo(targets, { opacity: 0 }, {
    opacity: 1, duration: 0.8, ease: 'power1.out', delay, stagger: 0.04,
    scrollTrigger: trigger ? { trigger, start: START, once: true } : undefined,
  });
}

export function splitReveal(el, { intro = false, delay } = {}) {
  const type = el.dataset.split || 'lines';
  const d = delay ?? parseFloat(el.dataset.delay || 0);
  show(el);
  if (reduced) { gentleFade(el, intro ? null : el, d); return null; }
  let tween;
  readableCopy(el);
  SplitText.create(el, {
    aria: 'hidden',
    type: type === 'lines' ? 'lines' : `lines,${type}`,
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true, // re-split on resize/font load and keep the animation consistent
    onSplit(self) {
      const parts = type === 'chars' ? self.chars : type === 'words' ? self.words : self.lines;
      tween = gsap.from(parts, {
        yPercent: 110,
        rotate: type === 'chars' ? 4 : 0,
        duration: type === 'chars' ? 1 : 1.25,
        stagger: type === 'chars' ? 0.018 : type === 'words' ? 0.035 : 0.09,
        delay: d,
        paused: intro,
        scrollTrigger: intro ? undefined : { trigger: el, start: START, once: true },
      });
      return tween;
    },
  });
  return { play: () => tween && tween.play() };
}

function revealOne(el, delay = 0) {
  show(el);
  const kind = el.dataset.reveal || 'up';
  const d = delay + parseFloat(el.dataset.delay || 0);
  if (reduced) return gentleFade(el, el, d);
  const from = { opacity: 0 };
  if (kind === 'up') from.y = 48;
  if (kind === 'scale') { from.scale = 0.94; from.y = 24; }
  gsap.from(el, { ...from, duration: 1.2, delay: d, scrollTrigger: { trigger: el, start: START, once: true } });
}

export function initReveals(root = document) {
  // grouped staggers
  root.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const items = [...group.querySelectorAll('[data-reveal]')];
    items.forEach((el, i) => { el.dataset.grouped = '1'; revealOne(el, i * 0.08); });
  });
  root.querySelectorAll('[data-reveal]:not([data-grouped])').forEach((el) => revealOne(el));
  root.querySelectorAll('[data-split]:not([data-split-intro])').forEach((el) => splitReveal(el));

  root.querySelectorAll('[data-scrub-words]').forEach((el) => {
    if (reduced) return; // fully legible text, no scrubbing
    readableCopy(el);
    const split = SplitText.create(el, { type: 'words', aria: 'hidden' });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  root.querySelectorAll('[data-parallax]').forEach((el) => {
    if (reduced) return;
    const amt = parseFloat(el.dataset.parallax) || 0.15;
    gsap.fromTo(el, { yPercent: -amt * 100 }, {
      yPercent: amt * 100, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  root.querySelectorAll('[data-clip]').forEach((el) => {
    const inner = el.firstElementChild;
    if (reduced) return gentleFade(el, el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
    if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
  });
}

export function refreshOnFonts() {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
