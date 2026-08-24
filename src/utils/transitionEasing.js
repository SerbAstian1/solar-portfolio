/** Shared easing + timing for planet navigation transitions. */

export const EASE_OUT = (t) => 1 - (1 - t) ** 3

export const TIMINGS = {
  HIGHLIGHT: 125,
  APPROACH: 600,
  REPOSITION: 400,
  PANEL: 350,
  SETTLE: 200,
}

export const TOTAL_OPEN =
  TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION + TIMINGS.PANEL + TIMINGS.SETTLE

/** Normalized phase boundaries (0–1) for the opening sequence. */
export const OPEN_PHASES = {
  highlight: TIMINGS.HIGHLIGHT / TOTAL_OPEN,
  approach: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH) / TOTAL_OPEN,
  reposition: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION) / TOTAL_OPEN,
  panel: (TIMINGS.HIGHLIGHT + TIMINGS.APPROACH + TIMINGS.REPOSITION + TIMINGS.PANEL) / TOTAL_OPEN,
  settled: 1,
}

/** Map overall progress to a local 0–1 value within a phase range. */
export function phaseProgress(t, start, end) {
  if (t <= start) return 0
  if (t >= end) return 1
  return EASE_OUT((t - start) / (end - start))
}

/** Interpolate between two values. */
export function lerp(a, b, t) {
  return a + (b - a) * t
}
