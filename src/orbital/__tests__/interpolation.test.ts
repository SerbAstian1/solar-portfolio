import { describe, expect, it } from 'vitest'
import {
  clamp,
  isSettled,
  lerp,
  omegaFromResponse,
  smoothstep,
  stepSpring,
  type Spring,
} from '../interpolation'

const spring = (value = 0, velocity = 0): Spring => ({ value, velocity })

/** Runs a spring to a target at a fixed frame rate, returning the trace. */
function run(hz: number, seconds: number, target: number, omega: number, from = 0) {
  const s = spring(from)
  const dt = 1 / hz
  const trace: number[] = []
  for (let t = 0; t < seconds; t += dt) {
    stepSpring(s, target, omega, dt)
    trace.push(s.value)
  }
  return { spring: s, trace }
}

describe('scalar helpers', () => {
  it('lerps and clamps', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5)
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
  })

  it('smoothsteps with zero slope at both ends', () => {
    expect(smoothstep(0, 1, 0)).toBe(0)
    expect(smoothstep(0, 1, 1)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10)
    expect(smoothstep(0, 1, 0.1)).toBeLessThan(0.1)
    expect(smoothstep(0, 1, 0.9)).toBeGreaterThan(0.9)
  })
})

describe('critically damped spring', () => {
  const omega = omegaFromResponse(0.6)

  it('reaches its target', () => {
    const { spring: s } = run(60, 4, 100, omega)
    expect(s.value).toBeCloseTo(100, 3)
    expect(isSettled(s, 100)).toBe(true)
  })

  it('never overshoots at any frame rate', () => {
    // The property that makes critical damping the right choice: no bounce,
    // and no clamping needed to get it.
    for (const hz of [24, 30, 60, 90, 144, 240]) {
      const { trace } = run(hz, 5, 100, omega)
      for (const v of trace) expect(v).toBeLessThanOrEqual(100 + 1e-9)
    }
  })

  it('is monotonic from rest', () => {
    const { trace } = run(60, 3, 100, omega)
    for (let i = 1; i < trace.length; i += 1) {
      expect(trace[i]!).toBeGreaterThanOrEqual(trace[i - 1]! - 1e-9)
    }
  })

  it('settles in the same wall-clock time regardless of frame rate', () => {
    // The exact defect this replaces: lerp(x, target, 0.12) evaluated per
    // frame converged twice as fast at 120Hz as at 60Hz.
    const settleTime = (hz: number) => {
      const s = spring(0)
      const dt = 1 / hz
      let t = 0
      while (t < 10 && !isSettled(s, 100, 0.05)) {
        stepSpring(s, 100, omega, dt)
        t += dt
      }
      return t
    }
    const base = settleTime(60)
    for (const hz of [24, 30, 90, 144, 240]) {
      // Tolerance is one 24Hz frame, the sampling granularity of the coarsest
      // rate measured — not slack for the integrator.
      expect(Math.abs(settleTime(hz) - base)).toBeLessThan(1 / 24)
    }
  })

  it('is exact: two half-steps equal one whole step', () => {
    // The semigroup property. This is what the closed form buys over implicit
    // Euler, and it is the strongest statement of frame-rate independence
    // available: the path taken does not depend on how it was sampled.
    const whole = spring(12, -3)
    const halves = spring(12, -3)
    const dt = 1 / 30

    for (let i = 0; i < 30; i += 1) {
      stepSpring(whole, 100, omega, dt)
      stepSpring(halves, 100, omega, dt / 2)
      stepSpring(halves, 100, omega, dt / 2)
    }

    expect(halves.value).toBeCloseTo(whole.value, 9)
    expect(halves.velocity).toBeCloseTo(whole.velocity, 9)
  })

  it('stays stable across a very long frame', () => {
    // A backgrounded tab returns with a huge dt. Both e^(-wt) and t*e^(-wt)
    // decay to zero, so the closed form absorbs it; an explicit integrator
    // would diverge.
    const s = spring(0)
    stepSpring(s, 100, omega, 5)
    expect(Number.isFinite(s.value)).toBe(true)
    expect(s.value).toBeGreaterThan(0)
    expect(s.value).toBeLessThanOrEqual(100 + 1e-9)
  })

  it('carries momentum into a new target instead of restarting', () => {
    // Interruptible retargeting is the reason for a spring over an easing
    // curve. Asserting the sign of velocity after one step would be wrong —
    // a far-away target applies enough restoring force to flip it inside a
    // single frame. What momentum actually means here is that a moving
    // spring travels further than an identical one starting from rest.
    const dt = 1 / 60

    const moving = spring(0)
    for (let i = 0; i < 20; i += 1) stepSpring(moving, 100, omega, dt)
    expect(moving.velocity).toBeGreaterThan(0)

    const atRest = spring(moving.value, 0)
    const carried = spring(moving.value, moving.velocity)

    stepSpring(atRest, 0, omega, dt)
    stepSpring(carried, 0, omega, dt)

    expect(carried.value).toBeGreaterThan(atRest.value)
  })

  it('ignores non-positive timesteps', () => {
    const s = spring(5, 2)
    stepSpring(s, 100, omega, 0)
    expect(s).toEqual({ value: 5, velocity: 2 })
  })

  it('responds faster with a shorter response time', () => {
    const fast = run(60, 0.4, 100, omegaFromResponse(0.25)).spring.value
    const slow = run(60, 0.4, 100, omegaFromResponse(1.2)).spring.value
    expect(fast).toBeGreaterThan(slow)
  })
})
