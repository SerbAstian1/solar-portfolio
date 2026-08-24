import { describe, expect, it } from 'vitest'
import { DEFAULT_CURSOR_FIELD as F, cursorDisplacement } from '../cursorField'

const mag = (d: { dx: number; dy: number }) => Math.hypot(d.dx, d.dy)

describe('cursor field', () => {
  it('does nothing beyond its radius', () => {
    expect(cursorDisplacement(F.radius, 0, 0, 0)).toEqual({ dx: 0, dy: 0 })
    expect(cursorDisplacement(1000, 1000, 0, 0)).toEqual({ dx: 0, dy: 0 })
  })

  it('never exceeds the displacement ceiling', () => {
    // The cursor must not be able to destroy the field it passes through.
    for (let d = 0; d < F.radius; d += 0.5) {
      expect(mag(cursorDisplacement(d, 0, 0, 0))).toBeLessThanOrEqual(F.maxDisplacement + 1e-9)
    }
  })

  it('stays finite directly under the pointer', () => {
    // An unbounded 1/d^2 diverges here and yields NaN on an exact hit.
    const at = cursorDisplacement(0, 0, 0, 0)
    expect(Number.isNaN(at.dx)).toBe(false)
    expect(at).toEqual({ dx: 0, dy: 0 })
    for (const d of [1e-9, 0.001, 0.1, 1]) {
      expect(Number.isFinite(mag(cursorDisplacement(d, 0, 0, 0)))).toBe(true)
    }
  })

  it('falls off with the square of distance past the softening radius', () => {
    const near = mag(cursorDisplacement(F.softening, 0, 0, 0))
    const far = mag(cursorDisplacement(F.softening * 2, 0, 0, 0))
    // Quarter the force at twice the distance, before the edge taper is
    // accounted for — so the ratio sits near 4 rather than exactly at it.
    expect(near / far).toBeGreaterThan(3)
    expect(near / far).toBeLessThan(6)
  })

  it('pushes away from the pointer, not toward it', () => {
    const right = cursorDisplacement(50, 0, 0, 0)
    expect(right.dx).toBeGreaterThan(0)
    const left = cursorDisplacement(-50, 0, 0, 0)
    expect(left.dx).toBeLessThan(0)
  })

  it('tapers to zero at the boundary so particles do not snap back', () => {
    expect(mag(cursorDisplacement(F.radius - 0.5, 0, 0, 0))).toBeLessThan(0.1)
  })

  it('is radially symmetric', () => {
    const a = mag(cursorDisplacement(40, 0, 0, 0))
    const b = mag(cursorDisplacement(0, 40, 0, 0))
    const c = mag(cursorDisplacement(-28.284, 28.284, 0, 0))
    expect(b).toBeCloseTo(a, 6)
    expect(c).toBeCloseTo(a, 3)
  })

  it('is deterministic', () => {
    expect(cursorDisplacement(33, 21, 5, 7)).toEqual(cursorDisplacement(33, 21, 5, 7))
  })
})
