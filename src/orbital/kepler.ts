import {
  BASE_PERIOD,
  BASE_SEMI_MAJOR,
  KEPLER_ITERATIONS,
  ORBIT_DEPTH,
  ORBIT_TILT,
  PERIHELION_COS,
  PERIHELION_SIN,
  TAU,
} from './constants'
import type { MutableVec3, OrbitalElements } from './types'

/**
 * Kepler's third law: the period grows with the semi-major axis to the 3/2
 * power. This is what makes the system read as one — the inner planet visibly
 * laps the outer ones rather than every ring turning at its own arbitrary rate.
 */
export function orbitalPeriod(semiMajor: number): number {
  return BASE_PERIOD * (semiMajor / BASE_SEMI_MAJOR) ** 1.5
}

/**
 * Mean anomaly at time t. Grows linearly with time, which is what makes the
 * simulation deterministic: position is a pure function of elapsed seconds,
 * never an accumulation of per-frame deltas that drift apart between refresh
 * rates or across a backgrounded tab.
 */
export function meanAnomalyAt(elements: OrbitalElements, seconds: number): number {
  return elements.meanAnomaly + (seconds / orbitalPeriod(elements.semiMajor)) * TAU
}

/**
 * Newton solve of Kepler's equation, M = E − e·sin E.
 *
 * Going through the eccentric anomaly rather than sweeping the angle directly
 * is what gives the bodies Kepler's second law — measurably faster at
 * perihelion, slower at aphelion. Sweeping theta uniformly would look similar
 * at a glance and be wrong in exactly the way the whole project is trying
 * not to be.
 */
export function eccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  let E = meanAnomaly
  for (let i = 0; i < KEPLER_ITERATIONS; i += 1) {
    E -= (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E))
  }
  return E
}

/**
 * Point on the tilted ellipse with the star at one focus, written into
 * `target` rather than returned, so the animation loop allocates nothing.
 */
export function orbitPosition<T extends MutableVec3>(
  elements: OrbitalElements,
  eccentric: number,
  target: T,
): T {
  const alongMajor = elements.semiMajor * (Math.cos(eccentric) - elements.eccentricity)
  const alongMinor =
    elements.semiMajor * Math.sqrt(1 - elements.eccentricity ** 2) * Math.sin(eccentric)

  const planar = alongMajor * PERIHELION_COS - alongMinor * PERIHELION_SIN
  const depth = alongMajor * PERIHELION_SIN + alongMinor * PERIHELION_COS

  target.x = planar
  target.y = depth * ORBIT_TILT
  target.z = depth * ORBIT_DEPTH
  return target
}

/** Convenience: local orbital position at time t, relative to the parent. */
export function localPositionAt<T extends MutableVec3>(
  elements: OrbitalElements,
  seconds: number,
  target: T,
): T {
  const mean = meanAnomalyAt(elements, seconds)
  return orbitPosition(elements, eccentricAnomaly(mean, elements.eccentricity), target)
}

/** Distance from the focus at a given eccentric anomaly — the r in the polar
 *  form, used by the tests to check conservation. */
export function radiusAt(elements: OrbitalElements, eccentric: number): number {
  return elements.semiMajor * (1 - elements.eccentricity * Math.cos(eccentric))
}
