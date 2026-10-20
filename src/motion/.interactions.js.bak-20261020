// Interaction modules: marquee, magnetic, cursor, horizontal pin, counters.
import { gsap, ScrollTrigger, reduced, finePointer } from './core.js';

/* data-marquee (data-speed="40" px/s, data-direction="-1")
   Infinite band that speeds up / reverses with scroll velocity.
   Continuous motion: pauses offscreen, stops entirely under reduced motion,
   and any [data-marquee-toggle] button pauses/resumes all marquees. */
export function initMarquees() {
  const tweens = [];
  document.querySelectorAll('[data-marquee]').forEach((el) => {
    const track = el.querySelector('.marquee__track');
    if (!track) return;
    track.append(...[...track.children].map((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; }));
    if (reduced) return;
    const speed = parseFloat(el.dataset.speed || 60);
    const dir = parseFloat(el.dataset.direction || -1);
    const width = () => track.scrollWidth / 2;
    const tween = gsap.fromTo(track, { x: dir < 0 ? 0 : -width() }, {
      x: dir < 0 ? -width() : 0, ease: 'none', repeat: -1, duration: width() / speed,
    });
    tweens.push(tween);
    ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => (s.isActive ? tween.resume() : tween.pause()),
      onUpdate: (s) => {
        const v = gsap.utils.clamp(-4, 4, s.getVelocity() / 400);
        gsap.to(tween, { timeScale: 1 + Math.abs(v), duration: 0.3, overwrite: true });
        gsap.to(track, { skewX: -v * 1.5, duration: 0.4, overwrite: 'auto' });
      },
    });
  });
  document.querySelectorAll('[data-marquee-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const paused = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!paused));
      tweens.forEach((t) => (paused ? t.resume() : t.pause()));
    });
  });
}

/* data-magnetic (data-strength="0.35") — element leans toward the pointer. */
export function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const s = parseFloat(el.dataset.strength || 0.35);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * s);
      yTo((e.clientY - (r.top + r.height / 2)) * s);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* Custom cursor: a dot that grows into a label over [data-cursor="View"].
   Desktop fine pointers only; the native cursor stays for text inputs. */
export function initCursor() {
  if (!finePointer || reduced) return;
  const c = document.createElement('div');
  c.className = 'cursor';
  c.innerHTML = '<span class="cursor__label"></span>';
  document.body.append(c);
  const label = c.firstElementChild;
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); c.classList.add('is-visible'); });
  document.addEventListener('pointerleave', () => c.classList.remove('is-visible'));
  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => { label.textContent = el.dataset.cursor; c.classList.add('is-label'); });
    el.addEventListener('pointerleave', () => c.classList.remove('is-label'));
  });
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('pointerenter', () => c.classList.add('is-link'));
    el.addEventListener('pointerleave', () => c.classList.remove('is-link'));
  });
}

/* data-horizontal: section pins and its .h-track scrolls sideways (desktop).
   On narrow screens / reduced motion it becomes a native swipeable scroll-snap row. */
export function initHorizontal() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    document.querySelectorAll('[data-horizontal]').forEach((sec) => {
      const track = sec.querySelector('.h-track');
      const dist = () => track.scrollWidth - sec.clientWidth;
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
      });
      // cards tilt in slightly as they enter from the right
      track.querySelectorAll('.h-card').forEach((card) => {
        gsap.from(card, {
          rotate: 3, yPercent: 8, opacity: 0.3, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
        });
      });
    });
  });
}

/* data-counter="1200" (data-suffix="+", data-decimals="0") — counts up once when visible. */
export function initCounters() {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const end = parseFloat(el.dataset.counter);
    const dec = parseInt(el.dataset.decimals || 0, 10);
    const fmt = new Intl.NumberFormat(document.documentElement.lang || 'en', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    const render = () => (el.textContent = fmt.format(obj.v) + suffix);
    if (reduced) { obj.v = end; return render(); }
    render();
    gsap.to(obj, { v: end, duration: 2, ease: 'power3.out', onUpdate: render, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
}
