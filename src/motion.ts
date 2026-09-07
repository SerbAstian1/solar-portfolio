/**
 * Motion tokens shared by the JS animation layer.
 *
 * The easing curve was previously written out as the literal
 * [0.16, 1, 0.3, 1] in two component files while an identical curve already
 * existed as --ease-out in CSS — three copies of one decision, which is how a
 * design system quietly stops being true. These are the JS half; the CSS half
 * mirrors them in global.css and the two are asserted equal in the tests.
 */

/** ease-out-expo. Matches --ease-out. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_OUT_EXPO_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** Seconds, for framer-motion. Named by role, not by number, so a change of
 *  pace is one edit rather than a search for every 0.35. */
export const DURATION = {
  /** Hover and press feedback. Matches --dur-hover. */
  feedback: 0.12,
  /** Tooltips and small reveals. */
  hint: 0.22,
  /** In-panel content swaps. */
  content: 0.2,
  /** Scrims and overlays. */
  scrim: 0.2,
  /**
   * Leaving, for the surfaces that have a separate exit.
   *
   * An entrance and an exit were sharing one duration, which reads as a lag on
   * the way out: arriving is a reveal the visitor waits to watch, while
   * leaving is a decision already made and now in the way. These are a little
   * over half the entrance, which is enough to still be motion rather than a
   * cut.
   */
  panelExit: 0.15,
  scrimExit: 0.12,
  /** The panel itself entering. It now overlaps the camera's reposition
   *  rather than following it, so this is the tail of the sequence and not a
   *  further wait added onto the end of it. */
  panel: 0.26,
} as const

/**
 * Springs, for the overlays.
 *
 * The site's overlays were tweened on ease-out-expo, and that curve is the
 * reason they did not feel smooth. It front-loads almost all of its travel,
 * which is the point over 400ms and a liability under 250: the element lurches
 * away, then spends the rest of the time barely moving. It reads as a snap
 * followed by a hesitation rather than as one movement.
 *
 * The stronger reason is interruption. A tween has a fixed start, end and
 * length, so re-triggering it mid-flight restarts from a keyframe and the
 * element jumps. A spring animates from wherever the value actually *is*,
 * carrying its current velocity. That matters here in a place it is easy to
 * observe: dragging the pointer across the planets re-triggers the hover card
 * for each one in turn, and on a tween every re-trigger snapped back to the
 * start. This is the property that makes platform UI feel alive, and it is
 * mostly what "Apple-like" is describing.
 *
 * Every one of these is critically damped — `bounce: 0`. Overshoot belongs to
 * motion that follows a gesture carrying momentum: a flick, a throw, a drag
 * released. Nothing on this site is draggable, so a bounce here would be
 * decoration pretending to be physics.
 *
 * `duration` on a framer spring is its perceptual response, not a fixed
 * length; the true settle runs slightly past it and is what the eye reads as
 * the movement finishing softly rather than stopping dead.
 */
export const SPRING = {
  /** The panel arriving. */
  panel: { type: 'spring', bounce: 0, duration: 0.52 },
  /** Leaving. Shorter, for the reason the exit tween was: an entrance is
   *  watched, an exit is already decided and in the way. */
  panelExit: { type: 'spring', bounce: 0, duration: 0.26 },
  /** The scrim, a touch behind the panel so the two read as one movement
   *  with a leading edge rather than as two things starting at once. */
  scrim: { type: 'spring', bounce: 0, duration: 0.42 },
  scrimExit: { type: 'spring', bounce: 0, duration: 0.22 },
  /** The hover card. Fastest of them: it is chasing a pointer. */
  hint: { type: 'spring', bounce: 0, duration: 0.3 },
  /** In-panel content swaps. */
  content: { type: 'spring', bounce: 0, duration: 0.36 },
} as const
