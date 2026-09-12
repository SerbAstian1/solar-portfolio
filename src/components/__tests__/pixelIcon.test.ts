import { describe, expect, it } from 'vitest'
import { ICON_GRIDS, toPath } from '../PixelIcon'

const GRID = 12

/**
 * The grids are hand-typed ASCII, which is the format's whole advantage and
 * its one hazard: a row with eleven characters instead of twelve shifts every
 * cell after it and is completely invisible in a diff. These assertions are
 * the proofreader.
 */
describe('icon grids', () => {
  const names = Object.keys(ICON_GRIDS) as (keyof typeof ICON_GRIDS)[]

  it('defines every icon the components ask for', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'close',
        'back',
        'external',
        'sent',
        'alert',
        'work',
        'services',
        'about',
        'pricing',
        'contact',
      ]),
    )
  })

  it.each(names)('%s is a square 12x12 grid', (name) => {
    const rows = ICON_GRIDS[name]
    expect(rows).toHaveLength(GRID)
    for (const row of rows) expect(row).toHaveLength(GRID)
  })

  it.each(names)('%s uses only lit and unlit cells', (name) => {
    for (const row of ICON_GRIDS[name]) expect(row).toMatch(/^[.#]+$/)
  })

  it.each(names)('%s actually draws something', (name) => {
    // A grid that is all dots compiles to an empty path and renders as a
    // blank gap the layout still reserves space for.
    expect(toPath(ICON_GRIDS[name])).not.toBe('')
  })
})

/**
 * The compiler merges each run of lit cells into one subpath. If that merging
 * breaks, the icons still render — just as dozens of separate rects per mark,
 * which is the cost the format exists to avoid.
 */
describe('grid to path', () => {
  it('emits nothing for an empty grid', () => {
    expect(toPath(['....', '....'])).toBe('')
  })

  it('merges a run of cells into a single subpath', () => {
    expect(toPath(['.###'])).toBe('M1 0h3v1h-3z')
  })

  it('keeps separated runs on the same row apart', () => {
    expect(toPath(['#.#'])).toBe('M0 0h1v1h-1zM2 0h1v1h-1z')
  })

  it('advances the row index down the grid', () => {
    expect(toPath(['..', '##'])).toBe('M0 1h2v1h-2z')
  })

  it('produces one subpath per run, not one per cell', () => {
    const runs = (toPath(ICON_GRIDS.work).match(/M/g) ?? []).length
    // Eight rows of two four-cell runs. As rects it would have been 64.
    expect(runs).toBe(16)
  })
})
