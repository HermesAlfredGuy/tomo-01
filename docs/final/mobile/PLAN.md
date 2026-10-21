# Phone experience pass — plan

Target: 390×844 and 360×780. Desktop (≥900px) is frozen: every change is inside a
`max-width: 899px` / `max-width: 640px` block, or guarded by `!mq.matches` in JS.
Motion stays full: no `prefers-reduced-motion`, no toggle, nothing removed.

## Root cause of most of the phone defects

The WebGL canvas is `position: fixed; inset: 0` and the device was placed by
hand-tuned numbers in `POSES.mobile` (`w: 0.96, fy: -0.62`). The canvas does not
scroll, so the device lands wherever those numbers put it — across the CTA and
the spec block in the hero, behind the copy in the boot pin, and over the
"Two screens" heading. Every "the device is in the wrong place" bug is the same
bug.

**Fix:** the device gets real, reserved bands in the document flow, and its
pose is *solved* from the measured rect of the active band. Then "nothing sits
under the device" is structural, not a tuning accident, and the device travels
with the page instead of floating over it.

## The seven fixes

1. **Hero.** `.hero` becomes copy → **device band** → spec strip. The band is an
   empty reserved block (`data-band="hero"`). No copy can enter it.
2. **Header.** One row, ≤56px: wordmark, sound dot, pre-order. The section nav
   becomes a single non-wrapping horizontally-scrollable strip inside that row
   (`white-space: nowrap`, `overflow-x: auto`, no wrap, every link ≥44×44).
3. **Boot pin.** 260vh → 150vh, and the trigger's phases are re-cut for phones
   (approach 0→0.22, lid 0.22→0.90) so every frame of the pin changes. The
   device sits in its own band between the copy and the readout, so it is inside
   the viewport with margin and the readout is always on screen with it.
4. **Two screens.** Stage opacity is now driven by the *band* rect rather than
   the section rect, so the device is gone before that heading arrives.
5. **Play.** Console is screen-on-top + D-pad/A-B-under, sized to fit one
   viewport. Long instructions go above and the leaked `#game-help` paragraph is
   visually hidden on phones. `touch-action: none` on the console plus Lenis
   stop/start so a thumb on the D-pad never scrolls the page.
6. **Tapes.** Cards drop to `min(70vw, 320px)` so the next card peeks; the
   "Drag / scroll" hint moves up beside the section head, no dead band under it.
7. **Type.** `--step--2` gets a 12px floor at the phone breakpoint, which raises
   every `.label`/mono annotation regardless of which selector sets it. The few
   hard-coded sizes (nav links 11.5, CTA 11, D-pad glyphs 8, ✳ 9.6) are set
   explicitly.

## Verification

- `tools/phone-qa.mjs`: walks the page in 0.8-viewport steps at 390×844 and
  360×780, screenshots each step, and for each step computes the device's
  projected screen box (`__stage.deviceBounds()`) and intersects it with every
  text node and interactive control rect. Overlap count must be 0.
- Same script reports text nodes under 12px, body copy under 15px, and tap
  targets under 44px.
- `tools/qa-mobile.mjs`: the studio-qa leak / line-clash / clipped checks at
  390px.
- Desktop 1440×900 capture before/after, pixel-compared.