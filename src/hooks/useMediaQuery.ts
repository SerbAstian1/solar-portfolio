import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribes to a media query.
 *
 * useSyncExternalStore rather than useState+useEffect because the first
 * paint must already know the answer: this value decides whether the 3D
 * scene mounts at all, and a false-then-true flip would fetch the scene
 * chunk on phones — the exact cost this hook exists to avoid.
 *
 * getServerSnapshot returns false so prerendered HTML (Phase 08) emits the
 * lightweight branch and lets the client upgrade.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Matches the 820px breakpoint the stylesheet already uses. */
export const DESKTOP_QUERY = '(min-width: 821px)'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * True when the visitor has asked the operating system for less motion.
 *
 * The scene is a full-viewport field of moving objects, which is the exact
 * case this preference exists for, so it gates orbital motion and axial spin
 * as well as the camera.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY)
}
