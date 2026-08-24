import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_TARGET,
  focusTarget,
  panelWidthFor,
  projectToScreenOffset,
  type FocusInput,
} from '../camera'
import { getBody } from '../elements'
import { worldPositionAt } from '../hierarchy'

const desktop = (over: Partial<FocusInput> = {}): FocusInput => ({
  worldX: 170,
  worldY: 40,
  bodySize: 34,
  systemScale: 1,
  viewportWidth: 1440,
  viewportHeight: 900,
  panelWidth: panelWidthFor(1440),
  ...over,
})

describe('panel width', () => {
  it('mirrors min(50vw, 640px) with a min-width floor', () => {
    expect(panelWidthFor(1440)).toBe(640) // 50vw = 720, capped at 640
    expect(panelWidthFor(1000)).toBe(500) // 50vw = 500
    expect(panelWidthFor(800)).toBe(420) // 50vw = 400, floored at 420
  })

  it('never exceeds the viewport', () => {
    for (const w of [320, 480, 768, 1024, 1440, 2560]) {
      expect(panelWidthFor(w)).toBeLessThanOrEqual(w)
    }
  })
})

describe('focus framing', () => {
  it('lands the body in the centre of the stage left of the panel', () => {
    // The defect this prevents: centring the planet in the viewport parks it
    // behind the panel describing it.
    const input = desktop()
    const camera = focusTarget(input)
    const offset = projectToScreenOffset(input.worldX, input.worldY, input.systemScale, camera)

    expect(offset.x).toBeCloseTo(-input.panelWidth / 2, 6)
    expect(offset.y).toBeCloseTo(0, 6)
  })

  it('keeps the focused body fully clear of the panel edge', () => {
    for (const width of [900, 1280, 1440, 1920, 2560]) {
      const input = desktop({ viewportWidth: width, panelWidth: panelWidthFor(width) })
      const camera = focusTarget(input)
      const offset = projectToScreenOffset(input.worldX, input.worldY, input.systemScale, camera)

      const bodyRadius = (input.bodySize * input.systemScale * camera.zoom) / 2
      const panelLeftEdge = width / 2 - input.panelWidth
      expect(offset.x + bodyRadius).toBeLessThan(panelLeftEdge)
    }
  })

  it('zooms in rather than out', () => {
    expect(focusTarget(desktop()).zoom).toBeGreaterThan(OVERVIEW_TARGET.zoom)
  })

  it('clamps zoom into a sane band for tiny and huge bodies', () => {
    expect(focusTarget(desktop({ bodySize: 1 })).zoom).toBeLessThanOrEqual(6)
    expect(focusTarget(desktop({ bodySize: 5000 })).zoom).toBeGreaterThanOrEqual(1)
  })

  it('accounts for the system scale so small viewports still frame correctly', () => {
    // systemScale shrinks the whole group on small screens; the framing must
    // survive it rather than zooming to a stale assumption.
    const scaled = desktop({ systemScale: 0.4 })
    const camera = focusTarget(scaled)
    const offset = projectToScreenOffset(scaled.worldX, scaled.worldY, scaled.systemScale, camera)
    expect(offset.x).toBeCloseTo(-scaled.panelWidth / 2, 6)
  })

  it('produces a distinct target for every real planet', () => {
    const targets = new Set<string>()
    for (const id of ['work', 'services', 'about', 'pricing', 'contact']) {
      const body = getBody(id)!
      const pos = worldPositionAt(body, 12, { x: 0, y: 0, z: 0 })
      const camera = focusTarget(desktop({ worldX: pos.x, worldY: pos.y, bodySize: body.size }))
      expect(Number.isFinite(camera.x)).toBe(true)
      expect(Number.isFinite(camera.y)).toBe(true)
      targets.add(`${camera.x.toFixed(4)}:${camera.y.toFixed(4)}`)
    }
    expect(targets.size).toBe(5)
  })

  it('frames a moon at its world position, not its local one', () => {
    const moon = getBody('redmur')!
    const pos = worldPositionAt(moon, 30, { x: 0, y: 0, z: 0 })
    const camera = focusTarget(desktop({ worldX: pos.x, worldY: pos.y, bodySize: moon.size }))
    const offset = projectToScreenOffset(pos.x, pos.y, 1, camera)
    expect(offset.x).toBeCloseTo(-panelWidthFor(1440) / 2, 6)
  })

  it('is a pure function of its input', () => {
    expect(focusTarget(desktop())).toEqual(focusTarget(desktop()))
  })
})
