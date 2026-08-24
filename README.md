# AW. — Solar System Portfolio (React)

A single-scene, no-scroll portfolio built around a solar-system metaphor: the sun is Home,
five orbiting planets are the site's pages (Work, Services, About, Pricing, Contact).

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

To build a production bundle:

```bash
npm run build
npm run preview
```

## What's real vs. what's a wireframe convention

- **Dither background** (`src/components/DitherCanvas.jsx`) is a genuine ordered dither:
  an 8×8 Bayer threshold matrix applied per-frame to a low-resolution animated noise field,
  then blitted up with nearest-neighbor scaling for the chunky halftone-grain look. It's not
  a CSS background-image trick. Stars and comets are drawn as a separate crisp canvas layer
  on top, so they stay sharp against the dithered grain.
- **Orbits** are computed as true circles in `useOrbit.js` (`x = cos(angle) * radius`,
  `y = sin(angle) * radius`) — the eye-level tilt you see is a real CSS 3D transform
  (`rotateX(68deg)` on `.system`) applied to that flat circular plane, not a faked ellipse.
  Each planet gets a randomized start angle so they never move in sync.
- **Buttons** (`OutlineButton.jsx`): the container's border/padding/hit-area never animates.
  Only the inner `<span class="btn-text">` re-renders during the typewriter hover effect, via
  `useTypewriter.js`. The stroke color and text color both shift to burnt orange on hover, but
  the box itself stays geometrically static the whole time — no resize, no reflow of neighboring
  elements.
- **prefers-reduced-motion** is respected throughout: orbits freeze at their (still varied)
  start angle instead of animating, and the dither canvas renders a single static frame instead
  of looping.

## Structure

```
src/
  components/
    DitherCanvas.jsx     — Bayer-matrix dither render + starfield/comets
    SolarSystem.jsx       — desktop scene: rings, sun, planets, preview, panel
    Planet.jsx             — single orbiting planet + label
    PlanetPreview.jsx      — hover tooltip
    PanelOverlay.jsx       — slide-in panel (work/about/pricing/contact content)
    OutlineButton.jsx      — the button system (see above)
    MobileNav.jsx           — simplified stacked list for <820px
  hooks/
    useOrbit.js             — circular orbit math
    useTypewriter.js         — button text-only typewriter animation
  data/
    planets.js                — all page content lives here — edit this to change copy
  styles/
    global.css                 — tokens, button system, base resets
    scene.css                   — solar system, panel, pricing, mobile styles
```

## Known gaps to close before this is client-ready

- Contact form has no submit handler wired up yet (currently `preventDefault` only) —
  needs a real endpoint (Formspree or similar, matching your existing pattern).
- Placeholder pricing figures and case-study copy in `data/planets.js` are illustrative —
  swap in real numbers/copy.
- No route/deep-linking — the whole site is one route by design (no-scroll, single-page
  concept), but if you want a shareable URL per panel (e.g. `/pricing`), that needs
  `history.pushState` wiring, which isn't in yet.
