import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  inkContrast,
  normaliseHex,
  parseHex,
  readableInk,
  relativeLuminance,
} from '../color'

describe('reading a hex a designer typed', () => {
  it('accepts the forms people actually write', () => {
    const expected = { r: 235, g: 94, b: 40 }
    for (const form of ['#EB5E28', 'EB5E28', '#eb5e28', '  #EB5E28  ', 'eB5e28']) {
      expect(parseHex(form)).toEqual(expected)
    }
  })

  it('expands three-digit shorthand the way CSS does', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHex('#e52')).toEqual({ r: 238, g: 85, b: 34 })
  })

  it('returns null rather than guessing at a typo', () => {
    // A bad value in the content file should cost one swatch, not the page.
    for (const bad of ['', '#', 'orange', '#12345', '#gggggg', '#1234567', 'rgb(1,2,3)']) {
      expect(parseHex(bad)).toBeNull()
    }
  })

  it('normalises two spellings of one colour to the same string', () => {
    expect(normaliseHex('#eb5e28')).toBe('#EB5E28')
    expect(normaliseHex('EB5E28')).toBe('#EB5E28')
    expect(normaliseHex('#fff')).toBe('#FFFFFF')
    expect(normaliseHex('nope')).toBeNull()
  })
})

describe('luminance and contrast', () => {
  it('puts black at 0 and white at 1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 9)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 9)
  })

  it('gives the full 21:1 between black and white', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 6)
  })

  it('is symmetric', () => {
    const a = { r: 235, g: 94, b: 40 }
    const b = { r: 20, g: 40, b: 90 }
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 12)
  })

  it('agrees with the brand colour’s known ratio on black', () => {
    // The value the palette decision was re-checked against.
    expect(contrastRatio({ r: 235, g: 94, b: 40 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(6.16, 1)
  })
})

describe('picking legible ink for an arbitrary swatch', () => {
  it('puts dark ink on pale colours and light ink on deep ones', () => {
    expect(readableInk('#FFFFFF')).toBe('#000000')
    expect(readableInk('#FFE9A8')).toBe('#000000')
    expect(readableInk('#000000')).toBe('#FFFFFF')
    expect(readableInk('#14284F')).toBe('#FFFFFF')
  })

  it('never picks the worse of the two', () => {
    // The property that matters: whatever the colour, the ink chosen is the
    // one with more contrast. This is what lets any client palette render.
    const samples = ['#EB5E28', '#7F7F7F', '#808080', '#123456', '#ABCDEF', '#010101', '#FEFEFE']
    for (const hex of samples) {
      const ink = readableInk(hex)
      const rgb = parseHex(hex)!
      const chosen = contrastRatio(rgb, parseHex(ink)!)
      const other = contrastRatio(rgb, parseHex(ink === '#000000' ? '#FFFFFF' : '#000000')!)
      expect(chosen).toBeGreaterThanOrEqual(other)
    }
  })

  it('always reaches AA for large text on any colour', () => {
    // The worst case is a mid-grey. Even there the better ink clears 3:1, so a
    // swatch label is never illegible whatever palette arrives.
    for (let v = 0; v <= 255; v += 1) {
      const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`
      expect(inkContrast(hex)).toBeGreaterThanOrEqual(3)
    }
  })

  it('falls back to white ink on an unreadable value', () => {
    expect(readableInk('not-a-colour')).toBe('#FFFFFF')
  })
})
