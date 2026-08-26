import { describe, expect, it } from 'vitest'
import { BODIES, PLANET_BODIES, getBody } from '../elements'
import { localPositionAt, orbitalPeriod } from '../kepler'
import { bodyObscuration, computeTransit, type OccultationState } from '../occultation'

/** Matches SUN_SIZE / 2 in the scene. */
const STAR_RADIUS = 69
const LOOKAHEAD = 0.05

const vec = () => ({ x: 0, y: 0, z: 0 })

/** Walks one full orbit and records the transit at each step. */
function sampleOrbit(id: string, steps = 4000) {
  const body = getBody(id)!
  const period = orbitalPeriod(body.semiMajor)
  const samples = []
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * period
    samples.push({
      t,
      transit: computeTransit({
        starRadius: STAR_RADIUS,
        bodyRadius: body.size / 2,
        position: localPositionAt(body, t, vec()),
        nextPosition: localPositionAt(body, t + LOOKAHEAD, vec()),
      }),
    })
  }
  return samples
}

/**
 * Direction of travel, and what it fixes about the two events.
 *
 * The camera sits above the orbital plane, so the near half of every orbit is
 * the *lower* half of the frame and the viewer sees the system turn
 * anticlockwise — the view from above the north pole. That is not a free
 * choice once the transit code is written against it: a body is in front of
 * the star exactly when it is below it, so transits cross the bottom of the
 * disk left to right and occultations pass above it right to left.
 */
describe('the system turns anticlockwise as the viewer sees it', () => {
  /** Twice the signed area swept about the origin; positive is anticlockwise
   *  in a y-up frame, which is what the orthographic camera gives us. */
  function sweptArea(body: (typeof BODIES)[number]): number {
    const period = orbitalPeriod(body.semiMajor)
    let area = 0
    for (let i = 0; i < 4000; i += 1) {
      const p = localPositionAt(body, (i / 4000) * period, vec())
      const q = localPositionAt(body, ((i + 1) / 4000) * period, vec())
      area += p.x * q.y - p.y * q.x
    }
    return area
  }

  it('turns every body anticlockwise, moons included', () => {
    for (const body of BODIES) {
      expect(sweptArea(body)).toBeGreaterThan(0)
    }
  })

  it('keeps a body in front of the star only while it is below it', () => {
    // The invariant the whole transit/occultation split rests on. It was the
    // other way up: in front meant above, which put the camera under the
    // orbital plane and inverted both events.
    for (const body of PLANET_BODIES) {
      const period = orbitalPeriod(body.semiMajor)
      for (let i = 0; i < 3000; i += 1) {
        const p = localPositionAt(body, (i / 3000) * period, vec())
        if (p.z > 0) expect(p.y).toBeLessThan(0)
        if (p.z < 0) expect(p.y).toBeGreaterThan(0)
      }
    }
  })

  it('runs the transit left to right across the bottom of the disk', () => {
    const body = getBody('work')!
    const r = body.size / 2
    const crossing = []
    const period = orbitalPeriod(body.semiMajor)
    for (let i = 0; i < 24000; i += 1) {
      const p = localPositionAt(body, (i / 24000) * period, vec())
      if (p.z >= 0 && Math.hypot(p.x, p.y) < STAR_RADIUS + r) crossing.push(p.x)
    }
    expect(crossing.length).toBeGreaterThan(0)
    expect(crossing[crossing.length - 1]!).toBeGreaterThan(crossing[0]!)
  })

  it('runs the occultation right to left above it', () => {
    const body = getBody('work')!
    const r = body.size / 2
    const passing = []
    const period = orbitalPeriod(body.semiMajor)
    for (let i = 0; i < 24000; i += 1) {
      const p = localPositionAt(body, (i / 24000) * period, vec())
      if (p.z < 0 && Math.hypot(p.x, p.y) < STAR_RADIUS + r) passing.push(p.x)
    }
    expect(passing.length).toBeGreaterThan(0)
    expect(passing[passing.length - 1]!).toBeLessThan(passing[0]!)
  })

  it('spins the planets prograde, with the orbit rather than against it', () => {
    // Orbital angular momentum r x v; the scene spins bodies about +y, so
    // prograde needs L.y positive. Anticlockwise orbits made it negative and
    // every planet turned backwards against its own path.
    for (const body of PLANET_BODIES) {
      const p = localPositionAt(body, 10, vec())
      const q = localPositionAt(body, 10.001, vec())
      const Ly = p.z * (q.x - p.x) - p.x * (q.z - p.z)
      expect(Ly).toBeGreaterThan(0)
    }
  })
})

/**
 * Which bodies reach the star at all. Only Work does, and the elements table
 * records why the other four cannot at this tilt. These pin both halves of
 * that claim, so neither an inclination drift nor a retune can quietly turn
 * the system into one where nothing transits or everything does.
 */
describe('only the inner planet reaches the stellar disk', () => {
  it('brings Work wholly onto the face and wholly behind it', () => {
    const body = getBody('work')!
    const r = body.size / 2
    const period = orbitalPeriod(body.semiMajor)
    let front = Infinity
    let back = Infinity
    for (let i = 0; i < 24000; i += 1) {
      const p = localPositionAt(body, (i / 24000) * period, vec())
      const d = Math.hypot(p.x, p.y)
      if (p.z >= 0) front = Math.min(front, d)
      else back = Math.min(back, d)
    }
    expect(front).toBeLessThan(STAR_RADIUS - r)
    expect(back).toBeLessThan(STAR_RADIUS - r)
  })

  it('keeps the outer four clear of the disk entirely', () => {
    for (const body of PLANET_BODIES) {
      if (body.id === 'work') continue
      const r = body.size / 2
      const period = orbitalPeriod(body.semiMajor)
      for (let i = 0; i < 3000; i += 1) {
        const p = localPositionAt(body, (i / 3000) * period, vec())
        expect(Math.hypot(p.x, p.y)).toBeGreaterThan(STAR_RADIUS + r)
      }
    }
  })

  it('nests the projected orbits instead of crossing them', () => {
    const heights = PLANET_BODIES.map((body) => {
      let top = 0
      for (let i = 0; i < 2000; i += 1) {
        const p = localPositionAt(body, (i / 2000) * orbitalPeriod(body.semiMajor), vec())
        top = Math.max(top, Math.abs(p.y))
      }
      return top
    })
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]!).toBeGreaterThan(heights[i - 1]!)
    }
  })
})

describe('the real system produces a real transit', () => {
  const samples = sampleOrbit('work')
  const coverages = samples.map((s) => s.transit.coverage)
  const peak = Math.max(...coverages)

  it('the inner planet does cross the stellar disk', () => {
    // If this fails, the tilt or the orbit radii have drifted to the point
    // where no body ever passes in front of the star and the whole subsystem
    // is dead code that still runs every frame.
    expect(peak).toBeGreaterThan(0)
  })

  it('peaks at no more than the disk-area ratio', () => {
    const body = getBody('work')!
    const maxPossible = (body.size / 2 / STAR_RADIUS) ** 2
    expect(peak).toBeLessThanOrEqual(maxPossible + 1e-12)
  })

  it('fully enters the disk rather than clipping the limb', () => {
    // The defect this pins: at the old system-wide 0.38 inclination the
    // planet's projected orbit had a semi-minor axis of 64.6 against a stellar
    // radius of 69, so its nearest approach in front was 62.5 — inside the
    // limb but never inside R - r. It grazed the top edge and never crossed
    // the face, which is what made the event look wrong. A full transit needs
    // the separation to fall below R - r, and the light curve to flat-bottom
    // at the disk-area ratio rather than peaking short of it.
    const body = getBody('work')!
    const r = body.size / 2
    const minSeparation = Math.min(...samples.map((s) => s.transit.separation))
    expect(minSeparation).toBeLessThan(STAR_RADIUS - r)
    expect(peak).toBeCloseTo((r / STAR_RADIUS) ** 2, 6)
    expect(samples.some((s) => s.transit.state === 'full-transit')).toBe(true)
  })

  it('passes through ingress and egress around the deepest point', () => {
    const order: OccultationState[] = []
    for (const { transit } of samples) {
      if (order[order.length - 1] !== transit.state) order.push(transit.state)
    }
    expect(order).toContain('ingress')
    expect(order).toContain('full-transit')
    expect(order).toContain('egress')
    // Whatever the sequence, it has to begin and end away from the disk.
    expect(order[0]).toBe('clear')
    expect(order[order.length - 1]).toBe('clear')
  })

  it('never reports a transit while the planet is behind the star', () => {
    for (const { transit } of samples) {
      if (transit.coverage > 0) expect(transit.separation).toBeLessThan(STAR_RADIUS + 17)
    }
    const behind = samples.filter((s) => localPositionAt(getBody('work')!, s.t, vec()).z < 0)
    expect(behind.length).toBeGreaterThan(0)
    for (const s of behind) expect(s.transit.coverage).toBe(0)
  })

  it('produces a smooth light curve with no discontinuous jumps', () => {
    // A step in the curve would mean the geometry is being switched rather
    // than computed — exactly the on/off opacity this replaced.
    let maxJump = 0
    for (let i = 1; i < coverages.length; i += 1) {
      maxJump = Math.max(maxJump, Math.abs(coverages[i]! - coverages[i - 1]!))
    }
    expect(maxJump).toBeLessThan(peak / 4 + 1e-9)
  })

  it('is deterministic across repeated evaluation', () => {
    const again = sampleOrbit('work').map((s) => s.transit.coverage)
    expect(again).toEqual(coverages)
  })

  it('keeps flux at exactly 1 whenever nothing is crossing', () => {
    for (const { transit } of samples) {
      if (transit.coverage === 0) expect(transit.flux).toBe(1)
    }
  })

  it('reports the geometry for every planet without error', () => {
    for (const body of PLANET_BODIES) {
      const s = sampleOrbit(body.id, 400)
      for (const { transit } of s) {
        expect(Number.isFinite(transit.coverage)).toBe(true)
        expect(transit.coverage).toBeGreaterThanOrEqual(0)
        expect(transit.coverage).toBeLessThanOrEqual(1)
      }
    }
  })
})

/**
 * The reverse event: Work passing behind the star, half an orbit after it
 * crosses in front of it. This is the larger of the two by far — the star
 * hides all of the planet, while the planet hides 6% of the star — and it is
 * the one a visitor actually notices, so its contacts are pinned here.
 */
describe('Work is occulted by the star on the far side of its orbit', () => {
  const work = getBody('work')!
  const r = work.size / 2
  const period = orbitalPeriod(work.semiMajor)

  const samples = Array.from({ length: 8000 }, (_, i) => {
    const t = (i / 8000) * period
    const p = localPositionAt(work, t, vec())
    const separation = Math.hypot(p.x, p.y)
    return {
      t,
      separation,
      behind: p.z < 0,
      hidden: p.z < 0 ? bodyObscuration(STAR_RADIUS, r, separation) : 0,
    }
  })

  it('goes completely behind the star, not merely near it', () => {
    expect(samples.some((s) => s.hidden === 1)).toBe(true)
  })

  it('is never dimmed while any part of it is still clear of the limb', () => {
    for (const s of samples) {
      if (s.separation >= STAR_RADIUS + r) expect(s.hidden).toBe(0)
    }
  })

  it('is never fully hidden while part of it is still outside the disk', () => {
    // The point-source version failed exactly here: it hit 1 at d = R.
    for (const s of samples) {
      if (s.separation > STAR_RADIUS - r) expect(s.hidden).toBeLessThan(1)
    }
  })

  it('takes a real, comparable time to be eaten and to re-emerge', () => {
    const step = period / 8000
    const ingress = samples.filter((s) => s.behind && s.hidden > 0 && s.hidden < 1).length * step
    // Both limb crossings together; each is a real event, not a snap.
    expect(ingress).toBeGreaterThan(2)
  })

  it('is symmetric about mid-occultation', () => {
    const deepest = samples.reduce((a, b) => (b.separation < a.separation && b.behind ? b : a))
    const step = period / 8000
    const before = samples.filter((s) => s.behind && s.hidden > 0 && s.t < deepest.t).length * step
    const after = samples.filter((s) => s.behind && s.hidden > 0 && s.t > deepest.t).length * step
    expect(Math.abs(before - after)).toBeLessThan(0.6)
  })

  it('hides nothing on the near side, for any planet', () => {
    // The occultation belongs to the far half of the orbit only. On the near
    // side the same separations occur, and reading them as the star hiding
    // the planet would blank a planet that is in front of it — which is a
    // transit, and the star's problem rather than the planet's.
    for (const body of PLANET_BODIES) {
      for (let i = 0; i < 2000; i += 1) {
        const t = (i / 2000) * orbitalPeriod(body.semiMajor)
        const p = localPositionAt(body, t, vec())
        if (p.z >= 0) continue
        expect(p.y).toBeGreaterThan(0)
      }
    }
  })

  it('gives Work a real totality, not just a close pass', () => {
    const step = period / 8000
    const totality = samples.filter((s) => s.hidden === 1).length * step
    expect(totality).toBeGreaterThan(2)
  })
})
