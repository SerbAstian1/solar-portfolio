import { getBody } from './elements'
import { localPositionAt } from './kepler'
import type { CelestialBody, MutableVec3 } from './types'

/** Guards against a malformed parentId cycle turning a frame into an
 *  infinite loop. Nothing legitimate nests this deep. */
const MAX_DEPTH = 8

const scratch = { x: 0, y: 0, z: 0 }

/**
 * World position of a body at time t.
 *
 *   world(body) = world(parent) + localOrbit(body)
 *
 * A moon therefore orbits its parent and is carried along the parent's own
 * orbit, rather than tracing an independent path around the star that merely
 * happens to look attached.
 *
 * Written into `target`; allocates nothing.
 */
export function worldPositionAt<T extends MutableVec3>(
  body: CelestialBody,
  seconds: number,
  target: T,
): T {
  localPositionAt(body, seconds, target)

  let parentId = body.parentId
  let depth = 0
  while (parentId !== undefined && depth < MAX_DEPTH) {
    const parent = getBody(parentId)
    if (!parent) break

    localPositionAt(parent, seconds, scratch)
    target.x += scratch.x
    target.y += scratch.y
    target.z += scratch.z

    parentId = parent.parentId
    depth += 1
  }

  return target
}

/** Resolve by id. Returns null for an unknown id rather than a silent origin,
 *  so a bad route can be detected instead of quietly centring on the star. */
export function worldPositionOf<T extends MutableVec3>(
  id: string,
  seconds: number,
  target: T,
): T | null {
  const body = getBody(id)
  if (!body) return null
  return worldPositionAt(body, seconds, target)
}
