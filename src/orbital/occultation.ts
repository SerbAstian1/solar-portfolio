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
  /**
   * Projected centre and apparent radius of the transiting body.
   *
   * Carried so that `combineTransits` can tell whether two bodies are hiding
   * the same patch of star or two different ones. `separation` alone cannot:
   * two bodies at equal separation may be on opposite limbs or on top of each
   * other, and those are not the same event.
   */
  readonly x: number
  readonly y: number
  readonly bodyRadius: number
}

export const CLEAR_TRANSIT: Occultation = {
  coverage: 0,
  flux: 1,
  state: 'clear',
  separation: Number.POSITIVE_INFINITY,
  overlapArea: 0,
  // A zero radius makes this body inert in every pairwise term below, which
  // is what "not transiting" should mean to anything downstream.
  x: 0,
  y: 0,
  bodyRadius: 0,
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
 * Fraction of the *body's* disk hidden behind the star — the reverse event.
 *
 * Same lens area, different denominator: `stellarCoverage` divides it by the
 * star's disk, this divides it by the body's. That single change is the whole
 * difference between a transit and an occultation, and it is why the
 * occultation is by far the larger visual event — the star hides all of a
 * small planet, while the same planet hides only (Rp/R★)² of the star.
 *
 * The contact points fall out of the geometry instead of being tuned. Nothing
 * is hidden until the two limbs touch at d = R + r; the body is wholly hidden
 * only once its trailing limb passes inside at d = R − r. Between them the
 * value is the exact area of the bite the limb takes out of it — not linear
 * in d, and not symmetric about d = R: with the limb bowing away from the
 * body's centre, slightly less than half the body is covered when its centre
 * sits exactly on the limb.
 */
export function bodyObscuration(starRadius: number, bodyRadius: number, distance: number): number {
  if (bodyRadius <= 0) return 0
  return clamp(
    circleOverlapArea(starRadius, bodyRadius, distance) / (Math.PI * bodyRadius ** 2),
    0,
    1,
  )
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
    x: position.x,
    y: position.y,
    bodyRadius: Math.abs(bodyRadius),
  }
}

/** Fraction of a body's own disk that lies on the star, 0–1. */
function fractionOnStar(transit: Occultation): number {
  if (transit.bodyRadius <= 0) return 0
  return clamp(transit.overlapArea / (Math.PI * transit.bodyRadius ** 2), 0, 1)
}

/**
 * Combines several bodies' contributions into one figure for the star.
 *
 * What is wanted is the area of the *union* of the transiting disks, because
 * a patch of star hidden by two planets at once is still only hidden once.
 * Plain summation is the union only while no two bodies overlap, which at the
 * current inclinations is true by accident rather than by construction: only
 * Work reaches the disk, so there is never a second body to overlap with.
 * That guarantee is one number away from gone — flatten any other orbit
 * enough to give it a transit and pairs start sharing the disk, at which
 * point a sum would take a whole extra planet's worth of light out of the
 * star at exactly the moment the viewer can see the two planets on top of
 * one another. The union is computed properly so the figure stays right
 * either way.
 *
 * So: sum, then subtract each pair's shared lens — inclusion–exclusion,
 * stopped after the pairwise term. Two refinements make that honest rather
 * than merely plausible:
 *
 *   The lens is weighted by the smaller of the two bodies' on-disk fractions.
 *   The shared region only double-counts where it lies on the star, and during
 *   ingress a pair can overlap each other out beyond the limb, where neither
 *   is hiding anything to begin with.
 *
 *   The result is held between the largest single contribution and the plain
 *   sum. A union can be neither smaller than its biggest member nor larger
 *   than the total, and those bounds are what keep the truncated series
 *   well behaved: three bodies mutually overlapping would need a triple term
 *   to be exact, and without it the pairwise subtraction overshoots. The
 *   lower bound absorbs the overshoot instead of letting the star brighten.
 *
 * Exact for any number of disjoint bodies, and exact for a pair that overlaps
 * while both sit inside the disk — which between them are every arrangement
 * these orbits can produce at any inclination.
 */
export function combineTransits(
  transits: readonly Occultation[],
  starRadius: number,
): Occultation {
  let summed = 0
  let largest = 0
  let shared = 0
  let nearest = CLEAR_TRANSIT

  for (const transit of transits) {
    summed += transit.overlapArea
    if (transit.overlapArea > largest) largest = transit.overlapArea
    if (transit.separation < nearest.separation) nearest = transit
  }

  for (let i = 0; i < transits.length; i += 1) {
    const a = transits[i]!
    if (a.overlapArea === 0) continue
    for (let j = i + 1; j < transits.length; j += 1) {
      const b = transits[j]!
      if (b.overlapArea === 0) continue
      const lens = circleOverlapArea(a.bodyRadius, b.bodyRadius, Math.hypot(a.x - b.x, a.y - b.y))
      if (lens === 0) continue
      shared += lens * Math.min(fractionOnStar(a), fractionOnStar(b))
    }
  }

  const overlapArea = clamp(summed - shared, largest, summed)
  const starArea = Math.PI * starRadius ** 2
  const coverage = starArea > 0 ? clamp(overlapArea / starArea, 0, 1) : 0

  return {
    coverage,
    flux: 1 - coverage,
    state: nearest.state,
    separation: nearest.separation,
    overlapArea,
    x: nearest.x,
    y: nearest.y,
    bodyRadius: nearest.bodyRadius,
  }
}
