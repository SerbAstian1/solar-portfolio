import { useCallback, useEffect, useRef, useState } from 'react'
import { isUnknownPath, pathForSection, sectionForPath } from './routes'

export interface RouteSection {
  /** Currently routed section id, or null at the overview. */
  sectionId: string | null
  /** True when the path names no section that exists. */
  notFound: boolean
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
  const [notFound, setNotFound] = useState(() =>
    typeof window === 'undefined' ? false : isUnknownPath(window.location.pathname),
  )

  // Avoids pushing a history entry for a navigation that popstate just told
  // us about, which would otherwise trap the back button.
  const suppressPush = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      suppressPush.current = true
      setSectionId(sectionForPath(window.location.pathname))
      setNotFound(isUnknownPath(window.location.pathname))
      suppressPush.current = false
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /* A bad path used to be rewritten to "/" on mount, which swapped one
     dishonesty for another: the URL stopped lying, and the page then showed
     the overview as though nothing had happened. A visitor who mistyped a
     link, or followed one that had rotted, was told nothing at all.

     The path is left exactly as it arrived and reported as not found. It stays
     shareable and reportable, the back button still goes where it should, and
     the first correct navigation clears the state. */

  const go = useCallback((id: string | null, mode: 'push' | 'replace') => {
    const path = pathForSection(id)
    if (window.location.pathname !== path && !suppressPush.current) {
      if (mode === 'push') window.history.pushState(null, '', path)
      else window.history.replaceState(null, '', path)
    }
    setSectionId(id)
    // Any deliberate navigation lands somewhere real by construction.
    setNotFound(false)
  }, [])

  return {
    sectionId,
    notFound,
    navigate: useCallback((id: string | null) => go(id, 'push'), [go]),
    replace: useCallback((id: string | null) => go(id, 'replace'), [go]),
  }
}
