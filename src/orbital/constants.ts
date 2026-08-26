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
 *
 * This is the shared plane. Work overrides it with a shallower value, which
 * is what lets it reach the disk at all; see the table in elements.ts for why
 * the others cannot follow without flattening the system toward a line.
 */
export const ORBIT_TILT = 0.38

/**
 * Sense of travel around the star, as the viewer sees it: −1 clockwise on
 * screen, +1 anticlockwise.
 *
 * It multiplies the minor-axis term, which traverses the same ellipse — same
 * focus, same perihelion direction, same radius at every eccentric anomaly —
 * in the opposite sense. So it changes only the direction of travel, and
 * Kepler's second law survives it untouched.
 *
 * It also fixes the axial spin: the orbital angular momentum points along +y,
 * the same way as the spin, so the planets rotate prograde. The other sense
 * had them all turning backwards against their own orbits.
 *
 * Note that this is the sense of travel *in the orbital plane*, not the sense
 * the viewer sees on screen. DEPTH_TO_SCREEN_Y below mirrors the vertical
 * axis, so the same motion reads anticlockwise in the frame.
 */
export const ORBIT_DIRECTION = -1
/**
 * Which way depth maps to the screen's vertical axis.
 *
 * -1 sends the near half of every orbit to the *bottom* of the frame, which is
 * what a camera sitting above the orbital plane sees. It was +1, putting the
 * near half at the top — geometrically self-consistent, but it placed the
 * camera below the plane, and that is the wrong way up for a solar system:
 * transits happened across the top of the star and occultations beneath it,
 * the inverse of the canonical view-from-north depiction everyone recognises.
 *
 * What follows from this, and is what the transit code is written against: a
 * body is in front of the star exactly when it is in the *lower* half of the
 * screen, because y now carries the opposite sign to the depth coordinate. So
 * transits cross the bottom of the disk left to right, and occultations pass
 * above it right to left.
 *
 * This is a reflection of the vertical axis only. It leaves x and z untouched,
 * so it changes neither which bodies are in front nor when — the transit still
 * peaks 15s after load — and it cannot affect the axial spin, whose angular
 * momentum lives entirely in the x-z plane. What it does change is the sense
 * the viewer sees: the same prograde orbits now read anticlockwise on screen,
 * which together with the near side at the bottom is exactly the view from
 * above the system's north pole.
 */
export const DEPTH_TO_SCREEN_Y = -1

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
