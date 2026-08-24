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
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
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
