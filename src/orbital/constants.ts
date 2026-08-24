/**
 * Orientation of the shared orbital plane, and the scale anchors that tie
 * every body's period to its distance.
 *
 * These were established in the original scene and are preserved exactly —
 * they are what makes the system read as one coherent space rather than five
 * unrelated rings.
 */

/**
 * Sine of the angle between the orbital plane and the view plane. Steep
 * enough that every orbit reads as an ellipse rather than a flat line, which
 * means only the innermost planet ever crosses the star's disc — the outer
 * ones pass above and below it, the way an inclined view of a real system does.
 */
export const ORBIT_TILT = 0.38
export const ORBIT_DEPTH = Math.sqrt(1 - ORBIT_TILT ** 2)

/**
 * The star sits at one focus of each ellipse, so an eccentric orbit is offset
 * from centre. Sharing one perihelion direction keeps the rings near
 * concentric instead of pinching together on one side.
 */
export const PERIHELION = 0.6
export const PERIHELION_COS = Math.cos(PERIHELION)
export const PERIHELION_SIN = Math.sin(PERIHELION)

/** Kepler's third law is anchored on the innermost orbit: a body at
 *  BASE_SEMI_MAJOR completes one revolution in BASE_PERIOD seconds. */
export const BASE_SEMI_MAJOR = 170
export const BASE_PERIOD = 48

/** Newton iterations used to invert Kepler's equation. Three converges past
 *  float precision at e < 0.1; see the drift test. */
export const KEPLER_ITERATIONS = 3

export const TAU = Math.PI * 2
