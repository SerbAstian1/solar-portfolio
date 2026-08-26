import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import {
  applyDither,
  isolateMaterials,
  phaseFor,
  setDitherHover,
  setDitherPhase,
  type DitherPalette,
} from '../render/dither'
import { clearTelemetry, publishTelemetry } from '../orbital/telemetry'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { TransitionState } from '../hooks/usePlanetNavigation'
import type { PlanetContent } from '../data/types'
import { PLANETS } from '../data/planets'
import {
  OVERVIEW_TARGET,
  PLANET_BODIES,
  localPositionAt,
  moonsOf,
  TAU,
  createSpring3,
  eccentricAnomaly,
  focusTarget,
  getBody,
  meanAnomalyAt,
  omegaFromResponse,
  orbitPosition,
  panelWidthFor,
  stepSpring,
  worldPositionAt,
  CLEAR_TRANSIT,
  bodyObscuration,
  combineTransits,
  computeTransit,
} from '../orbital'
import type { CameraTarget, CelestialBody, Occultation, Spring } from '../orbital'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { lerp, OPEN_PHASES, phaseProgress } from '../utils/transitionEasing'

type TransitionRef = MutableRefObject<TransitionState>
type PlanetRefs = MutableRefObject<Record<string, THREE.Group | null>>
type ModelRefs = MutableRefObject<Record<string, THREE.Object3D | null>>
/** Per-body transit results, written by each planet and read by the star. */
type TransitRefs = MutableRefObject<Record<string, Occultation>>

/**
 * How far ahead the orbit is sampled to tell ingress from egress.
 *
 * Both are the same geometry — partial overlap — so direction is the only
 * thing that separates them. Sampling the orbit rather than remembering last
 * frame's separation keeps the whole calculation a pure function of t, so a
 * paused tab or a dropped frame cannot desynchronise it.
 */
const TRANSIT_LOOKAHEAD = 0.05

/** Base colours, captured once so per-frame dimming is absolute rather than
 *  compounding multiplicatively into black over a few seconds. */
const baseEmissive = new WeakMap<THREE.Material, THREE.Color>()
const baseColor = new WeakMap<THREE.Material, THREE.Color>()

/**
 * Applies remaining stellar flux to the star's materials.
 *
 * The primary visual is the planet genuinely covering the star's pixels,
 * which depth testing already does. This is the secondary consequence — the
 * disk losing the light the planet is blocking. It is deliberately small:
 * coverage peaks at (Rp/R*)^2, about 6% for the inner planet, and inflating
 * that would be inventing physics the rest of the module refuses to invent.
 */
function setStellarFlux(object: THREE.Object3D, flux: number) {
  object.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((mat: THREE.Material) => {
      const standard = mat as THREE.MeshStandardMaterial
      if (standard.color) {
        let base = baseColor.get(standard)
        if (!base) {
          base = standard.color.clone()
          baseColor.set(standard, base)
        }
        standard.color.copy(base).multiplyScalar(flux)
      }
      if (standard.emissive) {
        let base = baseEmissive.get(standard)
        if (!base) {
          base = standard.emissive.clone()
          baseEmissive.set(standard, base)
        }
        standard.emissive.copy(base).multiplyScalar(flux)
      }
    })
  })
}

/**
 * The dither palettes.
 *
 * Hexes mirror --black / --white / --orange in global.css. They are repeated
 * rather than read because these are WebGL uniforms, not CSS: the shader needs
 * numbers at material-compile time, and reading a custom property here would
 * mean a getComputedStyle call per body per palette change.
 *
 * Planets sit in black and white at rest so the star is the only warm thing on
 * screen, and warm to the brand orange only under the pointer — which makes
 * hover a colour event rather than a scale or outline one, and keeps it
 * legible on a body only a few dozen pixels across.
 */
const PLANET_DITHER: DitherPalette = {
  /* Not the page's black. The unlit half of a body has to stay distinguishable
     from the space behind it, or the planet loses its silhouette and reads as
     a scatter of light cells rather than as a sphere. */
  dark: '#1E1E22',
  light: '#FFFFFF',
  glow: '#EB5E28',
  cell: 2,
  // Five tones. Enough to keep the terminator, the limb and the surface
  // markings readable at 30-70px across; more than about six and the dither
  // stops being visible as a texture at this cell size.
  levels: 5,
  gain: 1.9,
}

/**
 * The star never goes monochrome — it is the light source, and a white one
 * would leave the scene with no warmth at all. It dithers between a near-black
 * shadow and a warm highlight, so the transit still reads: as flux drops, lit
 * cells thin out across the disk.
 */
const SUN_DITHER: DitherPalette = {
  /* The one place the brand orange is deliberately not used.
     
     Taking the highlight down to #EB5E28 was tried and reverted: measured off
     a frame, the star's core fell to #971505, because the brand colour is a
     mid-tone and a dithered sphere spends most of its cells *below* its
     highlight. An emissive body needs its brightest cells above the accent to
     read as a light source at all, and at the brand value the star came out a
     dark ember. #FFD68A is that headroom. It is also the only object on the
     page that emits rather than reflects, which is the argument for letting it
     sit outside the palette rather than an exception to be tidied away. */
  dark: '#160804',
  light: '#FFD68A',
  glow: '#EB5E28',
  cell: 2,
  // One more than the planets: the star is the largest body on screen and
  // carries the transit's flux ramp, which needs the tonal room to read.
  levels: 6,
  // The star is already the brightest thing rendered; it needs a nudge to
  // reach full highlight, not the planets' rescue.
  gain: 1.2,
}

const SUN_SIZE = 138
const SUN_RADIUS = SUN_SIZE / 2
const SUN_ROTATION_PERIOD = 70

/* Nats per second for the hover glow. At 9 the glow is ~99% of the way there
   in a third of a second: quick enough to feel attached to the pointer,
   slow enough to read as warming rather than switching. */
/* How lit a body stays when its night side is turned to us and there is
   nothing behind it but space. Physically it should be black; at 0.40 it reads
   as a clearly darkened disc that can still be found and clicked. Measured
   against the far-side bodies it sits at roughly half their brightness, which
   is enough to say "this one is facing away" without saying "this one is
   gone". */
const PHASE_FLOOR_IN_SPACE = 0.4

const HOVER_GLOW_RATE = 9

const SELECTED_EMPHASIS_SCALE = 1.25
const DISTANT_OPACITY = 0.45
const ORBIT_OPACITY_REST = 0.26
const ORBIT_OPACITY_DIM = 0.08

const LABEL_HEADROOM = 30
const VIEWPORT_PADDING = 40
const MIN_SYSTEM_SCALE = 0.3

// Pointer target stays close to the visible planet. The tooltip now follows
// the planet as it moves, so an oversized target that no longer matches what
// you can see buys nothing and makes near-conjunctions ambiguous.
const MIN_HIT_RADIUS = 26
function getHitRadius(size: number): number {
  return Math.max(size / 2 + 12, MIN_HIT_RADIUS)
}

/** Half-extents the whole system needs on screen, sampled off the real curves. */
const SYSTEM_EXTENT = (() => {
  const point = new THREE.Vector3()
  let x = 0
  let y = 0
  PLANET_BODIES.forEach((orbit) => {
    for (let i = 0; i < 360; i += 1) {
      orbitPosition(orbit, (i / 360) * TAU, point)
      x = Math.max(x, Math.abs(point.x) + orbit.size / 2)
      y = Math.max(y, Math.abs(point.y) + orbit.size / 2 + LABEL_HEADROOM)
    }
  })
  return { x, y }
})()

/**
 * A tilted plane is much taller on screen than the old near-flat one, so the
 * system is scaled down to fit rather than running off the top and bottom.
 */
function useSystemScale() {
  const size = useThree((state) => state.size)
  return useMemo(
    () =>
      Math.max(
        MIN_SYSTEM_SCALE,
        Math.min(
          1,
          (size.width / 2 - VIEWPORT_PADDING) / SYSTEM_EXTENT.x,
          (size.height / 2 - VIEWPORT_PADDING) / SYSTEM_EXTENT.y,
        ),
      ),
    [size.width, size.height],
  )
}

/**
 * 0 when a planet is fully visible, 1 when it is completely behind the sun.
 *
 * Only the far side counts: a planet in front (positive z) is transiting, and
 * depth testing already paints it over the sun there.
 *
 * The figure is the fraction of the planet's own disk that the star's disk
 * covers, so the contacts are the real ones — full brightness until the two
 * limbs touch at R + r, fully hidden only once the trailing limb passes
 * inside at R − r. The previous version treated the planet as a point and
 * ramped over a fixed 26-unit band measured from the star's centre, which put
 * the entire fade *outside* the star: Work began dissolving while still nine
 * units clear of the limb and was completely gone the moment its centre
 * touched it, with a whole radius of planet still sticking out into open sky.
 * A body cannot fade out in empty space, and it cannot vanish while you can
 * still see a quarter of it.
 */
function getSunOcclusion(position: THREE.Vector3, bodyRadius: number): number {
  if (position.z >= 0) return 0
  return bodyObscuration(SUN_RADIUS, bodyRadius, Math.hypot(position.x, position.y))
}

/** Apply emissive emphasis to GLB mesh materials — lightweight glow substitute. */
function setModelEmphasis(object: THREE.Object3D, emphasis: number, settledDim = 0): void {
  object.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((mat: THREE.Material) => {
      const standard = mat as THREE.MeshStandardMaterial
      if (!standard.emissive) return
      const glow = Math.max(0, emphasis - settledDim * 0.5)
      // Brand orange's own channel ratios (235, 94, 40 normalised), so the
      // emphasis glow warms toward the identity rather than toward the cream
      // this used to sit at.
      standard.emissive.setRGB(0.18 * glow, 0.072 * glow, 0.031 * glow)
      standard.emissiveIntensity = glow * 0.55
    })
  })
}

/** Reduce overall mesh opacity for atmospheric background role. */
function setModelOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((mat: THREE.Material) => {
      mat.transparent = opacity < 1
      mat.opacity = opacity
    })
  })
}

interface CameraRigProps {
  transitionRef: TransitionRef
  systemScale: number
}

/**
 * The camera, as a first-class system.
 *
 * Replaces the previous "drift": that multiplied the selected planet's
 * position by hard-coded factors (0.22, 0.12), had no zoom, and eased home
 * with lerp(pos, 0, 0.12) evaluated per frame — which converged twice as
 * fast on a 120Hz display as on a 60Hz one.
 *
 * Now three critically damped springs carry x, y and zoom toward a target
 * computed by focusTarget(). Because the spring is the closed-form solution
 * it is exactly frame-rate independent, it never overshoots from rest, and
 * it can be redirected mid-flight — clicking Services while the Work
 * approach is still travelling continues from the current position and
 * velocity rather than restarting.
 *
 * The focused body's position comes from the orbital core rather than from
 * the scene graph, so the camera does not depend on render order and stays
 * deterministic.
 */
const CAMERA_RESPONSE = 0.85

function CameraRig({ transitionRef, systemScale }: CameraRigProps) {
  const { camera: rawCamera, size } = useThree()
  const camera = rawCamera as THREE.OrthographicCamera
  const reducedMotion = useReducedMotion()

  const springs = useRef(createSpring3(OVERVIEW_TARGET.x, OVERVIEW_TARGET.y))
  const zoomSpring = useRef<Spring>({ value: OVERVIEW_TARGET.zoom, velocity: 0 })
  const world = useRef(new THREE.Vector3())

  useEffect(() => {
    camera.left = -size.width / 2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = -size.height / 2
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useFrame(({ clock }, delta) => {
    const tr = transitionRef.current
    const focusId = tr.progress > 0 ? tr.targetId : null
    const body = focusId === null ? undefined : getBody(focusId)

    let target: CameraTarget = OVERVIEW_TARGET
    if (body) {
      worldPositionAt(body, reducedMotion ? 0 : clock.elapsedTime, world.current)
      target = focusTarget({
        worldX: world.current.x,
        worldY: world.current.y,
        bodySize: body.size,
        systemScale,
        viewportWidth: size.width,
        viewportHeight: size.height,
        panelWidth: panelWidthFor(size.width),
      })
    }

    if (reducedMotion) {
      // Someone who asked for less motion still needs the destination, just
      // not the journey. Snap, and keep velocities at rest so a later
      // preference change does not inherit stale momentum.
      springs.current.x.value = target.x
      springs.current.y.value = target.y
      zoomSpring.current.value = target.zoom
      springs.current.x.velocity = 0
      springs.current.y.velocity = 0
      zoomSpring.current.velocity = 0
    } else {
      // delta is clamped because a tab returning from the background reports
      // one enormous frame, and teleporting the camera is worse than a
      // slightly slow catch-up.
      const dt = Math.min(delta, 1 / 20)
      const omega = omegaFromResponse(CAMERA_RESPONSE)
      stepSpring(springs.current.x, target.x, omega, dt)
      stepSpring(springs.current.y, target.y, omega, dt)
      stepSpring(zoomSpring.current, target.zoom, omega, dt)
    }

    camera.position.x = springs.current.x.value
    camera.position.y = springs.current.y.value

    if (camera.zoom !== zoomSpring.current.value) {
      camera.zoom = zoomSpring.current.value
      camera.updateProjectionMatrix()
    }
  })

  return null
}

/**
 * Pins the hover tooltip to the hovered planet's projected position every
 * frame, so it travels with the planet instead of being stranded wherever the
 * cursor happened to enter. Writes straight to the DOM node — the tooltip must
 * not re-render sixty times a second.
 */
interface PreviewTrackerProps {
  hoveredId: string | null
  planetRefs: PlanetRefs
  previewRef: MutableRefObject<HTMLDivElement | null>
  systemScale: number
}

function PreviewTracker({
  hoveredId,
  planetRefs,
  previewRef,
  systemScale,
}: PreviewTrackerProps) {
  const { camera, size } = useThree()
  const projected = useRef(new THREE.Vector3())
  const measured = useRef<{ id: string | null; width: number; height: number }>({
    id: null,
    width: 0,
    height: 0,
  })
  const flipped = useRef(false)

  useFrame(() => {
    const anchor = previewRef.current
    const planetGroup = hoveredId ? planetRefs.current[hoveredId] : null
    const slot = anchor?.firstElementChild as HTMLElement | null | undefined
    if (!anchor || !planetGroup || !slot || hoveredId === null) return

    // Card size only changes when the copy does, and reading it forces layout.
    // A zero height means the card hasn't mounted yet, so keep re-measuring.
    if (measured.current.id !== hoveredId || measured.current.height === 0) {
      measured.current = { id: hoveredId, width: slot.offsetWidth, height: slot.offsetHeight }
    }

    planetGroup.getWorldPosition(projected.current)
    projected.current.project(camera)
    const screenX = (projected.current.x * 0.5 + 0.5) * size.width
    const screenY = (-projected.current.y * 0.5 + 0.5) * size.height

    const gap = ((getBody(hoveredId)?.size ?? 0) / 2) * systemScale + 20
    const halfWidth = measured.current.width / 2
    const marginX = halfWidth + VIEWPORT_PADDING / 2

    // Flip below the planet when there isn't room above, rather than clamping
    // the card down on top of the planet it describes.
    const shouldFlip = screenY - gap - measured.current.height < VIEWPORT_PADDING / 4
    if (shouldFlip !== flipped.current) {
      anchor.classList.toggle('is-below', shouldFlip)
      flipped.current = shouldFlip
    }

    const x = Math.min(Math.max(screenX, marginX), Math.max(marginX, size.width - marginX))
    const y = shouldFlip ? screenY + gap : screenY - gap
    anchor.style.transform = `translate3d(${x}px, ${y}px, 0)`
  })

  return null
}

interface ModelProps {
  url: string
  size: number
  /** Omit to leave the model's own shading alone. */
  dither?: DitherPalette
  onModelReady?: (model: THREE.Object3D | null) => void
}

function Model({ url, size, dither, onModelReady }: ModelProps) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const cloned = scene.clone(true)
    // Purely visual — all pointer interaction goes through the dedicated
    // invisible hit-sphere, so this shouldn't compete for raycast hits.
    cloned.traverse((child: THREE.Object3D) => {
      child.raycast = () => null
    })
    return cloned
  }, [scene])

  /* Every body in the scene is a clone of the same GLB, and cloning shares
     materials. Isolating them here is what makes the per-body writes below —
     opacity, emphasis, hover glow — land on one body instead of all of them. */
  useEffect(() => {
    const release = isolateMaterials(model)
    if (dither) applyDither(model, dither)
    return release
  }, [model, dither])
  const scale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model)
    const dimensions = bounds.getSize(new THREE.Vector3())
    model.position.sub(bounds.getCenter(new THREE.Vector3()))
    return size / Math.max(dimensions.x, dimensions.y)
  }, [model, size])

  useEffect(() => {
    onModelReady?.(model)
    return () => onModelReady?.(null)
  }, [model, onModelReady])

  return (
    <group scale={scale}>
      <primitive object={model} />
    </group>
  )
}

interface OrbitRingProps {
  orbit: CelestialBody
  transitionRef: TransitionRef
}

function OrbitRing({ orbit, transitionRef }: OrbitRingProps) {
  // Built as an object rather than as <line>: in JSX `line` resolves to the
  // SVG element, not three's Line. Going through <primitive> also gives the
  // geometry and material an owner that can dispose them on unmount, which
  // the previous form never did.
  const line = useMemo(() => {
    const point = new THREE.Vector3()
    const points = Array.from({ length: 161 }, (_, index) => {
      orbitPosition(orbit, (index / 160) * TAU, point)
      return point.clone()
    })
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: '#fff',
      transparent: true,
      opacity: ORBIT_OPACITY_REST,
    })
    const created = new THREE.Line(geometry, material)
    created.raycast = () => null
    return created
  }, [orbit])

  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )

  useFrame(() => {
    const fadeT = phaseProgress(transitionRef.current.progress, 0, OPEN_PHASES.approach)
    ;(line.material as THREE.LineBasicMaterial).opacity = lerp(
      ORBIT_OPACITY_REST,
      ORBIT_OPACITY_DIM,
      fadeT,
    )
  })

  return <primitive object={line} />
}

interface MoonProps {
  body: CelestialBody
  parentSelected: boolean
  onSelect: (id: string) => void
}

/**
 * A project, orbiting its section.
 *
 * Rendered as a child of the parent's orbit group, so the hierarchical
 * transform — world = parent world + local orbit — is performed by the scene
 * graph itself rather than recomputed here. hierarchy.ts holds the same
 * relationship for anything outside the renderer that needs it, notably the
 * camera, and the two are asserted to agree in the tests.
 *
 * Moons mount only while their section is open. At overview zoom they would
 * be sub-pixel specks, so drawing them there would cost four model instances
 * to render nothing legible.
 */
function Moon({ body, parentSelected, onSelect }: MoonProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const spinRef = useRef<THREE.Group | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  /* A moon's own position is relative to its planet, but the phase angle is
     measured from the star. Reused across frames rather than allocated. */
  const worldPosition = useRef(new THREE.Vector3())
  const reducedMotion = useReducedMotion()

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = reducedMotion ? 0 : clock.elapsedTime
    localPositionAt(body, t, groupRef.current.position)
    if (spinRef.current) spinRef.current.rotation.y = (t / body.spin) * TAU
    if (modelRef.current) {
      groupRef.current.getWorldPosition(worldPosition.current)
      setDitherPhase(modelRef.current, phaseFor(worldPosition.current))
    }
  })

  if (!parentSelected) return null

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, body.axialTilt]}>
        <group ref={spinRef}>
          <Model
            url="/planet3d.glb"
            size={body.size}
            dither={PLANET_DITHER}
            onModelReady={(model) => {
              modelRef.current = model
            }}
          />
        </group>
      </group>
      <mesh
        onClick={(event: { stopPropagation: () => void }) => {
          event.stopPropagation()
          onSelect(body.id)
        }}
      >
        <sphereGeometry args={[Math.max(body.size / 2 + 8, 14), 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface PlanetProps {
  data: PlanetContent
  orbit: CelestialBody
  onHover: (planet: PlanetContent) => void
  onLeave: (planet: PlanetContent) => void
  onSelect: (id: string) => void
  transitionRef: TransitionRef
  planetRefs: PlanetRefs
  modelRefs: ModelRefs
  isLocked: boolean
  selectedId: string | null
  onSelectProject: (id: string) => void
  mode: 'full' | 'compact'
  isHovered: boolean
  transitRefs: TransitRefs
}

function Planet({
  data,
  orbit,
  onHover,
  onLeave,
  onSelect,
  transitionRef,
  planetRefs,
  modelRefs,
  isLocked,
  selectedId,
  onSelectProject,
  mode,
  isHovered,
  transitRefs,
}: PlanetProps) {
  const orbitRef = useRef<THREE.Group | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)
  const spinRef = useRef<THREE.Group | null>(null)
  const occludedRef = useRef(false)
  const labelRef = useRef<HTMLSpanElement | null>(null)
  /* Eased rather than switched, so the glow arrives and leaves rather than
     popping. Held in a ref because it changes every frame and React must not
     re-render the planet for it. */
  const hoverGlowRef = useRef(0)
  const isSelected = selectedId === data.id
  const isDisabled = isLocked
  const reducedMotion = useReducedMotion()
  const moons = useMemo(() => moonsOf(data.id), [data.id])
  const lookahead = useRef(new THREE.Vector3())

  useEffect(() => {
    const published = transitRefs.current
    return () => {
      delete published[data.id]
    }
  }, [data.id, transitRefs])

  useEffect(() => {
    planetRefs.current[data.id] = orbitRef.current
    return () => {
      delete planetRefs.current[data.id]
    }
  }, [data.id, planetRefs])

  useFrame(({ clock }, delta) => {
    if (!orbitRef.current) return

    // Frozen at t=0 for reduced motion: bodies keep their distinct starting
    // anomalies, so the system still reads as a system — it simply stops
    // being a full-viewport field of moving objects.
    const t = reducedMotion ? 0 : clock.elapsedTime
    const meanAnomaly = meanAnomalyAt(orbit, t)
    orbitPosition(
      orbit,
      eccentricAnomaly(meanAnomaly, orbit.eccentricity),
      orbitRef.current.position,
    )

    if (spinRef.current) {
      spinRef.current.rotation.y = (t / orbit.spin) * TAU
    }

    /* Transit. The orbit supplies the motion; the projected geometry decides
       whether a transit is happening at all. Sampling one short step ahead
       is what separates ingress from egress, both of which are the same
       partial-overlap configuration. */
    localPositionAt(orbit, t + TRANSIT_LOOKAHEAD, lookahead.current)
    transitRefs.current[data.id] = computeTransit({
      starRadius: SUN_RADIUS,
      bodyRadius: orbit.size / 2,
      position: orbitRef.current.position,
      nextPosition: lookahead.current,
    })

    const tr = transitionRef.current
    const progress = tr.progress
    const isOpeningStart = tr.active && tr.direction === 1 && progress < 0.001
    const selected = tr.targetId === data.id && (progress > 0 || isOpeningStart)

    if (!visualRef.current) return
    const visual = visualRef.current

    if (selected) {
      // Step 1 — immediate highlight glow on selection (100–150ms).
      const highlightT = Math.max(
        tr.active && tr.direction === 1 ? 0.85 : 0,
        phaseProgress(progress, 0, OPEN_PHASES.highlight),
      )
      const approachT = phaseProgress(progress, OPEN_PHASES.highlight, OPEN_PHASES.approach)

      const model = modelRefs.current[data.id]
      if (model) {
        setModelEmphasis(model, highlightT, 0)
      }

      // The planet no longer translates or scales itself. Framing is the
      // camera's job now — a body that slides across the system while the
      // camera also moves is two things faking one, and it breaks the
      // spatial continuity the transition exists to preserve. A small
      // emphasis bump remains, because relative prominence is a property of
      // the body, not of the viewpoint.
      const emphasisScale = progress <= OPEN_PHASES.highlight
        ? 1
        : lerp(1, SELECTED_EMPHASIS_SCALE, approachT)
      visual.scale.setScalar(emphasisScale)
      visual.position.set(0, 0, 0)

      // Step 5 — settle into atmospheric background element.
      const settleT = phaseProgress(progress, OPEN_PHASES.panel, OPEN_PHASES.settled)
      if (model) {
        const emphasis = settleT > 0 ? lerp(Math.max(highlightT, 0.55), 0.55, settleT) : highlightT
        setModelEmphasis(model, emphasis, settleT)
        setModelOpacity(model, settleT > 0 ? lerp(1, 0.82, settleT) : 1)
      }
    } else {
      visual.scale.setScalar(1)
      visual.position.set(0, 0, 0)

      // Step 2 — fade distant planets; restore defaults when idle.
      const fadeT = phaseProgress(progress, 0, OPEN_PHASES.approach)
      const model = modelRefs.current[data.id]
      const baseOpacity = progress > 0 ? lerp(1, DISTANT_OPACITY, fadeT) : 1

      // Occultation: the sun hiding the planet on the far side of the orbit.
      // Passing in front is left to depth testing, which already paints the
      // planet over the sun. With the plane tilted as it is, only Work's
      // orbit reaches the sun's disc at all.
      //
      // The fraction is geometric, so ingress and egress take exactly as long
      // as the planet's own width says they should. Depth testing supplies the
      // hard limb edge for free while the sun is opaque; this fade is what
      // keeps the event right during a panel transition, when the sun drops to
      // DISTANT_OPACITY, stops writing depth, and would otherwise let the
      // planet show straight through it.
      const occlusion = getSunOcclusion(orbitRef.current.position, orbit.size / 2)
      // 90% of the planet's area behind the star — too little left to aim at.
      occludedRef.current = occlusion > 0.9

      if (model) {
        setModelOpacity(model, baseOpacity * (1 - occlusion))
        setModelEmphasis(model, 0, 0)
        /* Frame-rate independent easing: the fraction of the remaining gap
           closed per second is fixed, so this settles in the same wall-clock
           time at any refresh rate. A plain per-frame lerp would be twice as
           fast on a 120Hz display. A planet being swallowed by the star is
           not hoverable, so the occultation drags the glow down with it. */
        const target = isHovered ? 1 - occlusion : 0
        hoverGlowRef.current +=
          (target - hoverGlowRef.current) * (1 - Math.exp(-delta * HOVER_GLOW_RATE))
        setDitherHover(model, hoverGlowRef.current)

        /* Lit by the star, not by the camera. Without this every planet shows
           a full face at every point in its orbit, and the transit — the one
           moment the body is genuinely backlit — draws it as a bright moon
           sitting on the star instead of as the silhouette crossing it that a
           transit actually is. The position is already in star-centred
           coordinates, which is exactly what the phase angle needs.

           The floor falls away as the body moves onto the stellar disk, using
           the same overlap fraction the occultation uses on the far side. In
           open space the body keeps enough light to stay findable; crossing
           the star it is free to go fully black, which is what makes the
           transit read as a silhouette rather than as a grey patch. */
        const separation = Math.hypot(
          orbitRef.current.position.x,
          orbitRef.current.position.y,
        )
        const againstStar =
          orbitRef.current.position.z > 0
            ? bodyObscuration(SUN_RADIUS, orbit.size / 2, separation)
            : 0
        setDitherPhase(
          model,
          phaseFor(orbitRef.current.position, PHASE_FLOOR_IN_SPACE * (1 - againstStar)),
        )
      }
      if (labelRef.current) {
        labelRef.current.style.opacity = String(1 - occlusion)
      }
    }
  })

  const handleHover = (event: { stopPropagation: () => void }) => {
    if (isDisabled || occludedRef.current) return
    event.stopPropagation()
    onHover(data)
  }

  return (
    <group ref={orbitRef}>
      <group ref={visualRef}>
        <group rotation={[0, 0, orbit.axialTilt]}>
          <group ref={spinRef}>
            <Model
              url="/planet3d.glb"
              size={orbit.size}
              dither={PLANET_DITHER}
              onModelReady={(model) => {
                modelRefs.current[data.id] = model
              }}
            />
          </group>
        </group>
        {/* Invisible hit target — kept separate from the visible model so
            hover/click never depends on the model's exact (and sometimes
            irregular) rendered silhouette, and so axial spin can't move it. */}
        <mesh
          onClick={isDisabled ? undefined : (event: { stopPropagation: () => void }) => {
            if (occludedRef.current) return
            event.stopPropagation()
            onSelect(data.id)
          }}
          onPointerOver={isDisabled ? undefined : handleHover}
          onPointerOut={isDisabled ? undefined : () => onLeave(data)}
        >
          <sphereGeometry args={[getHitRadius(orbit.size), 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {moons.map((moon) => (
        <Moon key={moon.id} body={moon} parentSelected={isSelected} onSelect={onSelectProject} />
      ))}

      <Html
        position={[0, orbit.size / 2 + 16, 0]}
        center
        style={{
          pointerEvents: 'none',
          opacity: isSelected ? 0 : mode === 'compact' && !isHovered ? 0 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        <span ref={labelRef} className="three-planet-label">{data.label}</span>
      </Html>
    </group>
  )
}

interface SunProps {
  onHome: () => void
  transitionRef: TransitionRef
  isTransitioning: boolean
  transitRefs: TransitRefs
  /** Latest combined transit, published for any other system that wants it. */
  onTransitChange: (transit: Occultation) => void
}

function Sun({
  onHome,
  transitionRef,
  isTransitioning,
  transitRefs,
  onTransitChange,
}: SunProps) {
  const lastState = useRef<string>('clear')
  const reducedMotion = useReducedMotion()
  const groupRef = useRef<THREE.Group | null>(null)
  // Stale telemetry must not outlive the canvas; the strip reads it either way.
  useEffect(() => clearTelemetry, [])
  const { scene } = useGLTF('/sun3d.glb') as unknown as { scene: THREE.Group }
  const model = useMemo(() => scene.clone(true), [scene])
  const scale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model)
    const dimensions = bounds.getSize(new THREE.Vector3())
    model.position.sub(bounds.getCenter(new THREE.Vector3()))
    return SUN_SIZE / Math.max(dimensions.x, dimensions.y)
  }, [model])

  /* The star owns its materials for the same reason the planets do: the
     transit writes emissive per frame, and a shared material would leak that
     onto anything else cloned from the same GLB. */
  useEffect(() => {
    const release = isolateMaterials(model)
    applyDither(model, SUN_DITHER)
    return release
  }, [model])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = ((reducedMotion ? 0 : clock.elapsedTime) / SUN_ROTATION_PERIOD) * TAU
    const progress = transitionRef.current.progress
    const fadeT = phaseProgress(progress, 0, OPEN_PHASES.approach)
    setModelOpacity(groupRef.current, lerp(1, DISTANT_OPACITY, fadeT))

    const transit = combineTransits(Object.values(transitRefs.current), SUN_RADIUS)
    setStellarFlux(groupRef.current, transit.flux)

    /* Published for the telemetry strip, which lives outside the canvas and
       outside this lazily loaded chunk. A ref write per frame, never React
       state — the coverage number changing must not re-render the scene. */
    publishTelemetry(clock.elapsedTime, transit)

    // React only hears about phase changes, not every frame — the coverage
    // number itself stays in the frame loop where it belongs.
    if (transit.state !== lastState.current) {
      lastState.current = transit.state
      onTransitChange(transit)
    }
  })

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={model} onClick={isTransitioning ? undefined : onHome} />
    </group>
  )
}

export interface SceneProps {
  transitionRef: TransitionRef
  selectedId: string | null
  hoveredId: string | null
  isLocked: boolean
  isTransitioning: boolean
  onHover: (planet: PlanetContent) => void
  onLeave: (planet: PlanetContent) => void
  onSelect: (id: string) => void
  onHome: () => void
  onSelectProject: (id: string) => void
  previewRef: MutableRefObject<HTMLDivElement | null>
  /** 'compact' viewports draw labels only for the hovered or open body —
   *  five permanent labels over a tightened system is unreadable clutter. */
  mode: 'full' | 'compact'
  /** Fires on transit phase changes only, never per frame. */
  onTransitChange: (transit: Occultation) => void
}

function Scene({
  transitionRef,
  selectedId,
  hoveredId,
  isLocked,
  isTransitioning,
  onHover,
  onLeave,
  onSelect,
  onHome,
  onSelectProject,
  previewRef,
  mode,
  onTransitChange,
}: SceneProps) {
  const planetRefs: PlanetRefs = useRef({})
  const modelRefs: ModelRefs = useRef({})
  const transitRefs: TransitRefs = useRef({})
  const systemScale = useSystemScale()

  return (
    <>
      <CameraRig transitionRef={transitionRef} systemScale={systemScale} />
      <PreviewTracker
        hoveredId={hoveredId}
        planetRefs={planetRefs}
        previewRef={previewRef}
        systemScale={systemScale}
      />
      <ambientLight intensity={1.5} />
      <pointLight position={[-220, 180, 280]} intensity={2.4} />
      <pointLight position={[0, 0, 180]} intensity={0.8} />
      <Suspense fallback={null}>
        <group scale={systemScale}>
          {PLANET_BODIES.map((body) => (
            <OrbitRing key={body.id} orbit={body} transitionRef={transitionRef} />
          ))}
          <Sun
            onHome={onHome}
            transitionRef={transitionRef}
            isTransitioning={isTransitioning}
            transitRefs={transitRefs}
            onTransitChange={onTransitChange}
          />
          {PLANETS.map((planet) => (
            <Planet
              key={planet.id}
              data={planet}
              orbit={getBody(planet.id)!}
              onHover={onHover}
              onLeave={onLeave}
              onSelect={onSelect}
              transitionRef={transitionRef}
              planetRefs={planetRefs}
              modelRefs={modelRefs}
              isLocked={isLocked}
              selectedId={selectedId}
              onSelectProject={onSelectProject}
              mode={mode}
              isHovered={hoveredId === planet.id}
              transitRefs={transitRefs}
            />
          ))}
        </group>
      </Suspense>
    </>
  )
}

export default function ThreeSolarSystem(props: SceneProps) {
  return (
    <div className="three-solar-system">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1000], near: 0.1, far: 2000, zoom: 1 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/sun3d.glb')
useGLTF.preload('/planet3d.glb')
