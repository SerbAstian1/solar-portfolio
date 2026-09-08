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
    constants.ts      tilt, direction, and which way depth maps to screen
    elements.ts       the system as data, planets and moons
    hierarchy.ts      world = parent world + local orbit
    camera.ts         focus target and framing
    occultation.ts    circle intersection, coverage, transit state
    interpolation.ts  lerp, smoothstep, critically damped spring
    cursorField.ts    bounded pointer disturbance
  render/           the dither, shared by canvas and WebGL
    bayer.ts          8x8 matrix + its closed form, no three import
    dither.ts         material hook, star-lit phase, hover glow
  components/
    ThreeSolarSystem  R3F scene: camera rig, star, planets, moons, labels
    SolarSystem       scene host, hover and selection state
    DitherCanvas      starfield and comets, dithered on 2D canvas
    PanelOverlay      content panel (focus-trapped dialog)
    ProjectShowcase   marks, palette, type and applications per project
    ContactForm       the enquiry form and its completeness rules
    TelemetryStrip    bottom rail: design tips alternating with the clock
    ErrorBoundary     catches render throws; ErrorPage renders the result
    OutlineButton     the site's button, with its scramble label
  hooks/
    useScramble       hover/focus label resolve, time-based
    useRipple         press echo of a control's own outline
    usePlanetNavigation  the five-phase open/close transition
  motion/logo/      mark reveal, adapted from motion-design-skills (MIT)
  navigation/
    routes.ts         path <-> section, and what counts as unknown
    useRouteSection   History API binding
  data/
    planets.ts        all section copy — edit this to change content
    tips.ts           the hundred design tips shown in the rail
    seo.ts            per-route title and description
scripts/
  optimize-models.mjs  GLB texture re-encode
  build-cursor.mjs     generates the pixel cursor into global.css
  trim-audio.mjs       lossless frame-accurate MP3 trim
  prerender.mjs        static HTML per route + 404 + sitemap + robots
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
| Entry JS (every device) | 170 KB | 98 KB gzip |
| Scene chunk (desktop only) | 260 KB | 246 KB gzip |
| CSS | 20 KB | 6 KB gzip |
| 3D models | 1100 KB | 1042 KB |
| Project imagery | 1200 KB | 293 KB |
| Largest single image | 180 KB | 75 KB |
| Audio | 4000 KB | 0 KB |

Models and imagery are budgeted apart because different people pay for them:
the 3D payload is fetched only above the scene breakpoint, while imagery is
fetched at every viewport. The per-image cap is the one that catches problems
day to day — a total can be met while one forgotten 900KB export sits inside
it, and that single file is what a phone chokes on.

The scan is recursive and covers models, images and audio. It has twice been
blind to something real: a subdirectory it never walked into, and an audio
format its patterns did not name. Anything the site can ship needs a line
here, or the gate only checks what someone remembered to tell it about.

## Error states

Three of them, all reachable without a server.

**404.** A path naming no section is left exactly as it arrived and reported as
not found, rather than quietly rewritten to `/`. The page offers the five
sections as links, so a rotted URL becomes navigation instead of a dead end.

**A scene that will not run** — an unusual GPU, a model that will not parse, a
chunk that never downloads — does not produce an apology. The site already
carries a complete WebGL-free way to navigate itself for small screens, and an
error boundary drops desktop visitors into that instead, with a notice
explaining the missing view.

**Anything else thrown during render** hits a root boundary and gets a page
with a reload. Without one React unmounts the whole tree and leaves an empty
black document — no message, no way back, nothing to report.

A chunk that failed to download is detected separately and told the truth: the
connection dropped or a new version shipped, and reloading fixes it. It is by
far the likeliest production failure here and it is not the visitor's fault.

### One deploy setting

`npm run build` emits `dist/404.html`, which Netlify, GitHub Pages and
Cloudflare Pages all serve for unknown paths by convention. It carries
`noindex`, so rotted links do not become indexable pages.

The **status code is still the host's to send**. Some hosts serve `404.html`
with a `200`, which looks right to a visitor and tells a crawler the page
exists. If the host has a setting for this, set it to return a real `404`.

## Known gaps

- The contact form has no endpoint. It validates, reports completeness and
  refuses to lie about having sent anything, but nothing is transmitted —
  wiring Formspree, Netlify Forms or a `mailto:` is the remaining step. The
  fields carry `id` but no `name`, which a native form POST would need.
- Album cover projects show placeholder artwork, and their Spotify links point
  at real tracks that are not the clients' releases.
- `og-cover.png` is referenced by the share tags but does not exist; it needs a
  real 1200x630 image.
- Individual projects are not deep-linkable — there are no `/work/:project`
  routes yet.
- Pricing figures in `data/planets.ts` are illustrative. The two branding case
  studies are real; the two cover projects are not yet.
- Background audio was built and then removed along with its track. The size
  gate keeps an audio line so a future file is visible, and `git revert` of the
  removal restores the player, control and fades intact.
- Two npm advisories in vite@5/esbuild, both dev-server-only and absent from
  production output. The fix is vite@8, a three-major jump.
