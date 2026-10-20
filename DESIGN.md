# TOMO-01 — launch site

**Concept.** A beautifully printed toy catalogue that has been interrupted by one impossible object:
a real, ray-lit Tomo-01 you can open and boot. Warm paper, hairline engineering annotations, mono spec
labels, one accent. No glass cards, no gradient hero, no "future of play". The product is the only thing
on the page that isn't printed.

**Differs from the last projects:** Afterlight/Vesper were dark, serif and cinematic; this is pale paper,
condensed poster caps, printed-matter annotations and a hard machined object with matte plastic. Chroma was
kinetic type on black. Nothing here is dark-first except one full-bleed manifesto panel.

**Palette**
- `--ground #F2EDE3` paper (page)
- `--ground-2 #E7E0D2` plate / raised panel
- `--ink #17140F` ink, type, hairlines
- `--ink-2 #57503F` secondary text
- `--accent #E5432B` Cola — CTA fill only (< 5% of pixels)
- `--shell #FFCE3A` Butter — device colour, highlight blocks, screen glow
- `--lcd #B9F24A` screen light, focus rings, micro-interactions
- `--inverse #17140F` manifesto panel

**Type**
- Display: **Big Shoulders Display Variable** 700/800, uppercase, tight, poster scale. Hero at 15vw is a shape, not a sentence.
- Text: **Barlow** 400/500, 17–20px, 1.55.
- Labels/numbers/specs: **DM Mono** 400, 11–13px, +0.08em.
(Recorded with `font-pick.sh --record`, mood `grotesk-expressive`.)

**Motion character.** Mechanical, never floaty: expo-out, small overshoot on the hinge (`back.out(1.4)`),
20 ms type stagger, LCD wipes rather than fades, 1.1 s entrances. The page scrolls on Lenis.

**Signature moment.** *The Boot.* The device is one continuous WebGL object anchored to the page. In the
hero it is closed and lit like a product shot; scrolling into `01 — OPEN` drives its hinge to 110° with a
spring, the top LCD flickers white → green → dot-matrix TOMO → a living pixel garden, and the device holds
while you watch it. Further down, picking a shell repaints the actual material.

**Avoid**
1. Dark navy + neon glass cards ("premium tech site" template).
2. A floating phone/console mockup with a CSS gradient and a bloom halo.
3. Featherweight copy: "the future of play", "unleash", "revolutionary".
