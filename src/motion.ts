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
  content: 0.3,
  /** Scrims and overlays. */
  scrim: 0.35,
  /** The panel itself entering. */
  panel: 0.45,
} as const
