import { CLEAR_TRANSIT, type Occultation } from './occultation'

/**
 * What the scene knows, published for surfaces outside the canvas to read.
 *
 * A module singleton rather than context or props, for two reasons. The
 * transit figure is recomputed every frame, and routing it through React state
 * would re-render the scene sixty times a second to update a line of text
 * beneath it. And the reader — the telemetry strip — lives outside the lazily
 * loaded scene chunk, so there is no shared provider to hang a context on
 * without pulling the strip inside the boundary or the scene outside it.
 *
 * The contract is deliberately one-way: the scene writes, everything else
 * reads and polls at whatever rate suits it. Nothing here should ever be read
 * during render — poll it on a timer and set state from that, or the value
 * changes under React without React knowing.
 */
export interface SceneTelemetry {
  /** False before the scene mounts and after it unmounts — the strip has to
   *  cope with both, since the scene never mounts at all on small viewports. */
  active: boolean
  /** The scene clock, in seconds since the canvas mounted. */
  elapsed: number
  /** Combined transit across every body, as the star sees it. */
  transit: Occultation
}

export const sceneTelemetry: SceneTelemetry = {
  active: false,
  elapsed: 0,
  transit: CLEAR_TRANSIT,
}

/** Called by the scene each frame. */
export function publishTelemetry(elapsed: number, transit: Occultation): void {
  sceneTelemetry.active = true
  sceneTelemetry.elapsed = elapsed
  sceneTelemetry.transit = transit
}

/** Called when the scene unmounts, so stale numbers cannot outlive it. */
export function clearTelemetry(): void {
  sceneTelemetry.active = false
  sceneTelemetry.elapsed = 0
  sceneTelemetry.transit = CLEAR_TRANSIT
}
