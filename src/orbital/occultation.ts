import { clamp } from './interpolation'
import type { Vec3 } from './types'

/**
 * Planetary transit across the apparent stellar disk.
 *
 * The chain this module implements, and deliberately keeps separate from any
 * rendering concern:
 *
 *   orbital position → projected geometry → circle intersection →
 *   stellar coverage → occultation state → (elsewhere) visual response
 *
 * Nothing here knows about three.js, React, or the frame loop. Every function
 * is deterministic and independently testable, which is the point: the transit
 * is a consequence of where the bodies actually are, not an animation keyed to
 * a timer.
 */

export type OccultationState = 'clear' | 'ingress' | 'full-transit' | 'egress'

export interface Occultation {
  /** Fraction of the star's apparent disk obscured, 0–1. */
  readonly coverage: number
  /** Remaining visible stellar flux, 1 − coverage. */
  readonly flux: number
  readonly state: OccultationState
  /** Apparent centre separation used for the calculation. */
  readonly separation: number
  readonly overlapArea: number
}

export const CLEAR_TRANSIT: Occultation = {
  coverage: 0,
  flux: 1,
  state: 'clear',
  separation: Number.POSITIVE_INFINITY,
  overlapArea: 0,
}

/**
 * Area of the lens where two circles intersect.
 *
 *   A = r₁²·acos((d² + r₁² − r₂²) / (2·d·r₁))
 *     + r₂²·acos((d² + r₂² − r₁²) / (2·d·r₂))
 *     − ½·√((−d+r₁+r₂)(d+r₁−r₂)(d−r₁+r₂)(d+r₁+r₂))
 *
 * The two degenerate cases are handled before the formula rather than inside
 * it: they are where it divides by zero and where floating-point error pushes
 * the acos arguments outside [−1, 1] and yields NaN. A single NaN here would
 * propagate into the star's brightness and blank it for the rest of the
 * session, so both acos arguments are clamped and the radicand is floored at
 * zero even though the branches above should already guarantee both.
 */
export function circleOverlapArea(radiusA: number, radiusB: number, distance: number): number {
  const a = Math.abs(radiusA)
  const b = Math.abs(radiusB)
  const d = Math.abs(distance)

  if (a === 0 || b === 0) return 0
  // Disjoint — no overlap at all.
  if (d >= a + b) return 0
  // One disk wholly inside the other: the overlap is the smaller disk.
  if (d <= Math.abs(a - b)) return Math.PI * Math.min(a, b) ** 2

  // Partial overlap. d > 0 here, since d <= |a − b| was handled above and
  // that includes d === 0 whenever the radii are equal.
  const acos = (x: number) => Math.acos(clamp(x, -1, 1))
  const termA = a * a * acos((d * d + a * a - b * b) / (2 * d * a))
  const termB = b * b * acos((d * d + b * b - a * a) / (2 * d * b))
  const radicand = (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)
  const termC = 0.5 * Math.sqrt(Math.max(0, radicand))

  // Floored at zero. Near grazing contact the three terms very nearly cancel,
  // and catastrophic cancellation lands the sum a few parts in 10^7 below zero
  // — enough to make coverage negative and push flux above 1, i.e. a star
  // briefly brighter than full while a planet is touching it.
  return Math.max(0, termA + termB - termC)
}

/**
 * Fraction of the star's disk hidden by a body at apparent separation `d`.
 *
 * For a body much smaller than the star this peaks at (Rp/R★)² — the ratio of
 * the two disk areas — which is the same relation that makes real transit
 * photometry work. It is also why the dip is genuinely small: a planet a
 * quarter of the star's width removes about 6% of its light, not half.
 */
export function stellarCoverage(starRadius: number, bodyRadius: number, distance: number): number {
  if (starRadius <= 0) return 0
  return clamp(circleOverlapArea(starRadius, bodyRadius, distance) / (Math.PI * starRadius ** 2), 0, 1)
}

/**
 * Which phase of the event the geometry is in.
 *
 * Ingress and egress are the same geometric configuration — partial overlap —
 * and are distinguished only by whether the separation is closing or opening.
 * `nextSeparation` is therefore the separation a short step ahead in time,
 * which the caller evaluates from the orbit itself rather than remembering
 * the previous frame. That keeps the whole calculation a pure function of t
 * and free of per-frame state that a paused tab could desynchronise.
 */
export function occultationStateFor(
  starRadius: number,
  bodyRadius: number,
  separation: number,
  nextSeparation: number,
): OccultationState {
  const a = Math.abs(starRadius)
  const b = Math.abs(bodyRadius)
  const d = Math.abs(separation)

  if (d >= a + b) return 'clear'
  if (d <= Math.abs(a - b)) return 'full-transit'
  return nextSeparation < separation ? 'ingress' : 'egress'
}

export interface TransitInput {
  /** Apparent radius of the star, in the same units as the positions. */
  readonly starRadius: number
  /** Apparent radius of the transiting body. */
  readonly bodyRadius: number
  /** Body position relative to the star, in view space. */
  readonly position: Vec3
  /** Body position a short step later — supplies ingress/egress direction. */
  readonly nextPosition: Vec3
}

/**
 * Apparent separation of two bodies as seen by the camera.
 *
 * Only the components in the view plane count: a body directly behind the
 * star at great depth is at zero apparent separation, which is exactly what
 * makes a transit an apparent phenomenon rather than a three-dimensional
 * proximity test. This is the projection for the scene's orthographic camera,
 * where the whole system shares one uniform scale, so apparent radii need no
 * depth division and the coverage ratio is identical whether it is evaluated
 * in world units or in pixels. A perspective camera would require dividing
 * both radii and the separation by depth first.
 */
export function apparentSeparation(position: Vec3): number {
  return Math.hypot(position.x, position.y)
}

/**
 * Full transit result for one body against the star.
 *
 * Returns CLEAR when the body is behind the star (negative z, pointing away
 * from the camera). That configuration is the reverse event — the star
 * occulting the body — and it must not be reported as the star losing light.
 */
export function computeTransit(input: TransitInput): Occultation {
  const { starRadius, bodyRadius, position, nextPosition } = input

  if (position.z < 0) return CLEAR_TRANSIT

  const separation = apparentSeparation(position)
  const overlapArea = circleOverlapArea(starRadius, bodyRadius, separation)
  const coverage =
    starRadius > 0 ? clamp(overlapArea / (Math.PI * starRadius ** 2), 0, 1) : 0

  return {
    coverage,
    flux: 1 - coverage,
    state: occultationStateFor(
      starRadius,
      bodyRadius,
      separation,
      apparentSeparation(nextPosition),
    ),
    separation,
    overlapArea,
  }
}

/**
 * Combines several bodies' contributions into one figure for the star.
 *
 * Coverage sums, because two separate bodies on the disk hide two separate
 * patches of it. That over-counts if the bodies also overlap each other,
 * which the orbit spacing here makes impossible — the tests pin the spacing
 * that guarantees it. The result is clamped so no arrangement can ever report
 * the star as more than fully hidden.
 */
export function combineTransits(transits: readonly Occultation[]): Occultation {
  let coverage = 0
  let overlapArea = 0
  let nearest = CLEAR_TRANSIT

  for (const transit of transits) {
    coverage += transit.coverage
    overlapArea += transit.overlapArea
    if (transit.separation < nearest.separation) nearest = transit
  }

  coverage = clamp(coverage, 0, 1)
  return {
    coverage,
    flux: 1 - coverage,
    state: nearest.state,
    separation: nearest.separation,
    overlapArea,
  }
}
