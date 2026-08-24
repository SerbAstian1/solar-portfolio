import { clamp } from './interpolation'

/**
 * Local disturbance the pointer exerts on ambient particles.
 *
 * Inverse-square, like gravity, but bounded on both ends — the point is a
 * subtle gravitational influence, not a cursor that destroys the field it
 * moves through:
 *
 *   - Below `softening` the force stops growing. An unbounded 1/d² diverges
 *     at d = 0, which would fling any particle the pointer touched to
 *     infinity and produce a NaN the moment it landed exactly on one.
 *   - Beyond `radius` the force is exactly zero rather than merely small, so
 *     the whole field is not being nudged from across the viewport.
 *   - The result is clamped to `maxDisplacement` so no arrangement of inputs
 *     can move a particle further than a few pixels.
 */
export interface CursorFieldOptions {
  /** Beyond this distance the pointer has no effect at all, in px. */
  readonly radius: number
  /** Distance at which the force stops growing, in px. */
  readonly softening: number
  /** Displacement at the softening distance, in px. */
  readonly strength: number
  /** Hard ceiling on how far a particle may be pushed, in px. */
  readonly maxDisplacement: number
}

export const DEFAULT_CURSOR_FIELD: CursorFieldOptions = {
  radius: 180,
  softening: 24,
  strength: 6,
  maxDisplacement: 10,
}

export interface Displacement {
  readonly dx: number
  readonly dy: number
}

export const NO_DISPLACEMENT: Displacement = { dx: 0, dy: 0 }

/**
 * Displacement applied to a particle at (px, py) by a pointer at (cx, cy).
 *
 * Positive displacement points away from the pointer — the particles are
 * pushed aside rather than pulled in, which reads as the cursor having
 * presence without appearing to collect debris.
 */
export function cursorDisplacement(
  px: number,
  py: number,
  cx: number,
  cy: number,
  options: CursorFieldOptions = DEFAULT_CURSOR_FIELD,
): Displacement {
  const dx = px - cx
  const dy = py - cy
  const distance = Math.hypot(dx, dy)

  if (distance >= options.radius) return NO_DISPLACEMENT

  // Exactly under the pointer there is no direction to push in; returning
  // zero is the only stable answer and avoids dividing by zero below.
  if (distance === 0) return NO_DISPLACEMENT

  const effective = Math.max(distance, options.softening)
  const falloff = (options.softening / effective) ** 2

  // Taper to zero at the radius so a particle crossing the boundary does not
  // visibly snap back into place.
  const edge = 1 - distance / options.radius
  const magnitude = clamp(options.strength * falloff * edge, 0, options.maxDisplacement)

  return { dx: (dx / distance) * magnitude, dy: (dy / distance) * magnitude }
}
