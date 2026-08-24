import { describe, expect, it } from 'vitest'
import { PLANET_BODIES, getBody } from '../elements'
import { localPositionAt, orbitalPeriod } from '../kepler'
import { computeTransit, type OccultationState } from '../occultation'

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
    // The defect this pins: at the system-wide 0.38 inclination the planet's
    // projected orbit had a semi-minor axis of 64.6 against a stellar radius
    // of 69, so its nearest approach in front was 62.5 — inside the limb but
    // never inside R - r. It grazed the top edge and never crossed the face,
    // which is what made the event look wrong. A full transit requires the
    // separation to fall below R - r, and the light curve to flat-bottom at
    // the disk-area ratio rather than peaking short of it.
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
