// Shared motion setup: GSAP plugins, Lenis smooth scroll.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Motion is always full (owner's final rule): no toggle, no pill, and the OS
// "reduce motion" setting is never read. `reduced` stays as a permanently false
// flag so the guard clauses below remain honest rather than dead-looking.
export const reduced = false;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');

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

export { gsap, ScrollTrigger, SplitText };
