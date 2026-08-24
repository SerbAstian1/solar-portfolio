import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { TransitionState } from '../hooks/usePlanetNavigation'
import type { PlanetContent } from '../data/types'
import { PLANETS } from '../data/planets'
import {
  BASE_PERIOD,
  BASE_SEMI_MAJOR,
  ORBIT_DEPTH,
  ORBIT_TILT,
  PLANET_BODIES,
  TAU,
  eccentricAnomaly,
  getBody,
  meanAnomalyAt,
  orbitPosition,
  orbitalPeriod,
} from '../orbital'
import type { CelestialBody } from '../orbital'
import { lerp, OPEN_PHASES, phaseProgress } from '../utils/transitionEasing'

type TransitionRef = MutableRefObject<TransitionState>
type PlanetRefs = MutableRefObject<Record<string, THREE.Group | null>>
type ModelRefs = MutableRefObject<Record<string, THREE.Object3D | null>>

const SUN_SIZE = 138
const SUN_RADIUS = SUN_SIZE / 2
const SUN_ROTATION_PERIOD = 70
const SUN_OCCLUSION_SOFTNESS = 26

const SELECTED_SCALE = 2.5
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
 * 0 when a planet is fully visible, 1 when it should be fully hidden behind
 * the sun. Only triggers when the planet is actually farther from the camera
 * than the sun (negative z) AND within the sun's on-screen radius — a planet
 * passing in front of the sun (positive z) is left alone; normal depth
 * testing already paints it over the sun correctly in that case.
 */
function getSunOcclusion(position: THREE.Vector3): number {
  if (position.z >= 0) return 0
  const screenDist = Math.hypot(position.x, position.y)
  const edge = SUN_RADIUS + SUN_OCCLUSION_SOFTNESS
  if (screenDist >= edge) return 0
  if (screenDist <= SUN_RADIUS) return 1
  return 1 - (screenDist - SUN_RADIUS) / SUN_OCCLUSION_SOFTNESS
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
      standard.emissive.setRGB(0.18 * glow, 0.14 * glow, 0.08 * glow)
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

interface PixelCameraProps {
  transitionRef: TransitionRef
  planetRefs: PlanetRefs
}

function PixelCamera({ transitionRef, planetRefs }: PixelCameraProps) {
  const { camera: rawCamera, size } = useThree()
  const camera = rawCamera as THREE.OrthographicCamera
  const driftTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    camera.left = -size.width / 2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = -size.height / 2
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useFrame(() => {
    const tr = transitionRef.current
    const progress = tr.progress
    const selectedId = tr.targetId

    let driftAmount = 0
    if (selectedId && progress > 0) {
      // Step 2 — subtle camera drift toward the selected planet.
      const approachT = phaseProgress(progress, 0, OPEN_PHASES.approach)
      const repositionT = phaseProgress(progress, OPEN_PHASES.approach, OPEN_PHASES.reposition)
      driftAmount = Math.max(approachT, repositionT)

      const planetGroup = planetRefs.current[selectedId]
      if (planetGroup) {
        planetGroup.getWorldPosition(driftTarget.current)
        const targetX = driftTarget.current.x * 0.22
        const targetY = driftTarget.current.y * 0.12
        camera.position.x = lerp(0, targetX, driftAmount)
        camera.position.y = lerp(0, targetY, driftAmount)
      }
    } else {
      camera.position.x = lerp(camera.position.x, 0, 0.12)
      camera.position.y = lerp(camera.position.y, 0, 0.12)
    }

    // Step 4+ — camera stops once panel phase begins.
    if (progress >= OPEN_PHASES.reposition) {
      const planetGroup = selectedId ? planetRefs.current[selectedId] : null
      if (planetGroup) {
        planetGroup.getWorldPosition(driftTarget.current)
        camera.position.x = driftTarget.current.x * 0.22
        camera.position.y = driftTarget.current.y * 0.12
      }
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
  onModelReady?: (model: THREE.Object3D | null) => void
}

function Model({ url, size, onModelReady }: ModelProps) {
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
}: PlanetProps) {
  const orbitRef = useRef<THREE.Group | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)
  const spinRef = useRef<THREE.Group | null>(null)
  const offsetRef = useRef(new THREE.Vector3())
  const occludedRef = useRef(false)
  const labelRef = useRef<HTMLSpanElement | null>(null)
  const isSelected = selectedId === data.id
  const isDisabled = isLocked
  const period = useMemo(() => orbitalPeriod(orbit.semiMajor), [orbit])

  useEffect(() => {
    planetRefs.current[data.id] = orbitRef.current
    return () => {
      delete planetRefs.current[data.id]
    }
  }, [data.id, planetRefs])

  useFrame(({ clock, size }) => {
    if (!orbitRef.current) return

    const meanAnomaly = meanAnomalyAt(orbit, clock.elapsedTime)
    orbitPosition(
      orbit,
      eccentricAnomaly(meanAnomaly, orbit.eccentricity),
      orbitRef.current.position,
    )

    if (spinRef.current) {
      spinRef.current.rotation.y = (clock.elapsedTime / orbit.spin) * TAU
    }

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

      // Step 2 — scale only after highlight phase completes.
      const scale = progress <= OPEN_PHASES.highlight
        ? 1
        : lerp(1, SELECTED_SCALE, approachT)
      visual.scale.setScalar(scale)

      // Step 3 — drift selected planet toward the left viewport edge.
      const repositionT = phaseProgress(progress, OPEN_PHASES.approach, OPEN_PHASES.reposition)
      const leftOffset = lerp(0, -size.width * 0.28, repositionT)
      offsetRef.current.set(leftOffset, repositionT * 12, 0)
      visual.position.copy(offsetRef.current)

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

      // Occultation: hide the planet when its orbit carries it behind and
      // within the sun's silhouette — passing in front is left to normal depth
      // testing, which already paints it over the sun. With the plane properly
      // tilted only the innermost orbit reaches the sun's disc at all.
      const occlusion = getSunOcclusion(orbitRef.current.position)
      occludedRef.current = occlusion > 0.9

      if (model) {
        setModelOpacity(model, baseOpacity * (1 - occlusion))
        setModelEmphasis(model, 0, 0)
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
      <Html
        position={[0, orbit.size / 2 + 16, 0]}
        center
        style={{
          pointerEvents: 'none',
          opacity: isSelected ? 0 : 1,
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
}

function Sun({ onHome, transitionRef, isTransitioning }: SunProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const { scene } = useGLTF('/sun3d.glb') as unknown as { scene: THREE.Group }
  const model = useMemo(() => scene.clone(true), [scene])
  const scale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model)
    const dimensions = bounds.getSize(new THREE.Vector3())
    model.position.sub(bounds.getCenter(new THREE.Vector3()))
    return SUN_SIZE / Math.max(dimensions.x, dimensions.y)
  }, [model])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = (clock.elapsedTime / SUN_ROTATION_PERIOD) * Math.PI * 2
    const progress = transitionRef.current.progress
    const fadeT = phaseProgress(progress, 0, OPEN_PHASES.approach)
    setModelOpacity(groupRef.current, lerp(1, DISTANT_OPACITY, fadeT))
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
  previewRef: MutableRefObject<HTMLDivElement | null>
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
  previewRef,
}: SceneProps) {
  const planetRefs: PlanetRefs = useRef({})
  const modelRefs: ModelRefs = useRef({})
  const systemScale = useSystemScale()

  return (
    <>
      <PixelCamera transitionRef={transitionRef} planetRefs={planetRefs} />
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
          <Sun onHome={onHome} transitionRef={transitionRef} isTransitioning={isTransitioning} />
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
