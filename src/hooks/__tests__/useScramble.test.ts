import { describe, expect, it } from 'vitest'
import {
  LETTERS_LOWER,
  LETTERS_UPPER,
  SCRAMBLE_MS,
  STAGGER_MS,
  scrambleDuration,
  scrambleFrame,
} from '../useScramble'

const LABEL = 'Start a project'
/** Any fixed seed; the frame function is pure given one. */
const offsets = Array.from({ length: LABEL.length }, (_, i) => i * 3)

const at = (ms: number) => scrambleFrame(LABEL, ms, offsets)

describe('scramble frames', () => {
  it('never changes the length of the label', () => {
    for (let ms = 0; ms <= scrambleDuration(LABEL) + 100; ms += 7) {
      expect(at(ms).length).toBe(LABEL.length)
    }
  })

  it('holds every space in place', () => {
    // Word shape is what makes a label recognisable while it resolves; a
    // scrambled space makes it look like a different number of words.
    const spaces = [...LABEL].flatMap((c, i) => (c === ' ' ? [i] : []))
    expect(spaces.length).toBeGreaterThan(0)
    for (let ms = 0; ms <= scrambleDuration(LABEL); ms += 11) {
      for (const i of spaces) expect(at(ms)[i]).toBe(' ')
    }
  })

  it('is fully scrambled at the start, apart from spaces', () => {
    const frame = at(0)
    for (let i = 0; i < LABEL.length; i += 1) {
      if (LABEL[i] === ' ') continue
      expect(LETTERS_UPPER + LETTERS_LOWER).toContain(frame[i]!)
    }
  })

  it('substitutes letters only — never a digit or a symbol', () => {
    for (let ms = 0; ms <= scrambleDuration(LABEL); ms += 3) {
      expect(at(ms)).toMatch(/^[A-Za-z ]*$/)
    }
  })

  it('matches the case of the character it stands in for', () => {
    // A capital churning through lowercase makes the label jump cap-height.
    for (let ms = 0; ms < SCRAMBLE_MS; ms += 5) {
      const frame = at(ms)
      for (let i = 0; i < LABEL.length; i += 1) {
        const target = LABEL[i]!
        if (target === ' ') continue
        const isUpper = target >= 'A' && target <= 'Z'
        expect(isUpper ? LETTERS_UPPER : LETTERS_LOWER).toContain(frame[i]!)
      }
    }
  })

  it('has fully resolved once the stated duration has passed', () => {
    expect(at(scrambleDuration(LABEL))).toBe(LABEL)
    expect(at(scrambleDuration(LABEL) + 500)).toBe(LABEL)
  })

  it('settles left to right, never unsettling a character again', () => {
    let previous = 0
    // Sample past the end: the final character settles exactly at the stated
    // duration, which a stride of 5 from zero steps over rather than lands on.
    for (let ms = 0; ms <= scrambleDuration(LABEL) + 5; ms += 5) {
      const frame = at(ms)
      // Count the resolved prefix, ignoring spaces which are always correct.
      let settled = 0
      for (let i = 0; i < LABEL.length; i += 1) {
        if (frame[i] !== LABEL[i]) break
        settled = i + 1
      }
      expect(settled).toBeGreaterThanOrEqual(previous)
      previous = settled
    }
    expect(previous).toBe(LABEL.length)
  })

  it('settles each character at its own staggered moment', () => {
    const i = 4
    expect(at(i * STAGGER_MS + SCRAMBLE_MS)[i]).toBe(LABEL[i])
    // One tick earlier that column is still noise.
    expect(at(i * STAGGER_MS + SCRAMBLE_MS - 1)[i]).not.toBe(LABEL[i])
  })

  it('draws only from the glyph set while unresolved', () => {
    const allowed = new Set([...LETTERS_UPPER, ...LETTERS_LOWER, ' '])
    const frame = at(0)
    for (const ch of frame) expect(allowed.has(ch)).toBe(true)
  })

  it('cycles a column through different glyphs as time passes', () => {
    // A column that never changes reads as a typo rather than as noise.
    const seen = new Set<string>()
    for (let ms = 0; ms < SCRAMBLE_MS; ms += 17) seen.add(at(ms)[0]!)
    expect(seen.size).toBeGreaterThan(1)
  })

  it('handles an empty label without work', () => {
    expect(scrambleDuration('')).toBe(0)
    expect(scrambleFrame('', 0, [])).toBe('')
  })
})
