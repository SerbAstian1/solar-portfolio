import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { PLANETS } from '../data/planets.js'
import { lerp, OPEN_PHASES, phaseProgress } from '../utils/transitionEasing.js'

const SUN_SIZE = 138
const SUN_RADIUS = SUN_SIZE / 2
const SUN_ROTATION_PERIOD = 70
const SUN_OCCLUSION_SOFTNESS = 26

// Sine of the angle between the orbital plane and the view plane. Steep enough
// that every orbit reads as an ellipse rather than a flat line, which means
// only the innermost planet ever crosses the sun's disc — the outer ones pass
// above and below it, the way an inclined view of a real system looks.
const ORBIT_TILT = 0.38
const ORBIT_DEPTH = Math.sqrt(1 - ORBIT_TILT ** 2)

// The sun sits at one focus of each ellipse, so an eccentric orbit is offset
// from centre. Sharing one perihelion direction keeps the rings near
// concentric (~78 units apart at their tightest) instead of pinching together.
const PERIHELION = 0.6
const PERIHELION_COS = Math.cos(PERIHELION)
const PERIHELION_SIN = Math.sin(PERIHELION)

// Kepler's third law — period grows with the semi-major axis to the 3/2 power,
// anchored on the innermost orbit. This is what makes the system read as one:
// the inner planet visibly laps the outer ones.
const BASE_SEMI_MAJOR = 170
const BASE_PERIOD = 48

const SELECTED_SCALE = 2.5
const DISTANT_OPACITY = 0.45
const ORBIT_OPACITY_REST = 0.26
const ORBIT_OPACITY_DIM = 0.08

const LABEL_HEADROOM = 30
const VIEWPORT_PADDING = 40
const MIN_SYSTEM_SCALE = 0.3

/**
 * Orbital elements plus render size for each planet. `meanAnomaly` is where
 * the planet sits at t=0 and `spin` is its axial rotation period in seconds.
 */
const ORBITS = {
  work: { semiMajor: 170, eccentricity: 0.055, meanAnomaly: 1.6, spin: 11, axialTilt: 0.24, size: 34 },
  services: { semiMajor: 250, eccentricity: 0.045, meanAnomaly: 0.7, spin: 15, axialTilt: -0.16, size: 46 },
  about: { semiMajor: 330, eccentricity: 0.04, meanAnomaly: 3.9, spin: 9, axialTilt: 0.41, size: 30 },
  pricing: { semiMajor: 410, eccentricity: 0.035, meanAnomaly: 2.3, spin: 19, axialTilt: -0.3, size: 52 },
  contact: { semiMajor: 490, eccentricity: 0.03, meanAnomaly: 5.1, spin: 13, axialTilt: 0.19, size: 36 },
}

// Pointer target stays close to the visible planet. The tooltip now follows
// the planet as it moves, so an oversized target that no longer matches what
// you can see buys nothing and makes near-conjunctions ambiguous.
const MIN_HIT_RADIUS = 26
function getHitRadius(size) {
  return Math.max(size / 2 + 12, MIN_HIT_RADIUS)
}

function orbitalPeriod(semiMajor) {
  return BASE_PERIOD * (semiMajor / BASE_SEMI_MAJOR) ** 1.5
}

/**
 * Newton solve of Kepler's equation, M = E − e·sin E. Converges to well past
 * float precision in three passes at these eccentricities. Going through the
 * eccentric anomaly rather than sweeping the angle directly is what gives the
 * planets Kepler's second law — faster at perihelion, slower at aphelion.
 */
function eccentricAnomaly(meanAnomaly, eccentricity) {
  let E = meanAnomaly
  for (let i = 0; i < 3; i += 1) {
    E -= (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E))
  }
  return E
}

/** Point on the tilted ellipse with the sun at one focus. */
function getOrbitPosition(orbit, E, target) {
  const alongMajor = orbit.semiMajor * (Math.cos(E) - orbit.eccentricity)
  const alongMinor = orbit.semiMajor * Math.sqrt(1 - orbit.eccentricity ** 2) * Math.sin(E)
  const planar = alongMajor * PERIHELION_COS - alongMinor * PERIHELION_SIN
  const depth = alongMajor * PERIHELION_SIN + alongMinor * PERIHELION_COS
  return target.set(planar, depth * ORBIT_TILT, depth * ORBIT_DEPTH)
}

/** Half-extents the whole system needs on screen, sampled off the real curves. */
const SYSTEM_EXTENT = (() => {
  const point = new THREE.Vector3()
  let x = 0
  let y = 0
  Object.values(ORBITS).forEach((orbit) => {
    for (let i = 0; i < 360; i += 1) {
      getOrbitPosition(orbit, (i / 360) * Math.PI * 2, point)
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
function getSunOcclusion(position) {
  if (position.z >= 0) return 0
  const screenDist = Math.hypot(position.x, position.y)
  const edge = SUN_RADIUS + SUN_OCCLUSION_SOFTNESS
  if (screenDist >= edge) return 0
  if (screenDist <= SUN_RADIUS) return 1
  return 1 - (screenDist - SUN_RADIUS) / SUN_OCCLUSION_SOFTNESS
}

/** Apply emissive emphasis to GLB mesh materials — lightweight glow substitute. */
function setModelEmphasis(object, emphasis, settledDim = 0) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((mat) => {
      if (!mat.emissive) return
      const glow = Math.max(0, emphasis - settledDim * 0.5)
      mat.emissive.setRGB(0.18 * glow, 0.14 * glow, 0.08 * glow)
      mat.emissiveIntensity = glow * 0.55
    })
  })
}

/** Reduce overall mesh opacity for atmospheric background role. */
function setModelOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((mat) => {
      mat.transparent = opacity < 1
      mat.opacity = opacity
    })
  })
}

function PixelCamera({ transitionRef, planetRefs }) {
  const { camera, size } = useThree()
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
function PreviewTracker({ hoveredId, planetRefs, previewRef, systemScale }) {
  const { camera, size } = useThree()
  const projected = useRef(new THREE.Vector3())
  const measured = useRef({ id: null, width: 0, height: 0 })
  const flipped = useRef(false)

  useFrame(() => {
    const anchor = previewRef.current
    const planetGroup = hoveredId ? planetRefs.current[hoveredId] : null
    const slot = anchor?.firstElementChild
    if (!anchor || !planetGroup || !slot) return

    // Card size only changes when the copy does, and reading it forces layout.
    // A zero height means the card hasn't mounted yet, so keep re-measuring.
    if (measured.current.id !== hoveredId || measured.current.height === 0) {
      measured.current = { id: hoveredId, width: slot.offsetWidth, height: slot.offsetHeight }
    }

    planetGroup.getWorldPosition(projected.current)
    projected.current.project(camera)
    const screenX = (projected.current.x * 0.5 + 0.5) * size.width
    const screenY = (-projected.current.y * 0.5 + 0.5) * size.height

    const gap = (ORBITS[hoveredId].size / 2) * systemScale + 20
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

function Model({ url, size, onModelReady }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    const cloned = scene.clone(true)
    // Purely visual — all pointer interaction goes through the dedicated
    // invisible hit-sphere, so this shouldn't compete for raycast hits.
    cloned.traverse((child) => {
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

function OrbitRing({ orbit, transitionRef }) {
  const lineRef = useRef(null)
  const geometry = useMemo(() => {
    const point = new THREE.Vector3()
    const points = Array.from({ length: 161 }, (_, index) => {
      getOrbitPosition(orbit, (index / 160) * Math.PI * 2, point)
      return point.clone()
    })
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [orbit])

  useFrame(() => {
    if (!lineRef.current) return
    const progress = transitionRef.current.progress
    const fadeT = phaseProgress(progress, 0, OPEN_PHASES.approach)
    lineRef.current.material.opacity = lerp(ORBIT_OPACITY_REST, ORBIT_OPACITY_DIM, fadeT)
  })

  return (
    <line ref={lineRef} geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color="#fff" transparent opacity={ORBIT_OPACITY_REST} />
    </line>
  )
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
}) {
  const orbitRef = useRef(null)
  const visualRef = useRef(null)
  const spinRef = useRef(null)
  const offsetRef = useRef(new THREE.Vector3())
  const occludedRef = useRef(false)
  const labelRef = useRef(null)
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

    const meanAnomaly = orbit.meanAnomaly + (clock.elapsedTime / period) * Math.PI * 2
    getOrbitPosition(orbit, eccentricAnomaly(meanAnomaly, orbit.eccentricity), orbitRef.current.position)

    if (spinRef.current) {
      spinRef.current.rotation.y = (clock.elapsedTime / orbit.spin) * Math.PI * 2
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

  const handleHover = (event) => {
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
          onClick={isDisabled ? undefined : (event) => {
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

function Sun({ onHome, transitionRef, isTransitioning }) {
  const groupRef = useRef(null)
  const { scene } = useGLTF('/sun3d.glb')
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
}) {
  const planetRefs = useRef({})
  const modelRefs = useRef({})
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
          {PLANETS.map((planet) => (
            <OrbitRing key={planet.id} orbit={ORBITS[planet.id]} transitionRef={transitionRef} />
          ))}
          <Sun onHome={onHome} transitionRef={transitionRef} isTransitioning={isTransitioning} />
          {PLANETS.map((planet) => (
            <Planet
              key={planet.id}
              data={planet}
              orbit={ORBITS[planet.id]}
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

export default function ThreeSolarSystem(props) {
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
