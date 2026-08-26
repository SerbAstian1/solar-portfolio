# Mark reveal

The animation on the logo tiles in a project's **Marks** section.

Adapted from the `logo-animation` skill in
[iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills),
specifically `skills/logo-animation/references/logo-patterns.md`.

## What was taken

**Pattern 2, mask wipe**, plus the *Final settle / overshoot* beat from the
timing table. Every duration and curve in `logo-reveal.css` is the cookbook's
own value, picked from the middle of its stated ranges:

| Beat | Their range | Ours |
|---|---|---|
| Mask wipe | 0.5–0.9s, `cubic-bezier(.22,1,.36,1)` | 640ms, same curve |
| Build stagger | 0.06–0.10s | 70ms |
| Settle overshoot | 0.12–0.20s, scale 1.04 → 1.00 | 160ms, same scale |
| Full envelope | 0.8–2.5s | 1.15s for six marks |

Their clearspace and geometry rules decided two things that would otherwise
look like arbitrary structure. The wipe is on the tile and the settle is on the
image inside it, because `clip-path` and `transform` on one element fight over
the same box — and because scaling the tile would crop into the mark's safe
margin, which the rules forbid. The settle is a uniform scale: no skew, squash
or non-uniform axis, all of which they call off-brand on a final mark.

## What was left, and why

**Pattern 1, stroke draw-on.** The best-looking option and unusable here. It
animates `stroke-dashoffset` on `<path>` elements, so it needs the mark inlined
as SVG. These tiles render `<img>`, because the marks arrive as exported files
of whatever format the project produced. Worth revisiting *only* for a project
whose marks ship as real SVG — the technique is genuinely better when it
applies.

**Pattern 3, build-on with stagger.** Their version is a GSAP timeline. The
scene chunk already sits at 95% of its budget, and a whole animation library
for a stagger that `animation-delay` gives for nothing is not a trade worth
making. The stagger here is the same idea in CSS.

**Pattern 5, idle loop.** Correct for a loader, wrong for a portfolio grid: a
set of marks pulsing forever behind someone reading a case study is noise.

**Pattern 6, Lottie.** Another runtime dependency, and it wants
designer-authored JSON that does not exist for these projects.

## One technique per mark

The cookbook is firm that a mark gets one of draw / build / morph, not several.
This uses the wipe. The stagger is not a second technique competing with it —
it runs *across* marks rather than within one — and the settle is listed in the
source as its own closing beat.

## Reduced motion

`prefers-reduced-motion: reduce` runs no animation at all and shows the settled
mark, which is both the cookbook's requirement and this site's existing rule.
Not a faster animation — none.

## Licence

MIT, © 2026 iart.ai. Full text at
<https://github.com/iart-ai/motion-design-skills/blob/main/LICENSE>.

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
