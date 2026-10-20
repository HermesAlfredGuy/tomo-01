// Shared motion setup: GSAP plugins, Lenis smooth scroll, reduced-motion state.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');
if (reduced) document.documentElement.classList.add('reduced');

gsap.defaults({ ease: 'expo.out', duration: 1.1 });

export let lenis = null;

export function initSmoothScroll() {
  if (reduced) return null; // native scrolling under reduced motion
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // in-page anchors scroll smoothly through Lenis
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

export { gsap, ScrollTrigger, SplitText };
