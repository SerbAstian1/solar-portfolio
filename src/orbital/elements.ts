import type { CelestialBody } from './types'

/**
 * The system, as data.
 *
 * Elements moved here from the scene component so that routing, the camera,
 * the responsive layout and the tests all read the same numbers instead of
 * each deriving their own. Values are preserved exactly from the original
 * ORBITS table — this was a move, not a retune.
 *
 * Moons carry `parentId`. Only Work has real children (four projects), so
 * only Work has moons; inventing satellites for the other four sections
 * would be decoration pretending to be structure.
 */
export const BODIES: readonly CelestialBody[] = [
  { id: 'work', semiMajor: 170, eccentricity: 0.055, meanAnomaly: 1.6, spin: 11, axialTilt: 0.24, size: 34 },
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
