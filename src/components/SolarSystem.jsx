import { useEffect, useRef, useState } from 'react'
import { PLANETS } from '../data/planets.js'
import { usePlanetNavigation } from '../hooks/usePlanetNavigation.js'
import { OPEN_PHASES } from '../utils/transitionEasing.js'
import PlanetPreview from './PlanetPreview.jsx'
import PanelOverlay from './PanelOverlay.jsx'
import ThreeSolarSystem from './ThreeSolarSystem.jsx'

export default function SolarSystem() {
  const [hoveredId, setHoveredId] = useState(null)
  const starDimRef = useRef(null)
  const previewRef = useRef(null)
  const leaveTimeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(leaveTimeoutRef.current), [])

  const {
    selectedId,
    panelVisible,
    isTransitioning,
    isLocked,
    transitionRef,
    selectPlanet,
    closePanel,
  } = usePlanetNavigation()

  // Step 2 — dim stars via DOM ref (no React re-renders per frame).
  useEffect(() => {
    let raf
    const updateStarDim = () => {
      const progress = transitionRef.current.progress
      const dim = progress > 0 ? Math.min(progress / OPEN_PHASES.approach, 1) * 0.35 : 0
      if (starDimRef.current) starDimRef.current.style.opacity = String(dim)
      raf = requestAnimationFrame(updateStarDim)
    }
    raf = requestAnimationFrame(updateStarDim)
    return () => cancelAnimationFrame(raf)
  }, [transitionRef])

  const activeHoverId = isLocked ? null : hoveredId
  const hoveredPlanet = PLANETS.find((p) => p.id === activeHoverId) || null
  const selectedPlanet = PLANETS.find((p) => p.id === selectedId) || null

  return (
    <main className="scene">
      <div className="scene-star-dim" ref={starDimRef} aria-hidden="true" />

      <ThreeSolarSystem
        transitionRef={transitionRef}
        selectedId={selectedId}
        hoveredId={activeHoverId}
        isLocked={isLocked}
        isTransitioning={isTransitioning}
        previewRef={previewRef}
        onHover={(planet) => {
          if (isLocked) return
          clearTimeout(leaveTimeoutRef.current)
          setHoveredId(planet.id)
        }}
        onLeave={(planet) => {
          // Small grace period — a moving planet can momentarily drop out of
          // raycast range for a single frame; don't let that flicker the
          // tooltip closed if hover resumes right after. Scoped to the planet
          // that left, so a neighbour crossing the cursor can't close a
          // tooltip that belongs to someone else.
          clearTimeout(leaveTimeoutRef.current)
          leaveTimeoutRef.current = setTimeout(() => {
            setHoveredId((current) => (current === planet.id ? null : current))
          }, 150)
        }}
        onSelect={selectPlanet}
        onHome={closePanel}
      />

      <PlanetPreview ref={previewRef} planet={hoveredPlanet} />

      <PanelOverlay
        planet={selectedPlanet}
        visible={panelVisible}
        onClose={closePanel}
      />
    </main>
  )
}
