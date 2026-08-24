import { useCallback, useEffect, useRef, useState } from 'react'
import { HOME_PATH, isUnknownPath, pathForSection, sectionForPath } from './routes'

export interface RouteSection {
  /** Currently routed section id, or null at the overview. */
  sectionId: string | null
  /** Navigate, pushing a history entry. */
  navigate: (id: string | null) => void
  /** Navigate without adding history — used to correct a bad URL on load. */
  replace: (id: string | null) => void
}

/**
 * Binds the URL to the selected section using the History API directly.
 *
 * Not react-router: this site is one continuous WebGL scene, and a router
 * whose central feature is swapping route subtrees would need the scene to
 * live outside it anyway. Five flat routes, no nested layouts and no data
 * loading leaves nothing for a router to do here except add a dependency
 * and a second opinion about ownership. If nested project routes ever need
 * their own layouts, that is the moment to reconsider.
 */
export function useRouteSection(): RouteSection {
  const [sectionId, setSectionId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : sectionForPath(window.location.pathname),
  )

  // Avoids pushing a history entry for a navigation that popstate just told
  // us about, which would otherwise trap the back button.
  const suppressPush = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      suppressPush.current = true
      setSectionId(sectionForPath(window.location.pathname))
      suppressPush.current = false
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // A deep link to a section that does not exist should not silently render
  // the overview at a lying URL.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isUnknownPath(window.location.pathname)) {
      window.history.replaceState(null, '', HOME_PATH)
    }
  }, [])

  const go = useCallback((id: string | null, mode: 'push' | 'replace') => {
    const path = pathForSection(id)
    if (window.location.pathname !== path && !suppressPush.current) {
      if (mode === 'push') window.history.pushState(null, '', path)
      else window.history.replaceState(null, '', path)
    }
    setSectionId(id)
  }, [])

  return {
    sectionId,
    navigate: useCallback((id: string | null) => go(id, 'push'), [go]),
    replace: useCallback((id: string | null) => go(id, 'replace'), [go]),
  }
}
