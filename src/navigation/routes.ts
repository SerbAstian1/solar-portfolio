import { PLANETS } from '../data/planets'

/**
 * The URL is the single source of truth for which section is open.
 *
 * Selection writes pushState; popstate writes selection; the camera reads
 * selection. Back, forward, refresh and deep links then work by construction
 * rather than by patching each one individually.
 */

export const HOME_PATH = '/'

/** Section ids are already URL-safe, so the slug is the id. Kept as a pair of
 *  functions anyway so a future rename cannot desynchronise the two halves. */
export function pathForSection(id: string | null): string {
  return id === null ? HOME_PATH : `/${id}`
}

export function sectionForPath(pathname: string): string | null {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  if (slug === '') return null
  return PLANETS.some((planet) => planet.id === slug) ? slug : null
}

/** True when the path names no real section — used to decide whether to
 *  correct the URL rather than silently render the overview at a bad path. */
export function isUnknownPath(pathname: string): boolean {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  return slug !== '' && !PLANETS.some((planet) => planet.id === slug)
}

export const SECTION_PATHS: readonly string[] = PLANETS.map((planet) => pathForSection(planet.id))
