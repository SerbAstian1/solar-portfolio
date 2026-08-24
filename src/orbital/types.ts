/** Anything with mutable x/y/z. THREE.Vector3 satisfies this structurally,
 *  which is how this module stays free of a three.js import. */
export interface MutableVec3 {
  x: number
  y: number
  z: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/**
 * Keplerian elements for one body, in world units.
 *
 * `meanAnomaly` is the body's position at t=0, in radians. Two bodies with
 * the same period and different mean anomalies stay permanently out of phase,
 * which is what stops the system looking like a clock.
 */
export interface OrbitalElements {
  /** Semi-major axis. Also sets the period, via Kepler's third law. */
  readonly semiMajor: number
  /** 0 = circle. Values here stay under 0.06 so orbits read as near-circular. */
  readonly eccentricity: number
  /** Position along the orbit at t=0, radians. */
  readonly meanAnomaly: number
  /**
   * Sine of this orbit's inclination to the view plane. Defaults to the
   * system-wide ORBIT_TILT.
   *
   * Per-body because the projected orbit is an ellipse of semi-axes
   * a x a*inclination centred on the star, so inclination alone decides
   * whether a body can cross the stellar disk at all: it is highest on
   * screen exactly when it is nearest the camera. At the shared 0.38, the
   * inner planet's projected minor axis is 64.6 against a stellar radius of
   * 69 — it clipped the top limb and never crossed the face.
   */
  readonly inclination?: number

  /**
   * Parent body this orbits. Absent means it orbits the star.
   * A moon's world position is its parent's world position plus its own
   * local orbit — see hierarchy.ts.
   */
  readonly parentId?: string
}

/** Presentation properties. Kept apart from the elements so the maths module
 *  never has an opinion about how big something looks. */
export interface BodyAppearance {
  /** Rendered diameter in world units. */
  readonly size: number
  /** Axial rotation period, seconds. */
  readonly spin: number
  /** Axial tilt, radians. */
  readonly axialTilt: number
}

export interface CelestialBody extends OrbitalElements, BodyAppearance {
  readonly id: string
}
