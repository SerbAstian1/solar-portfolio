import { clamp } from './interpolation'

/**
 * Camera state in world space. The orthographic camera frames the system by
 * moving its centre and changing zoom; nothing else in the scene translates
 * to fake a camera move.
 */
export interface CameraState {
  x: number
  y: number
  zoom: number
}

export type CameraTarget = CameraState

/** Fraction of the free stage a focused body should span. Below ~0.3 the
 *  approach reads as a nudge; above ~0.5 the body crops against the panel. */
const FOCUS_FRACTION = 0.38
const MIN_ZOOM = 1
const MAX_ZOOM = 6
const MIN_STAGE = 240

export const OVERVIEW_TARGET: CameraTarget = { x: 0, y: 0, zoom: 1 }

/**
 * Width the content panel occupies, mirroring the CSS rule
 * `width: min(50vw, 640px); min-width: min(420px, 92vw)`.
 *
 * The camera has to know this: centring a focused planet in the viewport
 * would park it directly behind the panel that describes it.
 */
export function panelWidthFor(viewportWidth: number): number {
  return Math.max(Math.min(viewportWidth * 0.5, 640), Math.min(420, viewportWidth * 0.92))
}

export interface FocusInput {
  /** Body position in world units, before the system-wide scale. */
  worldX: number
  worldY: number
  /** Rendered diameter of the body, before the system-wide scale. */
  bodySize: number
  /** Scale applied to the whole system group to fit the viewport. */
  systemScale: number
  viewportWidth: number
  viewportHeight: number
  /** Pass 0 when no panel is open. */
  panelWidth: number
}

/**
 * Camera centre and zoom that place a body in the middle of the free stage
 * left of the panel.
 *
 * A point at world w sits at w·S in camera space, and its screen offset from
 * the viewport centre is (w·S − c)·Z. Solving for the centre that puts it at
 * a chosen offset d gives c = w·S − d/Z, which is the whole derivation.
 */
export function focusTarget(input: FocusInput): CameraTarget {
  const {
    worldX,
    worldY,
    bodySize,
    systemScale,
    viewportWidth,
    viewportHeight,
    panelWidth,
  } = input

  const stageWidth = Math.max(viewportWidth - panelWidth, MIN_STAGE)
  const stage = Math.min(stageWidth, viewportHeight)

  const scaledDiameter = Math.max(bodySize * systemScale, 1)
  const zoom = clamp((stage * FOCUS_FRACTION) / scaledDiameter, MIN_ZOOM, MAX_ZOOM)

  // Centre of the free stage, as an offset from the viewport centre.
  const offsetX = -panelWidth / 2

  return {
    x: worldX * systemScale - offsetX / zoom,
    y: worldY * systemScale,
    zoom,
  }
}

/** Screen-space offset of a world point under a given camera. Used by tests
 *  to assert framing, and available to any hit-testing that needs it. */
export function projectToScreenOffset(
  worldX: number,
  worldY: number,
  systemScale: number,
  camera: CameraState,
): { x: number; y: number } {
  return {
    x: (worldX * systemScale - camera.x) * camera.zoom,
    y: (worldY * systemScale - camera.y) * camera.zoom,
  }
}
