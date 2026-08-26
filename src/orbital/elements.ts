import type { CelestialBody } from './types'

/**
 * The system, as data.
 *
 * Elements moved here from the scene component so that routing, the camera,
 * the responsive layout and the tests all read the same numbers instead of
 * each deriving their own. Values are preserved exactly from the original
 * ORBITS table — this was a move, not a retune.
 *
 * DIRECTION. The camera sits above the orbital plane, so the near half of
 * every orbit is the lower half of the frame and the system reads
 * anticlockwise — see DEPTH_TO_SCREEN_Y in constants.ts. Because a body is in
 * front of the star exactly when it is *below* it, that fixes where the two
 * events happen and which way they run: a transit crosses the bottom of the
 * disk left to right, and an occultation passes above it right to left.
 *
 * TRANSITS AND OCCULTATIONS. Only Work reaches the star. The projected orbit
 * is an ellipse of semi-axes a x a*inclination centred on the star, and a
 * body is lowest on screen exactly when it is nearest the camera — so
 * a*inclination is, to within the eccentricity, the closest that body ever
 * comes to the star's centre on screen. Against a 69-unit star:
 *
 *   work      inclination 0.24, projected minor 40.8  -> crosses the face
 *   services  0.38, projected minor  95.0             -> never reaches it
 *   about     0.38, projected minor 125.4             -> never reaches it
 *   pricing   0.38, projected minor 155.8             -> never reaches it
 *   contact   0.38, projected minor 186.2             -> never reaches it
 *
 * The outer four cannot be given transits at this tilt, and the arithmetic is
 * worth recording so it is not rediscovered. A body of radius r must close to
 * within R - r to cross the whole face, which caps its inclination at
 * (R - r)/a: 0.18 for services, 0.16 for about, 0.10 for pricing, 0.10 for
 * contact. Meeting those would flatten the system to near edge-on, and the
 * only alternative — enlarging the star until the outer orbits reach it —
 * needs it 408 units across against a 490-unit orbit, which is not a solar
 * system. The tilt is chosen for the look of the whole; one planet transiting
 * is what it costs, and it makes the event belong to Work rather than
 * becoming ambient.
 *
 * Moons carry `parentId`. Only Work has real children (four projects), so
 * only Work has moons; inventing satellites for the other four sections
 * would be decoration pretending to be structure.
 */
export const BODIES: readonly CelestialBody[] = [
  /* Work carries a shallower inclination than the rest of the system, and
     that is what makes it the transiting planet. At the shared 0.38 its
     projected orbit had a semi-minor axis of 64.6 against a stellar radius
     of 69: the planet reached only 62.5 from the star's centre at its
     nearest approach in front, so it clipped the bottom limb and never crossed
     the face. At 0.24 the projected minor axis is 40.8, inside R - r = 52,
     so the disk is fully entered and the light curve gains a flat bottom. */
  /* meanAnomaly puts the first transit 15s after load — the phase at t=0 is
     free, the event emerges from the geometry either way, so it may as well
     be set where a visitor will actually witness it. It then repeats every
     48s. Two constraints fix the value. Reversing the orbit to clockwise
     reflects the path in the major axis, which turned the old phase from a
     transit into an occultation and had to be undone. And the phase that
     would have restored the original 12s lands at 3.83, within 0.07 of
     about's 3.9 — close enough that the two would set out from almost the
     same place and the system would read as posed. 15s is the nearest
     witnessable time that clears every other body by 0.46. */
  { id: 'work', semiMajor: 170, eccentricity: 0.055, meanAnomaly: 3.4401, inclination: 0.24, spin: 11, axialTilt: 0.24, size: 34 },
  { id: 'services', semiMajor: 250, eccentricity: 0.045, meanAnomaly: 0.7, spin: 15, axialTilt: -0.16, size: 46 },
  { id: 'about', semiMajor: 330, eccentricity: 0.04, meanAnomaly: 3.9, spin: 9, axialTilt: 0.41, size: 30 },
  { id: 'pricing', semiMajor: 410, eccentricity: 0.035, meanAnomaly: 2.3, spin: 19, axialTilt: -0.3, size: 52 },
  { id: 'contact', semiMajor: 490, eccentricity: 0.03, meanAnomaly: 5.1, spin: 13, axialTilt: 0.19, size: 36 },

  /* Work's project moons.
     The radii are bounded on both sides and the tests enforce both bounds.
     Inner bound: clear of the parent's own 34-unit diameter. Outer bound:
     Work's aphelion (179.35) plus the outermost moon's aphelion must stay
     inside Services' perihelion (238.75), which leaves 59.4 units of room.
     A first pass at 34-70 exceeded that and would have sent moons visibly
     through the neighbouring orbit ring. */
  { id: 'redmur', parentId: 'work', semiMajor: 25, eccentricity: 0.02, meanAnomaly: 0.4, spin: 6, axialTilt: 0.1, size: 7 },
  { id: 'jutech', parentId: 'work', semiMajor: 34, eccentricity: 0.02, meanAnomaly: 2.2, spin: 7, axialTilt: -0.14, size: 6 },
  { id: 'campus-turkey', parentId: 'work', semiMajor: 43, eccentricity: 0.02, meanAnomaly: 4.0, spin: 8, axialTilt: 0.2, size: 7 },
  { id: 'mirror-inc', parentId: 'work', semiMajor: 52, eccentricity: 0.02, meanAnomaly: 5.6, spin: 9, axialTilt: -0.08, size: 6 },
] as const

export const BODY_BY_ID: ReadonlyMap<string, CelestialBody> = new Map(
  BODIES.map((body) => [body.id, body]),
)

/** Bodies orbiting the star itself — the five sections. */
export const PLANET_BODIES: readonly CelestialBody[] = BODIES.filter((b) => b.parentId === undefined)

export function moonsOf(parentId: string): readonly CelestialBody[] {
  return BODIES.filter((b) => b.parentId === parentId)
}

export function getBody(id: string): CelestialBody | undefined {
  return BODY_BY_ID.get(id)
}
