import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from './useMediaQuery'

export interface Scramble {
  display: string
  isScrambling: boolean
  start: () => void
  reset: () => void
}

/**
 * The pool an unresolved character is drawn from: letters only.
 *
 * Split by case so a column resolving into a capital churns through capitals
 * and a lowercase one through lowercase. Drawing from a single mixed pool made
 * the label flicker between cap-heights, which reads as the text jumping
 * rather than as it resolving.
 *
 * Anything in the label that is not a letter — a digit, an ampersand — is
 * scrambled with lowercase, since there is no case to match.
 */
export const LETTERS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const LETTERS_LOWER = 'abcdefghijklmnopqrstuvwxyz'

/** The pool that stands in for a given character. */
export function poolFor(char: string): string {
  return char >= 'A' && char <= 'Z' ? LETTERS_UPPER : LETTERS_LOWER
}

/** Milliseconds between one character settling and the next. */
export const STAGGER_MS = 34
/** Milliseconds a character stays scrambled before it settles. */
export const SCRAMBLE_MS = 170
/** How long a single random glyph is held before the next one replaces it. */
export const GLYPH_HOLD_MS = 34

/** When the whole label has finished resolving. */
export function scrambleDuration(fullText: string): number {
  if (fullText.length === 0) return 0
  return (fullText.length - 1) * STAGGER_MS + SCRAMBLE_MS
}

/**
 * The label as it should read at a given moment — the entire animation as one
 * pure function of elapsed time.
 *
 * Time-based rather than frame-based on purpose. Counting frames ties the
 * speed of the effect to the refresh rate, so the same button resolves in
 * half the time on a 120Hz display; elapsed milliseconds look identical on
 * both.
 *
 * `offsets` seeds each character's glyph cycle so the columns do not all
 * change to the same symbol on the same tick, which is what makes a scramble
 * read as noise rather than as a marquee.
 */
export function scrambleFrame(
  fullText: string,
  elapsedMs: number,
  offsets: readonly number[],
): string {
  const step = Math.floor(elapsedMs / GLYPH_HOLD_MS)
  let out = ''
  for (let i = 0; i < fullText.length; i += 1) {
    const char = fullText[i]!
    // Whitespace is load-bearing for word shape: scrambling it makes the
    // label wobble between word counts instead of resolving in place.
    if (char === ' ') {
      out += char
      continue
    }
    if (elapsedMs >= i * STAGGER_MS + SCRAMBLE_MS) {
      out += char
    } else {
      const pool = poolFor(char)
      out += pool[((offsets[i] ?? 0) + step) % pool.length]
    }
  }
  return out
}

/**
 * Resolves a string out of noise on hover and focus.
 *
 * Intended for the inner label span of a button only. The container's border,
 * padding and hit area never re-render with it, so the button cannot jump or
 * resize while the text churns.
 */
export function useScramble(fullText: string): Scramble {
  const [display, setDisplay] = useState(fullText)
  const [isScrambling, setIsScrambling] = useState(false)
  const rafRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()

  const duration = useMemo(() => scrambleDuration(fullText), [fullText])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    stop()
    // Text that churns before it settles is precisely what this preference is
    // for. Honour it by showing the resolved string and running nothing.
    if (reducedMotion || fullText.length === 0) {
      setDisplay(fullText)
      setIsScrambling(false)
      return
    }

    const offsets = Array.from({ length: fullText.length }, () =>
      Math.floor(Math.random() * LETTERS_UPPER.length),
    )
    const began = performance.now()
    setIsScrambling(true)

    /* The glyph only changes every GLYPH_HOLD_MS, so most frames produce the
       string the last one did. Emitting it anyway would re-render the button
       sixty times a second to paint the same pixels. */
    let previous = ''
    const tick = (now: number) => {
      const elapsed = now - began
      const next = scrambleFrame(fullText, elapsed, offsets)
      if (next !== previous) {
        previous = next
        setDisplay(next)
      }
      if (elapsed >= duration) {
        rafRef.current = null
        setDisplay(fullText)
        setIsScrambling(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [duration, fullText, reducedMotion, stop])

  const reset = useCallback(() => {
    stop()
    setIsScrambling(false)
    setDisplay(fullText)
  }, [fullText, stop])

  // The loop outlives the component without this.
  useEffect(() => stop, [stop])

  return { display, isScrambling, start, reset }
}
