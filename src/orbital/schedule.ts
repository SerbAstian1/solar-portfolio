import { localPositionAt, orbitalPeriod } from './kepler'
import type { CelestialBody } from './types'

export interface TransitSchedule {
  /** Orbital period, and therefore the interval between transits. */
  readonly period: number
  /** Scene time of the first moment the body is wholly on the stellar disk. */
  readonly ingress: number
  /** How long it spends crossing the face. */
  readonly duration: number
}

const scratch = { x: 0, y: 0, z: 0 }

/**
 * When a body transits, found by walking one orbit rather than by solving.
 *
 * A closed form exists, but it would have to agree with `orbitPosition` about
 * the tilt, the perihelion rotation, the direction of travel and the sign of
 * the vertical axis — five things that have each already changed once. Walking
 * the same function the renderer walks cannot fall out of step with it, and
 * this runs once at mount rather than per frame.
 *
 * Returns null for the four bodies that never reach the disk, which is most of
 * them; only the innermost planet transits at these inclinations.
 */
export function transitSchedule(
  body: CelestialBody,
  starRadius: number,
  samples = 20000,
): TransitSchedule | null {
  const period = orbitalPeriod(body.semiMajor)
  const bodyRadius = body.size / 2
  // Wholly on the face, which is the event worth counting down to — a graze
  // across the limb is not what a visitor would call a transit.
  const limit = starRadius - bodyRadius
  if (limit <= 0) return null

  const onDisk = (t: number) => {
    const p = localPositionAt(body, t, scratch)
    return p.z > 0 && Math.hypot(p.x, p.y) < limit
  }

  let first = -1
  let last = -1
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * period
    if (!onDisk(t)) continue
    if (first < 0) first = t
    last = t
  }
  if (first < 0) return null

  /* A transit straddling t=0 would be split across both ends of the scan and
     read as one long event covering nearly the whole orbit. Detect that by the
     window being implausibly wide, and re-find the true ingress by walking
     forward from the gap instead. */
  if (last - first > period * 0.5) {
    let gapEnd = -1
    for (let i = 0; i < samples; i += 1) {
      const t = (i / samples) * period
      if (!onDisk(t)) continue
      const previous = ((i - 1) / samples) * period
      if (i > 0 && !onDisk(previous)) {
        gapEnd = t
        break
      }
    }
    if (gapEnd >= 0) {
      let end = gapEnd
      for (let i = 0; i < samples; i += 1) {
        const t = gapEnd + (i / samples) * period
        if (!onDisk(t % period)) break
        end = t
      }
      return { period, ingress: gapEnd, duration: end - gapEnd }
    }
  }

  return { period, ingress: first, duration: last - first }
}

/**
 * Seconds until the next transit begins, given the scene clock.
 *
 * Zero while one is in progress, so a caller can treat `0` as "now" and show
 * the event rather than a countdown to it.
 */
export function timeToNextTransit(schedule: TransitSchedule, elapsed: number): number {
  const phase = (((elapsed - schedule.ingress) % schedule.period) + schedule.period) %
    schedule.period
  if (phase < schedule.duration) return 0
  return schedule.period - phase
}
