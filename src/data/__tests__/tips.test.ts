import { describe, expect, it } from 'vitest'
import { MAX_TIP_LENGTH, TIPS } from '../tips'

describe('the tip deck', () => {
  it('holds exactly a hundred tips', () => {
    expect(TIPS).toHaveLength(100)
  })

  it('fits every tip on the rail’s single line', () => {
    // The rail does not wrap and will not truncate, so length is a hard
    // constraint on the content rather than a style preference.
    const tooLong = TIPS.filter((t) => t.text.length > MAX_TIP_LENGTH)
    expect(tooLong.map((t) => `${t.text.length}: ${t.text}`)).toEqual([])
  })

  it('repeats no tip', () => {
    const seen = TIPS.map((t) => t.text.toLowerCase())
    expect(new Set(seen).size).toBe(TIPS.length)
  })

  it('gives every tip actual content', () => {
    for (const tip of TIPS) {
      expect(tip.text.trim()).toBe(tip.text)
      expect(tip.text.length).toBeGreaterThan(12)
    }
  })

  it('ends every tip with a full stop', () => {
    // They are set as statements, and one stray missing stop reads as a typo
    // on a rail where only one line is visible at a time.
    for (const tip of TIPS) expect(tip.text.endsWith('.')).toBe(true)
  })

  it('uses typographic apostrophes, never the straight one', () => {
    // The rest of the site sets real quotation marks; a straight apostrophe
    // here would be the only one on the page.
    for (const tip of TIPS) expect(tip.text).not.toContain("'")
  })

  it('attributes some tips, and leaves the rest unsigned', () => {
    const attributed = TIPS.filter((t) => t.source)
    // Sanity in both directions: an empty set would mean the quotations lost
    // their sources, and a full one would mean principles got invented
    // authors — which is the failure this data is shaped to avoid.
    expect(attributed.length).toBeGreaterThan(8)
    expect(attributed.length).toBeLessThan(TIPS.length / 2)
  })

  it('never leaves a source blank rather than absent', () => {
    for (const tip of TIPS) {
      if ('source' in tip) expect(tip.source?.trim()).toBeTruthy()
    }
  })
})
