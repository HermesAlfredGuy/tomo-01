# Tomo-01 — phone pass

Owner brief: "great on PC, mobile lacking". Desktop at >= 900 px is untouched.

## Root cause (one bug, six symptoms)
The WebGL canvas is `position: fixed; inset: 0` — it cannot scroll. The device was
placed by hand-tuned numbers (`POSES.mobile`: `w: 0.96, fy: -0.62`), so on a phone
the object was simply drawn over whatever copy happened to be at that viewport
position: the hero CTA, the spec strip, the "Two screens" heading, the boot readout.

## Fix
The device now gets **reserved bands** in the document flow (`[data-band="hero" |
"boot" | "colours"]`) and its pose is **solved from the measured rect** of the band
that currently owns it (`fitToRect` in `src/device/stage.js`). "Nothing sits under
the device" is structural, not a tuning accident, and the object travels with the
page instead of floating over it.

- `deviceBounds()` projects the 8 corners of the model's world box to CSS px, so the
  solver works on ground truth.
- `fitToRect` solves `fx/fy/w` in two passes at the live lid angle, so the device
  exactly fills its band while the lid swings 0.16 -> 1 during the boot pin.
- The device keeps its band until that band is fully gone, then travels into the next
  one — the handoff happens off-screen, so there is no teleport.
- Visibility follows the **active** band, clipped to below the sticky nav.

## Per-item
1. Hero overlap — device has its own band between the CTA row and the spec strip.
2. Header — one 56 px row (wordmark, sound dot, pre-order) + a separate full-width
   section-nav row that scrolls sideways with no wrapping. All targets >= 44x44.
3. Boot pin — device stays inside the viewport with margin; shortened so the phases
   that actually change (lid, screens, readout) are not repeated.
4. "Two screens. One pocket." — device is not drawn in that section at all.
5. Play — the console fits in one viewport (screen, D-pad, A/B, 00/12 counter).
   Shorter instruction line above; Lenis is stopped on touch so a finger on the
   D-pad cannot scroll the page; `touch-action: none` on the console.
6. Tapes — card `min(68vw, 300px)` so the next card peeks; DRAG/SCROLL hint visible.
7. Type — annotations raised to >= 11 px, body copy to >= 15 px.

## Proof
- `tools/phone-qa.mjs` — scrolls in 0.8-viewport steps at 390x844 and 360x780,
  measures the projected device box against every visible text node and control,
  and runs the studio-qa scans.
- Result at 390x844: **0 visible overlaps**, `__qaLeaks` clean, `__qaLineClash`
  clean, `__qaClipped` clean, 0 body-copy nodes below 15 px, 0 tap targets < 44 px,
  5 annotation nodes at 11 px.
- Desktop capture at 1440x900 is byte-identical in layout to the baseline.
