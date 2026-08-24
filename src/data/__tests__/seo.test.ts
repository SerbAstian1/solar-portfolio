import { describe, expect, it } from 'vitest'
import { PLANETS } from '../planets'
import { HOME_SEO, SEO_BY_SECTION, SITE_ORIGIN, seoFor } from '../seo'

const ALL = [['home', HOME_SEO] as const, ...Object.entries(SEO_BY_SECTION)]

describe('search metadata targets', () => {
  // These are external, non-negotiable targets rather than taste. Enforcing
  // them here is what stops the copy drifting past the truncation point the
  // next time someone edits it.
  it.each(ALL)('%s title is 50-60 characters', (_id, seo) => {
    expect(seo.title.length).toBeGreaterThanOrEqual(50)
    expect(seo.title.length).toBeLessThanOrEqual(60)
  })

  it.each(ALL)('%s description is 150-160 characters', (_id, seo) => {
    expect(seo.description.length).toBeGreaterThanOrEqual(150)
    expect(seo.description.length).toBeLessThanOrEqual(160)
  })

  it('leads every title with the brand or the section, not a generic word', () => {
    for (const [, seo] of ALL) {
      expect(seo.title).toMatch(/AW\.|Akagha/)
    }
  })

  it('keeps every title and description unique across routes', () => {
    expect(new Set(ALL.map(([, s]) => s.title)).size).toBe(ALL.length)
    expect(new Set(ALL.map(([, s]) => s.description)).size).toBe(ALL.length)
  })

  it('writes descriptions as sentences, not keyword lists', () => {
    for (const [, seo] of ALL) {
      expect(seo.description.trim()).toMatch(/[.!?]$/)
      // A comma-per-four-words density is the signature of keyword stuffing.
      const words = seo.description.split(/\s+/).length
      const commas = (seo.description.match(/,/g) ?? []).length
      expect(commas).toBeLessThan(words / 4)
    }
  })
})

describe('coverage and resolution', () => {
  it('covers every routable section', () => {
    for (const planet of PLANETS) {
      expect(SEO_BY_SECTION[planet.id], `no metadata for "${planet.id}"`).toBeDefined()
    }
  })

  it('resolves the overview and unknown ids to the home entry', () => {
    expect(seoFor(null)).toBe(HOME_SEO)
    expect(seoFor('not-a-section')).toBe(HOME_SEO)
    expect(seoFor('work')).toBe(SEO_BY_SECTION.work)
  })

  it('uses an absolute https origin with no trailing slash', () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\//)
    expect(SITE_ORIGIN.endsWith('/')).toBe(false)
  })
})
