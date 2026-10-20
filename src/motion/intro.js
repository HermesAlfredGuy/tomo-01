// Page intro: optional preloader counter, then the hero choreography.
// The hero is ONE timeline — the most important 2 seconds of the site.
import { gsap, reduced, lenis } from './core.js';
import { splitReveal } from './reveal.js';

export function playIntro() {
  const pre = document.querySelector('.preloader');
  const heroSplits = [...document.querySelectorAll('[data-split-intro]')].map((el, i) =>
    splitReveal(el, { intro: true, delay: i * 0.12 }));
  const heroBits = document.querySelectorAll('[data-intro]');

  if (reduced) {
    pre?.remove();
    gsap.fromTo(heroBits, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.05 });
    return;
  }

  lenis?.stop();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => lenis?.start() });
  gsap.set(heroBits, { opacity: 0, y: 24 });

  if (pre) {
    const num = pre.querySelector('.preloader__num');
    const o = { v: 0 };
    tl.to(o, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => (num.textContent = String(Math.round(o.v)).padStart(3, '0')) })
      .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' })
      .add(() => pre.remove());
  }
  tl.add(() => heroSplits.forEach((s) => s?.play()), pre ? '-=0.55' : 0)
    .to(heroBits, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, '<0.35')
    .from('.hero__art', { scale: 1.12, opacity: 0, duration: 2.2, ease: 'expo.out' }, '<-0.2');
}
