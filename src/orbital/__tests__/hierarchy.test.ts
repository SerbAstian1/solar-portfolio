import { describe, expect, it } from 'vitest'
import { BODIES, PLANET_BODIES, getBody, moonsOf } from '../elements'
import { worldPositionAt, worldPositionOf } from '../hierarchy'
import { localPositionAt, orbitalPeriod } from '../kepler'

interface P {
  x: number
  y: number
  z: number
}
const vec = (): P => ({ x: 0, y: 0, z: 0 })
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('hierarchical transforms', () => {
  it('leaves a star-orbiting planet identical to its local orbit', () => {
    for (const planet of PLANET_BODIES) {
      expect(worldPositionAt(planet, 42, vec())).toEqual(localPositionAt(planet, 42, vec()))
    }
  })

  it('places a moon at parent world position plus its own local orbit', () => {
    const work = getBody('work')!
    const moon = getBody('redmur')!

    for (const t of [0, 7.5, 61, 300.25]) {
      const parent = worldPositionAt(work, t, vec())
      const local = localPositionAt(moon, t, vec())
      const world = worldPositionAt(moon, t, vec())

      expect(world.x).toBeCloseTo(parent.x + local.x, 10)
      expect(world.y).toBeCloseTo(parent.y + local.y, 10)
      expect(world.z).toBeCloseTo(parent.z + local.z, 10)
    }
  })

  it('carries moons along with the parent rather than round the star', () => {
    // Separation from the parent must stay inside the moon's own orbit, no
    // matter how far round the star the parent has travelled.
    const work = getBody('work')!
    for (const moon of moonsOf('work')) {
      const peri = moon.semiMajor * (1 - moon.eccentricity)
      const apo = moon.semiMajor * (1 + moon.eccentricity)
      for (let i = 0; i < 40; i += 1) {
        const t = (i / 40) * orbitalPeriod(work.semiMajor)
        const separation = dist(worldPositionAt(moon, t, vec()), worldPositionAt(work, t, vec()))
        expect(separation).toBeGreaterThanOrEqual(peri - 1e-6)
        expect(separation).toBeLessThanOrEqual(apo + 1e-6)
      }
    }
  })

  it('keeps every moon clear of its parent surface and of its neighbours', () => {
    const work = getBody('work')!
    const moons = moonsOf('work')
    expect(moons.length).toBe(4)

    for (const moon of moons) {
      expect(moon.semiMajor * (1 - moon.eccentricity)).toBeGreaterThan(
        work.size / 2 + moon.size / 2,
      )
    }

    const sorted = [...moons].sort((a, b) => a.semiMajor - b.semiMajor)
    for (let i = 1; i < sorted.length; i += 1) {
      const inner = sorted[i - 1]!
      const outer = sorted[i]!
      const gap =
        outer.semiMajor * (1 - outer.eccentricity) - inner.semiMajor * (1 + inner.eccentricity)
      expect(gap).toBeGreaterThan((inner.size + outer.size) / 2)
    }
  })

  it('never lets a moon stray into the neighbouring planet orbit', () => {
    const work = getBody('work')!
    const services = getBody('services')!
    const furthest = Math.max(...moonsOf('work').map((m) => m.semiMajor * (1 + m.eccentricity)))
    const workApo = work.semiMajor * (1 + work.eccentricity)
    const servicesPeri = services.semiMajor * (1 - services.eccentricity)
    expect(workApo + furthest).toBeLessThan(servicesPeri)
  })

  it('resolves by id and reports unknown ids instead of returning the origin', () => {
    expect(worldPositionOf('work', 10, vec())).not.toBeNull()
    expect(worldPositionOf('not-a-body', 10, vec())).toBeNull()
  })

  it('stays deterministic for moons too', () => {
    for (const body of BODIES) {
      expect(worldPositionAt(body, 987.654, vec())).toEqual(worldPositionAt(body, 987.654, vec()))
    }
  })

  it('allocates no vectors of its own', () => {
    // The caller's target is returned, not a copy — the frame loop needs that.
    const target = vec()
    expect(worldPositionAt(getBody('redmur')!, 3, target)).toBe(target)
  })
})
