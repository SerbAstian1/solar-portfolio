import { describe, expect, it } from 'vitest'
import {
  CLEAR_TRANSIT,
  apparentSeparation,
  circleOverlapArea,
  combineTransits,
  computeTransit,
  bodyObscuration,
  occultationStateFor,
  stellarCoverage,
} from '../occultation'

const R = 69 // star radius, matching SUN_SIZE / 2
const r = 17 // body radius, matching the Work planet

describe('circle intersection area', () => {
  it('is zero when the disks are disjoint', () => {
    expect(circleOverlapArea(R, r, R + r)).toBe(0)
    expect(circleOverlapArea(R, r, R + r + 1)).toBe(0)
    expect(circleOverlapArea(R, r, 1000)).toBe(0)
  })

  it('is the smaller disk when one contains the other', () => {
    expect(circleOverlapArea(R, r, 0)).toBeCloseTo(Math.PI * r * r, 9)
    expect(circleOverlapArea(R, r, R - r)).toBeCloseTo(Math.PI * r * r, 9)
    expect(circleOverlapArea(R, r, R - r - 5)).toBeCloseTo(Math.PI * r * r, 9)
  })

  it('matches the closed form for two equal circles at d = radius', () => {
    // Known result: 2r²(π/3) − (√3/2)r² for d = r.
    const expected = 2 * R * R * (Math.PI / 3) - (Math.sqrt(3) / 2) * R * R
    expect(circleOverlapArea(R, R, R)).toBeCloseTo(expected, 6)
  })

  it('halves each disk when equal circles share a centre-to-edge distance of 0', () => {
    expect(circleOverlapArea(R, R, 0)).toBeCloseTo(Math.PI * R * R, 9)
  })

  it('is symmetric in its radii', () => {
    for (const d of [0, 10, 40, 52, 68, 85]) {
      expect(circleOverlapArea(R, r, d)).toBeCloseTo(circleOverlapArea(r, R, d), 9)
    }
  })

  it('decreases monotonically as the disks separate', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let d = 0; d <= R + r + 5; d += 0.5) {
      const area = circleOverlapArea(R, r, d)
      expect(area).toBeLessThanOrEqual(previous + 1e-9)
      previous = area
    }
  })

  it('never returns NaN, including at the exact boundaries', () => {
    // Both degenerate cases sit exactly where the formula divides by zero or
    // pushes acos out of range; float error near them is the classic source
    // of a NaN that would blank the star permanently.
    const boundaries = [0, Math.abs(R - r), R + r]
    const nudges = [-1e-12, -1e-9, 0, 1e-9, 1e-12]
    for (const base of boundaries) {
      for (const nudge of nudges) {
        const area = circleOverlapArea(R, r, base + nudge)
        expect(Number.isNaN(area)).toBe(false)
        expect(area).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('handles degenerate radii without blowing up', () => {
    expect(circleOverlapArea(0, r, 5)).toBe(0)
    expect(circleOverlapArea(R, 0, 5)).toBe(0)
    expect(Number.isNaN(circleOverlapArea(R, r, 0))).toBe(false)
  })
})

describe('stellar coverage', () => {
  it('peaks at the disk-area ratio when the body is fully inside', () => {
    // The relation that makes real transit photometry work — and the reason
    // the dip is small: a body a quarter of the star's width takes ~6%.
    expect(stellarCoverage(R, r, 0)).toBeCloseTo((r / R) ** 2, 9)
  })

  it('is zero outside contact and bounded to 0-1 everywhere', () => {
    expect(stellarCoverage(R, r, R + r)).toBe(0)
    for (let d = 0; d <= R + r + 10; d += 0.25) {
      const c = stellarCoverage(R, r, d)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })

  it('reaches 1 only when the body is at least as large as the star', () => {
    expect(stellarCoverage(R, R, 0)).toBeCloseTo(1, 9)
    expect(stellarCoverage(R, R * 2, 0)).toBeCloseTo(1, 9)
    expect(stellarCoverage(R, r, 0)).toBeLessThan(0.1)
  })

  it('produces a curved light dip, not a linear ramp', () => {
    // The curvature has to fall out of the intersection area. A straight fade
    // between contact and mid-transit would be the fallback this replaces, so
    // the midpoint of the curve must sit clearly off the straight line.
    const start = R + r
    const end = 0
    const samples = 41
    let maxDeviation = 0
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples
      const d = start + (end - start) * t
      const actual = stellarCoverage(R, r, d)
      const linear = stellarCoverage(R, r, end) * t
      maxDeviation = Math.max(maxDeviation, Math.abs(actual - linear))
    }
    expect(maxDeviation).toBeGreaterThan(0.01)
  })

  it('is flat-bottomed while the body is wholly inside the disk', () => {
    // A small body fully projected onto the star hides a constant area, so
    // the light curve plateaus rather than coming to a point.
    const a = stellarCoverage(R, r, 0)
    const b = stellarCoverage(R, r, (R - r) / 2)
    const c = stellarCoverage(R, r, R - r)
    expect(b).toBeCloseTo(a, 9)
    expect(c).toBeCloseTo(a, 9)
  })
})

describe('occultation state', () => {
  const closing = (d: number) => occultationStateFor(R, r, d, d - 1)
  const opening = (d: number) => occultationStateFor(R, r, d, d + 1)

  it('is clear beyond contact', () => {
    expect(closing(R + r)).toBe('clear')
    expect(closing(R + r + 10)).toBe('clear')
  })

  it('is ingress while partially overlapping and closing', () => {
    expect(closing(R + r - 1)).toBe('ingress')
    expect(closing(R)).toBe('ingress')
    expect(closing(R - r + 1)).toBe('ingress')
  })

  it('is egress while partially overlapping and opening', () => {
    expect(opening(R - r + 1)).toBe('egress')
    expect(opening(R)).toBe('egress')
    expect(opening(R + r - 1)).toBe('egress')
  })

  it('is full transit once wholly inside, in either direction', () => {
    expect(closing(R - r)).toBe('full-transit')
    expect(opening(R - r)).toBe('full-transit')
    expect(closing(0)).toBe('full-transit')
  })

  it('walks clear to ingress to full to egress to clear over a pass', () => {
    // A straight-line pass across the disk, sampled densely, must produce the
    // states in order and never skip backwards.
    const seen: string[] = []
    const step = 0.5
    for (let x = -(R + r + 10); x <= R + r + 10; x += step) {
      const next = Math.abs(x + step)
      const state = occultationStateFor(R, r, Math.abs(x), next)
      if (seen[seen.length - 1] !== state) seen.push(state)
    }
    expect(seen).toEqual(['clear', 'ingress', 'full-transit', 'egress', 'clear'])
  })
})

describe('apparent geometry', () => {
  it('ignores depth, because a transit is an apparent phenomenon', () => {
    expect(apparentSeparation({ x: 3, y: 4, z: 9999 })).toBeCloseTo(5, 9)
    expect(apparentSeparation({ x: 0, y: 0, z: -500 })).toBe(0)
  })

  it('reports no transit when the body is behind the star', () => {
    // Directly behind and perfectly aligned: the star occults the body, which
    // is the reverse event and must not be reported as the star losing light.
    const behind = computeTransit({
      starRadius: R,
      bodyRadius: r,
      position: { x: 0, y: 0, z: -100 },
      nextPosition: { x: 1, y: 0, z: -100 },
    })
    expect(behind).toBe(CLEAR_TRANSIT)
    expect(behind.coverage).toBe(0)
  })

  it('reports a transit when the same alignment is in front', () => {
    const front = computeTransit({
      starRadius: R,
      bodyRadius: r,
      position: { x: 0, y: 0, z: 100 },
      nextPosition: { x: 1, y: 0, z: 100 },
    })
    expect(front.state).toBe('full-transit')
    expect(front.coverage).toBeCloseTo((r / R) ** 2, 9)
    expect(front.flux).toBeCloseTo(1 - (r / R) ** 2, 9)
  })

  it('keeps flux and coverage complementary', () => {
    for (const x of [0, 20, 50, 70, 86, 120]) {
      const t = computeTransit({
        starRadius: R,
        bodyRadius: r,
        position: { x, y: 0, z: 10 },
        nextPosition: { x: x - 1, y: 0, z: 10 },
      })
      expect(t.coverage + t.flux).toBeCloseTo(1, 12)
    }
  })
})

describe('combining bodies', () => {
  /** A body of radius r centred at (x, 0), in front of the star. */
  const at = (x: number, radius = r) =>
    computeTransit({
      starRadius: R,
      bodyRadius: radius,
      position: { x, y: 0, z: 10 },
      nextPosition: { x: x - 1, y: 0, z: 10 },
    })

  const single = at(0).coverage

  it('sums bodies that hide different patches of the star', () => {
    // 40 apart, so the two disks are disjoint (2r = 34) but both on the face.
    const combined = combineTransits([at(-20), at(20)], R)
    expect(combined.coverage).toBeCloseTo(single * 2, 9)
  })

  it('ignores bodies that are not on the disk at all', () => {
    expect(combineTransits([at(0), at(1000)], R).coverage).toBeCloseTo(single, 9)
  })

  /* The defect these pin: coverage used to be a plain sum, which was the
     union only while no two bodies could overlap. Once every planet transits,
     two of them share the disk about 6.6% of the time and overlap each other
     about 2.5% of it — and a plain sum would take a whole extra planet's
     worth of light out of the star at exactly the moment you can see the two
     planets sitting on top of one another. */
  it('counts a patch hidden by two bodies at once only once', () => {
    const stacked = combineTransits([at(0), at(0)], R)
    expect(stacked.coverage).toBeCloseTo(single, 9)
  })

  it('does not let a pile of bodies black out the star between them', () => {
    const many = Array.from({ length: 40 }, () => at(0))
    expect(combineTransits(many, R).coverage).toBeCloseTo(single, 9)
  })

  it('lands between the larger body and the plain sum when a pair overlaps', () => {
    // 17 apart against radii of 17: the disks overlap across about half their
    // width, so the union is strictly more than one and less than two.
    const partial = combineTransits([at(-8.5), at(8.5)], R).coverage
    expect(partial).toBeGreaterThan(single)
    expect(partial).toBeLessThan(single * 2)
  })

  it('charges nothing for an overlap that happens out beyond the limb', () => {
    // Two bodies overlapping each other where one of them is wholly off the
    // star. The shared lens hides nothing, so subtracting it would brighten
    // the star — the on-disk body's contribution has to survive untouched.
    const grazing = at(80) // straddling the limb, partly on the face
    const outside = at(110) // wholly off it, but within 2r of the first
    expect(grazing.coverage).toBeGreaterThan(0)
    expect(outside.coverage).toBe(0)
    expect(combineTransits([grazing, outside], R).coverage).toBeCloseTo(grazing.coverage, 12)
  })

  it('collapses a nearly coincident pair onto barely more than one body', () => {
    // Centres 2 apart against radii of 17: the two hide almost the same patch,
    // so the union has to sit just above one of them, not near twice one.
    const pair = combineTransits([at(0), at(2)], R).coverage
    expect(pair).toBeGreaterThanOrEqual(single)
    expect(pair).toBeLessThan(single * 1.2)
  })

  it('never exceeds a fully hidden star', () => {
    const eclipsed = combineTransits([at(0, R * 2)], R)
    expect(eclipsed.coverage).toBe(1)
    expect(eclipsed.flux).toBe(0)
  })

  it('reports the state of the body nearest the disk centre', () => {
    expect(combineTransits([at(1000), at(0)], R).state).toBe('full-transit')
  })

  it('carries the nearest body forward, so the result is still a body', () => {
    const combined = combineTransits([at(1000), at(3)], R)
    expect(combined.x).toBe(3)
    expect(combined.bodyRadius).toBe(r)
  })

  it('is clear for an empty set', () => {
    expect(combineTransits([], R).coverage).toBe(0)
    expect(combineTransits([], R).flux).toBe(1)
  })

  it('is order independent', () => {
    const bodies = [at(-20), at(0), at(6), at(1000)]
    const forward = combineTransits(bodies, R).coverage
    const backward = combineTransits([...bodies].reverse(), R).coverage
    expect(forward).toBeCloseTo(backward, 12)
  })
})

describe('body obscuration — the star hiding the planet', () => {
  it('hides nothing until the two limbs touch', () => {
    expect(bodyObscuration(R, r, R + r)).toBe(0)
    expect(bodyObscuration(R, r, R + r + 0.001)).toBe(0)
    expect(bodyObscuration(R, r, 1000)).toBe(0)
  })

  it('hides the body completely only once it is wholly inside the disk', () => {
    expect(bodyObscuration(R, r, R - r)).toBeCloseTo(1, 9)
    expect(bodyObscuration(R, r, R - r - 5)).toBe(1)
    expect(bodyObscuration(R, r, 0)).toBe(1)
  })

  /* The bug this replaced: a point-source ramp reached 1 at d = R, with a
     whole body radius still outside the limb, and started fading at
     d = R + 26 in open sky. Both ends are pinned here. */
  it('leaves the body fully lit while it is still clear of the limb', () => {
    for (let d = R + r; d <= R + r + 40; d += 1) {
      expect(bodyObscuration(R, r, d)).toBe(0)
    }
  })

  it('still shows most of the body when its centre sits on the limb', () => {
    // Slightly under half, because the limb bows away from the body's centre.
    const onLimb = bodyObscuration(R, r, R)
    expect(onLimb).toBeGreaterThan(0.4)
    expect(onLimb).toBeLessThan(0.5)
  })

  it('rises monotonically as the body sinks behind the star', () => {
    let previous = -1
    for (let d = R + r + 5; d >= 0; d -= 0.25) {
      const hidden = bodyObscuration(R, r, d)
      expect(hidden).toBeGreaterThanOrEqual(previous - 1e-12)
      previous = hidden
    }
  })

  it('shares its numerator with stellarCoverage, differing only by disk area', () => {
    for (const d of [40, 52, 60, 69, 78, 85]) {
      expect(bodyObscuration(R, r, d) * (r * r)).toBeCloseTo(
        stellarCoverage(R, r, d) * (R * R),
        9,
      )
    }
  })

  it('is a degenerate zero for a body with no size', () => {
    expect(bodyObscuration(R, 0, 10)).toBe(0)
  })
})
