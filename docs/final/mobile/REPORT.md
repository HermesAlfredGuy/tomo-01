# Tomo-01 — phone pass

Brief: `great on PC, mobile lacking`. **Desktop at >= 900 px is unchanged** — see Proof.

## Root cause (one bug, six symptoms)
The WebGL canvas is `position: fixed; inset: 0`; it cannot scroll. The device was
placed by hand-tuned numbers (`POSES.mobile`: `w: 0.96, fy: -0.62`), so on a phone the
object was drawn over whatever copy happened to be at that viewport position: the hero
CTA, the spec strip, the "Two screens" heading, the boot readout.

## Fix
The device now gets **reserved bands in the document flow** (`[data-band="hero" |
"boot" | "colours"]`) and its pose is **solved from the measured rect** of the band that
owns it (`fitToRect`, `src/device/stage.js`). "Nothing sits under the device" is
structural, not a tuning accident, and the object travels with the page.

- `deviceBounds()` projects the 8 corners of the model's world box to CSS px, so the
  solver works on ground truth rather than guessing at the projection.
- `fitToRect` solves `fx / fy / w` in two passes **at the live lid angle**, so the
  device exactly fills its band while the lid swings 0.16 -> 1 during the boot pin.
- The device keeps its band until that band is completely gone, then travels into the
  next one — the handoff happens off-screen, so there is no mid-screen teleport.
- Visibility follows the **active** band, clipped to below the sticky nav (the nav is
  opaque and paints above the canvas, so the strip it covers is never visible).

## Item by item
1. **Hero overlap** — the device has its own band between the CTA row and the spec
   strip. Nothing is drawn over the headline, lede, buttons or spec table.
2. **Header** — one 56 px row (wordmark, sound dot, pre-order) plus a separate
   full-width section-nav row that scrolls sideways instead of wrapping. Every item is
   44 x 44. `hero` padding raised to 7.5rem to clear the taller header.
3. **Boot pin** — shortened; the device stays inside the viewport with margin and the
   LID / SCREEN / BOOT readout stays visible beside it. The readout keeps running to
   `OK` after the pin instead of freezing at 63%.
4. **"Two screens. One pocket."** — the device is not drawn in that section at all, so
   the heading cannot be printed over the object.
5. **Play** — the console fits one viewport with room to spare (screen, D-pad, A/B,
   `00 / 12` counter). Touch-specific instruction line replaces the keyboard legend on
   phones. Lenis is stopped on touch contact and `touch-action: none` is set on the
   console, so a finger on the D-pad cannot scroll the page. The buttons move the
   character — measured, not assumed.
6. **Tapes** — card `min(68vw, 300px)` so the next card peeks and the drag hint shows.
7. **Type** — annotations >= 11 px, body copy >= 15 px (up from 13.19 px).

## Files
- `index.html` — bands, console block (`#game`, D-pad, A/B), split phone/desktop keys.
- `src/device/stage.js` — `deviceBounds`, `fitToRect`, `setBand`, `fitBand`.
- `src/main.js` — phone band system, boot-trigger phone branch, Lenis touch lock,
  `syncReadout`.
- `src/styles/sections.css` — all phone rules inside `@media (max-width: 899px)`.
- `src/motion/core.js` — `window.__lenis` QA handle.
- `tools/phone-qa.mjs`, `tools/phone-qa-probe.js` — the harness below.

## Proof
`node tools/phone-qa.mjs --width 390 --height 844 --dir after-390 --shots`
(`--width 360 --height 780` too) scrolls in 0.8-viewport steps, projects the device box
and intersects it with every visible text node and control, then runs the studio-qa
scans.

| check | 390x844 | 360x780 |
|---|---|---|
| device / text overlaps | 0 | 0 |
| `__qaLeaks` | clean | clean |
| `__qaLineClash` | clean | clean |
| `__qaClipped` | clean | clean |
| body copy < 15 px | 0 | 0 |
| tap targets < 44 px | 0 | 0 |
| console + D-pad + A/B in one viewport | yes | yes |
| D-pad press visibly moves | yes | yes |
| canvas changes on press | yes | yes |

The 5 remaining < 12 px nodes are the decorative `hero__star` glyph and the four D-pad
arrow glyphs inside 44 px buttons.

**Desktop unchanged:** the pre-change commit (`995a58b`) was built in a separate
worktree and both builds were measured at 1440 x 900. 28 of 29 layout fields are
byte-identical (`.nav__inner`, `.hero`, `.specs`, `.tapes`, `.play`, `.colours`,
`.order`, `.footer`, document width and scroll height, and the device pose
`fx 0.43 / fy 0.03 / w 0.5`). The one difference is `deviceBounds`, an API that did not
exist before.

## Before / after
`docs/final/mobile/before/` (the brief's captures), `after-390/`, `after-360/`, and
labelled pairs in `pairs/`:
`01-hero`, `02-header`, `03-boot-pin`, `04-two-screens`, `05-tapes`, `06-play`.
