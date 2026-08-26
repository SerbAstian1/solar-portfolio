/** Shared easing + phase timing for planet navigation transitions.
 *
 *  Generic interpolation lives in src/orbital/interpolation.ts; this module
 *  is only the transition's five-phase schedule. `lerp` is re-exported so the
 *  scene has one import for it rather than two definitions. */
export { lerp } from '../orbital/interpolation'

export const EASE_OUT = (t: number): number => 1 - (1 - t) ** 3

/**
 * The opening sequence, in milliseconds.
 *
 * Roughly halved from 1675ms total. The old schedule spent 1125ms on camera
 * work before the panel was allowed to start appearing, and then 450ms
 * animating it — about 1.6 seconds from click to a line the visitor could
 * read. That is past the point where a transition stops reading as motion and
 * starts reading as latency: the common reference points are ~400ms for an
 * interaction that still feels immediate and ~1s for one that keeps the
 * visitor's train of thought, and 1.6s cleared both.
 *
 * The flight is kept, because it is what makes this a solar system rather than
 * a set of tabs — it is just no longer paid for twice, once in camera time and
 * again in a panel that waits for the camera to finish.
 */
export const TIMINGS = {
  /** Click acknowledgement. Must read as instant, so it is barely a phase. */
  HIGHLIGHT: 50,
  /** The camera flying in. */
  APPROACH: 260,
  /** The system shifting aside to make room for the panel. */
  REPOSITION: 180,
  /** The panel settling. */
  PANEL: 180,
  SETTLE: 100,
} as const

export const TOTAL_OPEN =
  TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION + TIMINGS.PANEL + TIMINGS.SETTLE

/**
 * Closing runs at 0.62 of the opening duration.
 *
 * Exits should outpace entrances: opening is a reveal the visitor is waiting to
 * watch, closing is a decision they have already made and now want out of the
 * way. Symmetry here felt like the interface arguing. The old build ran both
 * at the same 1675ms, and because the panel hid within the first 200ms of it,
 * closing meant a fifth of a second of feedback followed by nearly a second
 * and a half of locked input while the camera flew home.
 */
export const CLOSE_SCALE = 0.62
export const TOTAL_CLOSE = Math.round(TOTAL_OPEN * CLOSE_SCALE)

/** Normalized phase boundaries (0–1) for the opening sequence. */
export const OPEN_PHASES = {
  highlight: TIMINGS.HIGHLIGHT / TOTAL_OPEN,
  approach: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH) / TOTAL_OPEN,
  reposition: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION) / TOTAL_OPEN,
  panel: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION + TIMINGS.PANEL) / TOTAL_OPEN,
  settled: 1,
} as const

/** Map overall progress to a local 0–1 value within a phase range. */
export function phaseProgress(t: number, start: number, end: number): number {
  if (t <= start) return 0
  if (t >= end) return 1
  return EASE_OUT((t - start) / (end - start))
}
