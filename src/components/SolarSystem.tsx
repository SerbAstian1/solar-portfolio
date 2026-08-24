import { useEffect, useRef, useState } from 'react'
import { PLANETS } from '../data/planets'
import type { PlanetContent } from '../data/types'
import { usePlanetNavigation } from '../hooks/usePlanetNavigation'
import { OPEN_PHASES } from '../utils/transitionEasing'
import PlanetPreview from './PlanetPreview'
import PanelOverlay from './PanelOverlay'
import ThreeSolarSystem from './ThreeSolarSystem'

export default function SolarSystem() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const starDimRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (leaveTimeoutRef.current !== null) clearTimeout(leaveTimeoutRef.current)
    },
    [],
  )

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
    let raf = 0
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
        onHover={(planet: PlanetContent) => {
          if (isLocked) return
          if (leaveTimeoutRef.current !== null) clearTimeout(leaveTimeoutRef.current)
          setHoveredId(planet.id)
        }}
        onLeave={(planet: PlanetContent) => {
          // Small grace period — a moving planet can momentarily drop out of
          // raycast range for a single frame; don't let that flicker the
          // tooltip closed if hover resumes right after. Scoped to the planet
          // that left, so a neighbour crossing the cursor can't close a
          // tooltip that belongs to someone else.
          if (leaveTimeoutRef.current !== null) clearTimeout(leaveTimeoutRef.current)
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
