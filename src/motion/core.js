// Shared motion setup: GSAP plugins, Lenis smooth scroll, motion state.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Motion is full by default (owner decision): the OS "reduce motion" setting is ignored on purpose —
// work machines ship with animation effects off and every site looked dead. A visible opt-in control
// in the nav is the only way to calm the page; that choice persists.
const CALM_KEY = 'tomo-motion-calm';
export const reduced = (() => {
  try { return localStorage.getItem(CALM_KEY) === 'calm'; } catch { return false; }
})();
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');
if (reduced) document.documentElement.classList.add('reduced');

gsap.defaults({ ease: 'expo.out', duration: 1.1 });

export let lenis = null;

export function initSmoothScroll() {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    });
  });
  return lenis;
}

/* Opt-in "Motion: full / calm" control. Reloading is deliberate: every scroll trigger, Lenis instance
   and canvas animation is rebuilt in one clean state, so nothing half-animates after the switch. */
export function initMotionToggle() {
  document.querySelectorAll('[data-motion-toggle]').forEach((btn) => {
    const label = btn.querySelector('[data-motion-label]');
    const set = (calm) => {
      btn.setAttribute('aria-pressed', String(calm));
      if (label) label.textContent = calm ? 'Motion: calm' : 'Motion: full';
      btn.title = calm ? 'Turn full motion back on' : 'Reduce motion on this site';
    };
    set(reduced);
    btn.addEventListener('click', () => {
      try { localStorage.setItem(CALM_KEY, reduced ? 'full' : 'calm'); } catch { /* private mode */ }
      location.reload();
    });
  });
}

export { gsap, ScrollTrigger, SplitText };
