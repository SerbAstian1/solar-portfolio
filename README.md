# AW. — Solar System Portfolio

A portfolio built as a small orbital system. The star is home, five planets are
the sections, and four moons are the projects under Work. Motion comes from
Keplerian mechanics rather than from keyframes, and the URL is the source of
truth for where you are.

## Run it

```bash
npm install
npm run dev
```

```bash
npm run build     # vite build + static prerender of all six routes
npm run preview
npm run verify    # typecheck + tests + build + size gate
```

## What is actually mathematical here

Not decoration. Each of these is a pure, tested module under `src/orbital/`
with no knowledge of React or three.js.

- **Orbits** solve Kepler's equation, `M = E − e·sin E`, by Newton iteration
  and place each body on a tilted ellipse with the star at one focus. Bodies
  therefore obey Kepler's second law — measurably faster at perihelion — and
  periods follow the third law, `T ∝ a^³ᐟ²`, so the inner planet visibly laps
  the outer ones.
- **Position derives from elapsed time**, never accumulates per frame. Same
  time in, same position out, with no drift across refresh rates or a
  backgrounded tab.
- **Hierarchy** puts a moon at `parent world + local orbit`, so it is carried
  along its parent's orbit rather than tracing its own path around the star.
- **The camera** is three critically damped springs, integrated in closed form.
  That has the semigroup property — two half-steps equal one whole step — so
  it is exactly, not approximately, frame-rate independent. It never overshoots
  from rest and can be redirected mid-flight without restarting.
- **Stellar transits** compute the true circle-intersection area between the
  projected planet and star disks, giving coverage, remaining flux, and a state
  of clear / ingress / full-transit / egress. The event emerges from the
  geometry; nothing is keyed to a timer.
- **The cursor field** is a bounded inverse-square disturbance, softened near
  zero and clipped at 10px.

### What the transits actually do

With the orbital plane tilted at 0.38, only the inner planet ever crosses the
star's disk, and it grazes rather than fully entering:

| Body | Peak coverage | Duration | Orbit |
|---|---|---|---|
| Work | 4.35% (of 6.07% possible) | 5.69s | 48.0s |
| Services, About, Pricing, Contact | never crosses | — | — |

That is the tilt doing its job — a shallower plane would produce more transits
and flatter, more linear-looking orbits. `ORBIT_TILT` in
`src/orbital/constants.ts` is the lever.

## Structure

```
src/
  orbital/          pure maths — no React, no three, fully tested
    kepler.ts         Kepler's equation, third law, ellipse position
    elements.ts       the system as data, planets and moons
    hierarchy.ts      world = parent world + local orbit
    camera.ts         focus target and framing
    occultation.ts    circle intersection, coverage, transit state
    interpolation.ts  lerp, smoothstep, critically damped spring
    cursorField.ts    bounded pointer disturbance
  simulation-side components/
    ThreeSolarSystem  R3F scene: camera rig, star, planets, moons, labels
    SolarSystem       scene host, hover and selection state
    DitherCanvas      8x8 Bayer ordered dither + starfield + comets
    PanelOverlay      content panel (focus-trapped dialog)
  navigation/
    routes.ts         path <-> section
    useRouteSection   History API binding
  data/
    planets.ts        all section copy — edit this to change content
    seo.ts            per-route title and description
scripts/
  optimize-models.mjs  GLB texture re-encode
  prerender.mjs        static HTML per route + sitemap + robots
  check-size.mjs       enforces perf-budget.json
```

## Responsive behaviour

Three spatial modes, not a scaled-down desktop:

| Viewport | Behaviour |
|---|---|
| ≥ 1024px | full system, every label drawn |
| 640–1023px | system with labels on demand |
| < 640px | stacked list — no scene, no WebGL context, no models fetched |

## Accessibility

`prefers-reduced-motion` freezes orbits, spin and the camera at t=0, and
disables the cursor field; bodies keep their distinct starting anomalies so the
system still reads as a system. The panel is a real focus-trapped dialog with
Escape and focus restoration. Every section is a real URL reachable from a
keyboard-accessible nav, so nothing is available only through spatial
interaction.

## Budgets

Enforced by `npm run size`, which exits non-zero on a breach.

| | Budget | Actual |
|---|---|---|
| Entry JS (every device) | 170 KB | 88 KB gzip |
| Scene chunk (≥640px only) | 260 KB | 245 KB gzip |
| CSS | 20 KB | 3.1 KB gzip |
| 3D assets | 1100 KB | 1042 KB |

## Known gaps

- Contact form has no submit handler and no `name` attributes — it needs a real
  endpoint plus pending/success/error states.
- `og-cover.png` is referenced by the share tags but does not exist yet; it
  needs a real 1200×630 image.
- Individual projects are not deep-linkable — there are no `/work/:project`
  routes yet.
- Pricing figures and case-study copy in `data/planets.ts` are illustrative.
- Two npm advisories in vite@5/esbuild, both dev-server-only and absent from
  production output. The fix is vite@8, a three-major jump.
