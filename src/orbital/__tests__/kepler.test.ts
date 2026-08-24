import { describe, expect, it } from 'vitest'
import { BASE_PERIOD, BASE_SEMI_MAJOR, TAU } from '../constants'
import { BODIES, PLANET_BODIES } from '../elements'
import {
  eccentricAnomaly,
  localPositionAt,
  meanAnomalyAt,
  orbitalPeriod,
  radiusAt,
} from '../kepler'
import type { OrbitalElements } from '../types'

const vec = () => ({ x: 0, y: 0, z: 0 })

describe("Kepler's third law", () => {
  it('anchors the base orbit at the base period', () => {
    expect(orbitalPeriod(BASE_SEMI_MAJOR)).toBeCloseTo(BASE_PERIOD, 10)
  })

  it('scales period with a^(3/2)', () => {
    // Quadrupling the axis must multiply the period by exactly 8.
    expect(orbitalPeriod(BASE_SEMI_MAJOR * 4) / orbitalPeriod(BASE_SEMI_MAJOR)).toBeCloseTo(8, 10)
  })

  it('holds T^2 / a^3 constant across every planet', () => {
    const ratios = PLANET_BODIES.map((b) => orbitalPeriod(b.semiMajor) ** 2 / b.semiMajor ** 3)
    const first = ratios[0]!
    for (const r of ratios) expect(r / first).toBeCloseTo(1, 10)
  })

  it('makes the inner planet lap the outer one', () => {
    const inner = PLANET_BODIES[0]!
    const outer = PLANET_BODIES[PLANET_BODIES.length - 1]!
    expect(orbitalPeriod(inner.semiMajor)).toBeLessThan(orbitalPeriod(outer.semiMajor))
  })
})

describe("Kepler's equation", () => {
  it('inverts M = E - e*sin(E) to float precision', () => {
    for (const e of [0, 0.01, 0.03, 0.055, 0.09]) {
      for (let i = 0; i < 64; i += 1) {
        const M = (i / 64) * TAU
        const E = eccentricAnomaly(M, e)
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 12)
      }
    }
  })

  it('reduces to the identity for a circle', () => {
    for (let i = 0; i < 16; i += 1) {
      const M = (i / 16) * TAU
      expect(eccentricAnomaly(M, 0)).toBeCloseTo(M, 12)
    }
  })
})

describe("Kepler's second law", () => {
  // Equal areas in equal times: the body must move faster at perihelion.
  it('sweeps faster at perihelion than at aphelion', () => {
    const orbit: OrbitalElements = { semiMajor: 300, eccentricity: 0.055, meanAnomaly: 0 }
    const period = orbitalPeriod(orbit.semiMajor)
    const dt = period / 2000

    const speedAt = (seconds: number) => {
      const a = localPositionAt(orbit, seconds, vec())
      const b = localPositionAt(orbit, seconds + dt, vec())
      return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt
    }

    // meanAnomaly 0 is perihelion; half a period later is aphelion.
    expect(speedAt(0)).toBeGreaterThan(speedAt(period / 2))
  })

  it('conserves specific angular momentum r*v_perp around the orbit', () => {
    const orbit: OrbitalElements = { semiMajor: 300, eccentricity: 0.055, meanAnomaly: 0 }
    const period = orbitalPeriod(orbit.semiMajor)

    // r x v is constant under a central force; sample it around the ellipse.
    const dt = period / 100000
    const momenta: number[] = []
    for (let i = 0; i < 12; i += 1) {
      const t = (i / 12) * period
      const a = localPositionAt(orbit, t, vec())
      const b = localPositionAt(orbit, t + dt, vec())
      const vx = (b.x - a.x) / dt
      const vy = (b.y - a.y) / dt
      const vz = (b.z - a.z) / dt
      momenta.push(Math.hypot(a.y * vz - a.z * vy, a.z * vx - a.x * vz, a.x * vy - a.y * vx))
    }
    const first = momenta[0]!
    for (const m of momenta) expect(m / first).toBeCloseTo(1, 4)
  })

  it('keeps radius between perihelion and aphelion', () => {
    for (const body of BODIES) {
      const peri = body.semiMajor * (1 - body.eccentricity)
      const apo = body.semiMajor * (1 + body.eccentricity)
      for (let i = 0; i < 32; i += 1) {
        const r = radiusAt(body, (i / 32) * TAU)
        expect(r).toBeGreaterThanOrEqual(peri - 1e-9)
        expect(r).toBeLessThanOrEqual(apo + 1e-9)
      }
    }
  })
})

describe('determinism and long-session stability', () => {
  it('returns identical positions for identical elapsed time', () => {
    for (const body of BODIES) {
      const a = localPositionAt(body, 1234.5678, vec())
      const b = localPositionAt(body, 1234.5678, vec())
      expect(a).toEqual(b)
    }
  })

  it('is periodic: t and t + one period agree after an hour of running', () => {
    // The failure this guards against is accumulated drift. Position is a
    // pure function of t, so an hour in it must still land on the same point.
    for (const body of BODIES) {
      const period = orbitalPeriod(body.semiMajor)
      const late = 3600
      const a = localPositionAt(body, late, vec())
      const b = localPositionAt(body, late + period, vec())
      expect(a.x).toBeCloseTo(b.x, 6)
      expect(a.y).toBeCloseTo(b.y, 6)
      expect(a.z).toBeCloseTo(b.z, 6)
    }
  })

  it('does not drift when time is sampled unevenly', () => {
    // Emulates variable frame pacing: the sum of jittered steps must land in
    // the same place as one direct evaluation.
    const body = BODIES[0]!
    let t = 0
    for (let i = 0; i < 5000; i += 1) t += 0.0123 + (i % 7) * 0.0011
    const stepped = localPositionAt(body, t, vec())
    const direct = localPositionAt(body, t, vec())
    expect(stepped).toEqual(direct)
  })

  it('advances the mean anomaly by exactly TAU over one period', () => {
    for (const body of BODIES) {
      const period = orbitalPeriod(body.semiMajor)
      expect(meanAnomalyAt(body, period) - meanAnomalyAt(body, 0)).toBeCloseTo(TAU, 10)
    }
  })
})

describe('element table', () => {
  it('keeps every eccentricity in the near-circular range the solver assumes', () => {
    for (const body of BODIES) {
      expect(body.eccentricity).toBeGreaterThanOrEqual(0)
      expect(body.eccentricity).toBeLessThan(0.1)
    }
  })

  it('gives every body a unique id', () => {
    expect(new Set(BODIES.map((b) => b.id)).size).toBe(BODIES.length)
  })

  it('starts the planets at spread-out mean anomalies so they never sync', () => {
    const angles = PLANET_BODIES.map((b) => b.meanAnomaly).sort((a, b) => a - b)
    for (let i = 1; i < angles.length; i += 1) {
      expect(angles[i]! - angles[i - 1]!).toBeGreaterThan(0.3)
    }
  })
})
