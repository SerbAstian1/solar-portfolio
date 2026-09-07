import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from '../ErrorBoundary'

/**
 * The point of this detection is the message the visitor is shown. A chunk
 * that never arrived is not a bug in the page and is fixed by reloading;
 * telling someone "something went wrong" for it invites them to conclude their
 * own machine is at fault and go away.
 */
describe('chunk load detection', () => {
  // Verbatim from the engines. None of them subclass anything identifiable,
  // so the wording is all there is to match on.
  const CHUNK_ERRORS = [
    'Failed to fetch dynamically imported module: https://x/assets/SolarSystem-D8JFNcHU.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Loading chunk 42 failed.',
  ]

  it('recognises every engine’s wording', () => {
    for (const message of CHUNK_ERRORS) {
      expect(isChunkLoadError(new Error(message))).toBe(true)
    }
  })

  it('recognises it by error name too', () => {
    const err = new Error('anything')
    err.name = 'ChunkLoadError'
    expect(isChunkLoadError(err)).toBe(true)
  })

  it('does not claim ordinary bugs are network failures', () => {
    // The dangerous direction: a real bug reported as "reload and it will be
    // fine" sends the visitor in a loop and hides the fault.
    for (const message of [
      "Cannot read properties of undefined (reading 'x')",
      'planet is not a function',
      'Maximum update depth exceeded',
      'WebGL context lost',
    ]) {
      expect(isChunkLoadError(new Error(message))).toBe(false)
    }
  })

  it('survives being handed something that is not an Error', () => {
    // Anything can be thrown in JavaScript, and a boundary that itself throws
    // while deciding what to say leaves the blank page it exists to prevent.
    expect(() => isChunkLoadError('a string')).not.toThrow()
    expect(() => isChunkLoadError(null)).not.toThrow()
    expect(() => isChunkLoadError(undefined)).not.toThrow()
    expect(() => isChunkLoadError({ weird: true })).not.toThrow()
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError('Loading chunk 3 failed')).toBe(true)
  })
})
