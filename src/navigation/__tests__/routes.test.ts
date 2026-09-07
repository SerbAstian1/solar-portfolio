import { describe, expect, it } from 'vitest'
import { PLANETS } from '../../data/planets'
import { getBody } from '../../orbital'
import { HOME_PATH, SECTION_PATHS, isUnknownPath, pathForSection, sectionForPath } from '../routes'

describe('section paths', () => {
  it('round-trips every section', () => {
    for (const planet of PLANETS) {
      expect(sectionForPath(pathForSection(planet.id))).toBe(planet.id)
    }
  })

  it('maps the overview to the root path and back', () => {
    expect(pathForSection(null)).toBe(HOME_PATH)
    expect(sectionForPath(HOME_PATH)).toBeNull()
    expect(sectionForPath('')).toBeNull()
  })

  it('tolerates trailing and duplicated slashes', () => {
    expect(sectionForPath('/work/')).toBe('work')
    expect(sectionForPath('//work//')).toBe('work')
    expect(sectionForPath('///')).toBeNull()
  })

  it('rejects paths that name no section rather than falling back silently', () => {
    // A deep link to /nope must be detectable, not quietly rendered as the
    // overview at a URL that lies about what is on screen.
    expect(sectionForPath('/nope')).toBeNull()
    expect(isUnknownPath('/nope')).toBe(true)
    expect(isUnknownPath(HOME_PATH)).toBe(false)
    expect(isUnknownPath('/work')).toBe(false)
  })

  it('exposes one path per section, all unique', () => {
    expect(SECTION_PATHS).toHaveLength(PLANETS.length)
    expect(new Set(SECTION_PATHS).size).toBe(PLANETS.length)
  })

  it('produces URL-safe paths needing no encoding', () => {
    for (const path of SECTION_PATHS) {
      expect(encodeURI(path)).toBe(path)
      expect(path).toMatch(/^\/[a-z0-9-]+$/)
    }
  })
})

describe('routes and orbital bodies agree', () => {
  // The two tables are keyed by the same ids and drift apart silently if
  // nobody checks: a section with no body cannot be framed by the camera.
  it('gives every routable section an orbital body', () => {
    for (const planet of PLANETS) {
      expect(getBody(planet.id), `no orbital body for section "${planet.id}"`).toBeDefined()
    }
  })

  it('gives every section content for its panel', () => {
    for (const planet of PLANETS) {
      expect(planet.panel.title.length).toBeGreaterThan(0)
      expect(planet.label.length).toBeGreaterThan(0)
    }
  })
})

/**
 * Unknown paths. These used to be rewritten to "/" on mount, which meant a
 * mistyped or rotted link silently showed the overview — the visitor was never
 * told the address was wrong. They are now reported so the 404 can render, and
 * the URL is left exactly as it arrived.
 */
describe('unknown paths', () => {
  it('knows every real section is not unknown', () => {
    for (const path of SECTION_PATHS) {
      expect(isUnknownPath(path)).toBe(false)
    }
  })

  it('treats the overview as known, not as a 404', () => {
    expect(isUnknownPath('/')).toBe(false)
    expect(isUnknownPath('')).toBe(false)
    // A trailing slash is the same place, not a different one.
    expect(isUnknownPath('//')).toBe(false)
  })

  it('flags a path that names nothing', () => {
    for (const path of ['/nope', '/wrok', '/work-2', '/about/team', '/WORK ']) {
      expect(isUnknownPath(path)).toBe(true)
    }
  })

  it('is case sensitive, matching the URLs actually published', () => {
    // The sitemap and every internal link emit lowercase ids. Accepting
    // "/Work" would serve one page at two addresses and split its ranking.
    expect(isUnknownPath('/Work')).toBe(true)
    expect(isUnknownPath('/work')).toBe(false)
  })

  it('never resolves an unknown path to a section', () => {
    // The two must agree: anything flagged unknown has to have no section, or
    // the app would render a section at a URL it has called a 404.
    for (const path of ['/nope', '/x', '/work/extra']) {
      expect(isUnknownPath(path)).toBe(true)
      expect(sectionForPath(path)).toBeNull()
    }
  })
})
