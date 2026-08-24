import type { MutableVec3 } from './types'

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Mutable spring state. Velocity is carried across frames — that carry is
 *  the whole reason a spring can be redirected mid-flight without a visible
 *  restart, which a fixed-duration easing curve cannot do. */
export interface Spring {
  value: number
  velocity: number
}

/**
 * Angular frequency from a response time.
 * `response` is roughly how long the spring takes to cover its distance;
 * smaller is snappier.
 */
export function omegaFromResponse(response: number): number {
  return (Math.PI * 2) / Math.max(response, 0.0001)
}

/**
 * One step of a critically damped spring, using the closed-form solution.
 *
 * For zeta = 1 the ODE has an exact solution, so this is evaluated rather
 * than integrated:
 *
 *   d      = value - target
 *   x(t)   = target + (d + (v + w*d) * t) * e^(-w*t)
 *   v(t)   = (v - w * (v + w*d) * t) * e^(-w*t)
 *
 * Why closed form rather than implicit Euler: implicit Euler is stable at
 * any timestep but its effective damping still varies with dt, so a 24Hz
 * client settles measurably slower than a 144Hz one. The exact solution has
 * the semigroup property — two half-steps equal one whole step — which makes
 * the camera's behaviour genuinely independent of frame rate rather than
 * merely well-behaved. It is also unconditionally stable, since both e^(-wt)
 * and t*e^(-wt) decay to zero for arbitrarily large t.
 *
 * From rest it approaches monotonically and never overshoots. Given an
 * inherited velocity it may pass the target once, which is correct physics
 * and is what makes an interrupted camera move read as momentum rather than
 * as a restart.
 */
export function stepSpring(spring: Spring, target: number, omega: number, dt: number): Spring {
  if (dt <= 0) return spring

  const d = spring.value - target
  const decay = Math.exp(-omega * dt)
  const impulse = spring.velocity + omega * d

  spring.value = target + (d + impulse * dt) * decay
  spring.velocity = (spring.velocity - omega * impulse * dt) * decay
  return spring
}

export interface Spring3 {
  readonly x: Spring
  readonly y: Spring
  readonly z: Spring
}

export function createSpring3(x = 0, y = 0, z = 0): Spring3 {
  return {
    x: { value: x, velocity: 0 },
    y: { value: y, velocity: 0 },
    z: { value: z, velocity: 0 },
  }
}

export function stepSpring3(
  spring: Spring3,
  target: MutableVec3,
  omega: number,
  dt: number,
): Spring3 {
  stepSpring(spring.x, target.x, omega, dt)
  stepSpring(spring.y, target.y, omega, dt)
  stepSpring(spring.z, target.z, omega, dt)
  return spring
}

export function readSpring3<T extends MutableVec3>(spring: Spring3, target: T): T {
  target.x = spring.x.value
  target.y = spring.y.value
  target.z = spring.z.value
  return target
}

/** True once the spring has effectively arrived, so callers can stop work. */
export function isSettled(spring: Spring, target: number, epsilon = 0.01): boolean {
  return Math.abs(spring.value - target) < epsilon && Math.abs(spring.velocity) < epsilon
}
