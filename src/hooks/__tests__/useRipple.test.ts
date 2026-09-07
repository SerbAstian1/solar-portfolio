import { describe, expect, it } from 'vitest'
import { RING_GAP, RING_MARGIN, chamferPoints } from '../useRipple'

const parse = (points: string) =>
  points.split(' ').map((p) => p.split(',').map(Number) as [number, number])

/**
 * The echo traces the control's own silhouette, so the polygon has to be that
 * silhouette — chamfered corner included — at each offset it travels to.
 */
describe('echo outline', () => {
  it('draws five corners on a chamfered control', () => {
    expect(parse(chamferPoints(200, 40, 10, 0))).toHaveLength(5)
  })

  it('draws a plain rectangle where there is no chamfer', () => {
    // Not every control is cut — the swatches and the ground toggle are not.
    expect(parse(chamferPoints(200, 40, 0, 0))).toHaveLength(4)
  })

  it('sits exactly on the control at zero offset', () => {
    const pts = parse(chamferPoints(200, 40, 10, 0))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    expect(Math.min(...xs)).toBe(RING_MARGIN)
    expect(Math.min(...ys)).toBe(RING_MARGIN)
    expect(Math.max(...xs)).toBe(RING_MARGIN + 200)
    expect(Math.max(...ys)).toBe(RING_MARGIN + 40)
  })

  it('expands by the offset on every side', () => {
    const d = 9
    const pts = parse(chamferPoints(200, 40, 10, d))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    expect(Math.min(...xs)).toBe(RING_MARGIN - d)
    expect(Math.max(...xs)).toBe(RING_MARGIN + 200 + d)
    expect(Math.min(...ys)).toBe(RING_MARGIN - d)
    expect(Math.max(...ys)).toBe(RING_MARGIN + 40 + d)
  })

  it('grows the same distance on the short axis as the long one', () => {
    /* The reason this is an offset and not a scale. A 227x40 button scaled to
       clear 9px vertically would travel 51px horizontally, and the echo would
       read as stretching sideways rather than radiating. */
    const d = 9
    const at = (o: number) => {
      const pts = parse(chamferPoints(227, 40, 10, o))
      return {
        w: Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
        h: Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])),
      }
    }
    const grewW = at(d).w - at(0).w
    const grewH = at(d).h - at(0).h
    expect(grewW).toBe(grewH)
    expect(grewW).toBe(d * 2)
  })

  it('keeps the cut the same length as it travels', () => {
    // A parallel offset of a 45-degree chamfer moves the diagonal outward
    // without lengthening it. A scale would have stretched it.
    const cutLength = (d: number) => {
      const pts = parse(chamferPoints(200, 40, 12, d))
      const [ax, ay] = pts[2]!
      const [bx, by] = pts[3]!
      return Math.hypot(bx - ax, by - ay)
    }
    expect(cutLength(RING_GAP)).toBeCloseTo(cutLength(0), 9)
    expect(cutLength(RING_GAP * 3)).toBeCloseTo(cutLength(0), 9)
  })

  it('never folds the shape inside out on a tiny control', () => {
    // A cut longer than the box would cross the polygon over itself.
    const pts = parse(chamferPoints(6, 6, 40, 0))
    for (const [x, y] of pts) {
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
    }
    const xs = pts.map((p) => p[0])
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(Math.min(...xs))
  })

  it('emits only finite numbers, whatever it is handed', () => {
    const cases: ReadonlyArray<readonly [number, number, number, number]> = [
      [0, 0, 0, 0],
      [1, 1, 1, 30],
      [200, 40, 10, 27],
    ]
    for (const [w, h, cut, d] of cases) {
      const pts = parse(chamferPoints(w, h, cut, d))
      for (const [x, y] of pts) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      }
    }
  })
})
