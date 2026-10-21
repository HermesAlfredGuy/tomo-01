/* Phone QA probe — loaded by tools/phone-qa.mjs into the page under test.
   Exposes window.__phoneStep(label) and window.__phonePageWide(). */
window.__phoneStep = (label) => {
  const out = { label, y: Math.round(window.scrollY), device: null, overlaps: [] };
  const st = window.__stage;
  const skip = '.preloader, .grain, .stage, .sr-only, .visually-hidden, .skip, svg, style, script';
  const isVis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const d = st ? st.deviceBounds() : null;
  out.device = d;
  out.opacity = st ? +st.state.opacity.toFixed(3) : null;
  out.st = st ? { w: +st.state.w.toFixed(4), fx: +st.state.fx.toFixed(4), fy: +st.state.fy.toFixed(4) } : null;
  out.events = window.__bandEvents || 0;
  out.band = (() => {
    const dbg = window.__bandDebug ? window.__bandDebug() : null;
    if (dbg && dbg.active) return dbg.active;
    const b = [...document.querySelectorAll('[data-band]')].find((e) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
    return b ? `${b.dataset.band}@${Math.round(b.getBoundingClientRect().top)}..${Math.round(b.getBoundingClientRect().bottom)}` : 'none';
  })();
  const items = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const n = walk.currentNode;
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest(skip) || el.closest('[data-band]')) continue;
    if (!isVis(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      items.push({
        kind: 'text',
        cls: (el.className || el.tagName).toString().slice(0, 44),
        txt: t.slice(0, 30),
        left: r.left, top: r.top, right: r.right, bottom: r.bottom,
      });
    }
  }
  for (const el of document.querySelectorAll('a, button, input, [role=button], [role=link]')) {
    if (el.closest(skip) || el.closest('[data-band]') || !isVis(el)) continue;
    const r = el.getBoundingClientRect();
    items.push({
      kind: 'control',
      cls: (el.className || el.tagName).toString().slice(0, 44),
      txt: (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 30),
      left: r.left, top: r.top, right: r.right, bottom: r.bottom,
    });
  }
  if (d && d.width > 1 && d.height > 1) {
    /* The canvas is z-index 3 and the fixed header is z-index 50 with an opaque
       background, so the part of the object above the header's bottom edge is
       never visible. Test the visible part; also record the raw count so nothing
       is hidden. */
    const vh = window.innerHeight;
    const nav = document.querySelector('.nav');
    const navB = nav ? nav.getBoundingClientRect().bottom : 0;
    const vis = { left: d.left, top: Math.max(d.top, navB), right: d.right, bottom: Math.min(d.bottom, vh) };
    const onScreen = vis.bottom > vis.top && vis.right > 0 && vis.left < window.innerWidth;
    const drawn = !st || st.state.opacity > 0.05;
    out.visBox = vis;
    out.onScreen = onScreen && drawn;
    if (onScreen && drawn) for (const it of items) if (hit(vis, it)) out.overlaps.push(it);
    /* Raw, unclipped intersection — reported separately. */
    if (drawn) for (const it of items) if (hit(d, it)) out.raw = (out.raw || 0) + 1;
  }
  return out;
};

window.__phonePageWide = () => {
  const out = { smallText: [], bodySmall: [], smallTargets: [] };
  const skip = '.preloader, .grain, .stage, .sr-only, .visually-hidden, .skip, svg, style, script';
  const isVis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const seen = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const n = walk.currentNode;
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest(skip) || !isVis(el)) continue;
    const key = (el.className || '') + '|' + t.slice(0, 24);
    if (seen.has(key)) continue;
    seen.add(key);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const cls = (el.className || el.tagName).toString().slice(0, 44);
    /* Annotations: mono/micro labels, table headers, readout rows, buttons,
       nav links, captions, price rows. Everything else is body copy. */
    const isAnn = el.closest('a, button, [role=button], .label, .readout, .boot__readout, .specs__table, .specs__tol, .tape__meta, .footer__small, .console__hint, .colours__pick, .swatch, .order__price, .order__note, figcaption, .hero__star, .dpad, .ab') || el.tagName === 'TH';
    if (fs < 12) out.smallText.push({ fs: +fs.toFixed(2), cls, txt: t.slice(0, 26) });
    if (fs < 15 && !isAnn && !el.closest('.readout')) out.bodySmall.push({ fs: +fs.toFixed(2), cls, txt: t.slice(0, 26) });
  }
  for (const el of document.querySelectorAll('a, button, input, [role=button]')) {
    if (el.closest(skip) || !isVis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      out.smallTargets.push({
        w: Math.round(r.width), h: Math.round(r.height),
        cls: (el.className || el.tagName).toString().slice(0, 44),
        txt: (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 26),
      });
    }
  }
  return out;
};
