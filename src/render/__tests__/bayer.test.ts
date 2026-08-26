import { describe, expect, it } from 'vitest'
import { BAYER_8, BAYER_GLSL, bayer8 } from '../bayer'
import { phaseFor } from '../dither'

describe('the Bayer matrix', () => {
  it('holds all 64 thresholds exactly once, evenly spread', () => {
    const scaled = [...BAYER_8].map((v) => Math.round(v * 64)).sort((a, b) => a - b)
    expect(scaled).toEqual(Array.from({ length: 64 }, (_, i) => i))
  })

  it('stays inside 0..1, exclusive of 1', () => {
    for (const v of BAYER_8) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

/**
 * The load-bearing claim in dither.ts: the closed form the shader evaluates is
 * the same matrix the 2D canvas looks up. If these ever diverge the two dither
 * surfaces on the page stop matching, which is visible — one grain over the
 * background and a different one over the planets.
 */
describe('the shader recurrence reproduces the matrix', () => {
  it('agrees at every cell', () => {
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        expect(bayer8(x, y)).toBeCloseTo(BAYER_8[y * 8 + x]!, 12)
      }
    }
  })

  it('tiles with period 8 in both directions', () => {
    // The shader feeds it unbounded screen coordinates and never wraps them,
    // so the periodicity has to come from the function itself.
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        expect(bayer8(x + 8, y)).toBeCloseTo(bayer8(x, y), 12)
        expect(bayer8(x, y + 8)).toBeCloseTo(bayer8(x, y), 12)
        expect(bayer8(x + 24, y + 16)).toBeCloseTo(bayer8(x, y), 12)
      }
    }
  })
})

describe('the injected GLSL', () => {
  it('defines the three levels the fragment shader calls', () => {
    for (const fn of ['ditherBayer2', 'ditherBayer4', 'ditherBayer8']) {
      expect(BAYER_GLSL).toContain(`float ${fn}(vec2 a)`)
    }
  })

  it('uses no array-constructor syntax, which not every dialect accepts', () => {
    expect(BAYER_GLSL).not.toMatch(/float\s*\[\s*\d+\s*\]/)
  })
})

/**
 * The phase function decides how much of a body's visible disk the star
 * lights. It is the whole reason a transiting planet reads as a silhouette
 * rather than as a lit moon parked on the star.
 */
describe('star-lit phase', () => {
  const FLOOR = 0.06
  const at = (x: number, y: number, z: number) => phaseFor({ x, y, z }, FLOOR)

  it('is dark for a body directly in front of the star', () => {
    // In front means between the star and the camera: night side towards us.
    expect(at(0, 0, 100)).toBeCloseTo(FLOOR, 9)
  })

  it('is fully lit for a body directly behind the star', () => {
    expect(at(0, 0, -100)).toBeCloseTo(1, 9)
  })

  it('is half lit out at the ansae, where the body is beside the star', () => {
    const half = FLOOR + (1 - FLOOR) * 0.5
    expect(at(100, 0, 0)).toBeCloseTo(half, 9)
    expect(at(-100, 0, 0)).toBeCloseTo(half, 9)
    expect(at(0, 100, 0)).toBeCloseTo(half, 9)
  })

  it('depends only on direction, never on distance', () => {
    for (const scale of [1, 10, 500, 5000]) {
      expect(at(3 * scale, 4 * scale, 5 * scale)).toBeCloseTo(at(3, 4, 5), 9)
    }
  })

  it('rises monotonically as a body swings from in front to behind', () => {
    let previous = -1
    for (let z = 200; z >= -200; z -= 5) {
      const lit = at(0, 40, z)
      expect(lit).toBeGreaterThanOrEqual(previous)
      previous = lit
    }
  })

  it('never goes fully black, so a transiting body stays aimable', () => {
    for (let z = 0; z <= 200; z += 5) expect(at(0, 0, z)).toBeGreaterThan(0)
  })

  it('stays inside 0..1 everywhere', () => {
    for (const p of [[0,0,1],[0,0,-1],[1,1,1],[-5,2,-9],[0,0,0]]) {
      const v = at(p[0]!, p[1]!, p[2]!)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
