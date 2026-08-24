import { useMediaQuery } from './useMediaQuery'

/**
 * How much of the spatial interface this viewport gets.
 *
 * Not a scaled-down desktop universe. Shrinking the whole system to fit a
 * phone yields 8px planets nobody can hit and labels nobody can read, so
 * below the scene threshold the metaphor is dropped for a list rather than
 * rendered badly.
 *
 *   full    >= 1024px  every label drawn; the system is the page
 *   compact  640-1023  labels on demand only, so a tighter system stays legible
 *   list      < 640px  no scene at all — and no WebGL context, no models
 */
export type SpatialMode = 'full' | 'compact' | 'list'

export const FULL_QUERY = '(min-width: 1024px)'
export const SCENE_QUERY = '(min-width: 640px)'

export function useSpatialMode(): SpatialMode {
  const isFull = useMediaQuery(FULL_QUERY)
  const hasScene = useMediaQuery(SCENE_QUERY)
  if (isFull) return 'full'
  return hasScene ? 'compact' : 'list'
}
