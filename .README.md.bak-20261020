# web-editorial kit

Award-style marketing/portfolio site. Vite 8 + GSAP 3.15 (ScrollTrigger, SplitText) + Lenis.
Demo content: "Halde", a ceramics atelier. Replace content, keep the system.

```bash
cp -r /opt/data/kits/web-editorial ./my-site && cd my-site && rm -rf node_modules dist && npm install
npm run dev      # http://localhost:5173
npm run build    # static dist/ (relative base, deploy anywhere: GitHub Pages, tunnel, Vercel)
```

## Re-theme (one file)
`src/styles/tokens.css`: palette (6 vars), fonts (display/text/mono), fluid type scale, spacing,
eases. Swap fonts by installing `@fontsource/<font>` and changing imports at the top of `base.css`.

## Motion API (HTML attributes, no JS needed)
| Attribute | Effect |
|---|---|
| `data-split="lines\|words\|chars"` | masked text rise on scroll |
| `data-split-intro` (with data-split) | plays in the page intro instead of on scroll |
| `data-intro` | fades/rises in during the intro timeline |
| `data-reveal="up\|fade\|scale"` + `data-delay` | element entrance on scroll |
| `data-reveal-group` | children with data-reveal stagger together |
| `data-scrub-words` | paragraph words brighten as you scroll |
| `data-parallax="0.15"` | drift relative to scroll |
| `data-clip` | media wipes in from bottom with zoom-out (put the image inside) |
| `data-marquee` + `data-speed` / `data-direction` | infinite band reacting to scroll velocity; `data-marquee-toggle` button pauses |
| `data-magnetic` + `data-strength` | element leans toward pointer (desktop) |
| `data-cursor="View"` | custom cursor grows into a label over the element |
| `data-horizontal` (section with `.h-track` of `.h-card`) | pinned horizontal gallery on desktop; swipe row on mobile |
| `data-counter="2300"` + `data-suffix` / `data-decimals` | count-up when visible |

Reduced motion: everything collapses to gentle opacity fades (owner preference); marquee stops.

## Section patterns (src/styles/sections.css)
preloader, nav (difference blend), hero (+ arch art), marquee, statement, horizontal works,
numbers, process (sticky title, dark section), quote, CTA (magnetic button), footer (giant wordmark).
Delete what you don't need; don't add uniform card grids.

## Images
Replace `.glaze` art with real/art-directed images: `<div class="h-card__media" data-clip><img src=...></div>`.
Use AVIF/WebP, width/height attributes, `loading="lazy"` below the fold.

## Check
`bash /opt/data/scripts/studio-qa/qa.sh web http://127.0.0.1:<port>/` then critique the sheets.
