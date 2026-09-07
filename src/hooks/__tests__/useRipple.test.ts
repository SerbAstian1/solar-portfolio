import { describe, expect, it } from 'vitest'
import { rippleRadius } from '../useRipple'

/**
 * The radius decides whether a press reads as the surface responding or as a
 * bubble appearing on it. Too small and the circle stops short of the far
 * corner and dies mid-button.
 */
describe('ripple radius', () => {
  it('reaches the far corner from a press in the middle', () => {
    // 200x100 pressed dead centre: half-diagonal, hypot(100, 50).
    expect(rippleRadius(200, 100, 100, 50)).toBeCloseTo(Math.hypot(100, 50), 9)
  })

  it('reaches the far corner from a press in a corner', () => {
    // Pressed at the origin, the furthest point is the opposite corner — the
    // full diagonal, not half of it.
    expect(rippleRadius(200, 100, 0, 0)).toBeCloseTo(Math.hypot(200, 100), 9)
    expect(rippleRadius(200, 100, 200, 100)).toBeCloseTo(Math.hypot(200, 100), 9)
  })

  it('always covers every corner, wherever it is pressed', () => {
    // The property that matters, checked directly rather than by example: from
    // any press point the radius is at least the distance to all four corners.
    const w = 173, h = 91
    for (let x = 0; x <= w; x += 7) {
      for (let y = 0; y <= h; y += 7) {
        const r = rippleRadius(w, h, x, y)
        const corners: ReadonlyArray<readonly [number, number]> = [
          [0, 0], [w, 0], [0, h], [w, h],
        ]
        for (const [cx, cy] of corners) {
          expect(r + 1e-9).toBeGreaterThanOrEqual(Math.hypot(cx - x, cy - y))
        }
      }
    }
  })

  it('is smallest from the centre and largest from a corner', () => {
    const centre = rippleRadius(200, 100, 100, 50)
    const corner = rippleRadius(200, 100, 0, 0)
    expect(centre).toBeLessThan(corner)
  })

  it('handles a degenerate element without producing a negative radius', () => {
    expect(rippleRadius(0, 0, 0, 0)).toBe(0)
    expect(rippleRadius(10, 0, 5, 0)).toBeGreaterThanOrEqual(0)
  })

  it('copes with a press outside the element', () => {
    // Pointer capture and fast drags can report coordinates past the edge; the
    // radius must still cover the element rather than going backwards.
    const r = rippleRadius(100, 50, -20, -10)
    expect(r).toBeGreaterThanOrEqual(Math.hypot(120, 60) - 1e-9)
  })
})
