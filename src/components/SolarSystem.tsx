import { useEffect, useRef, useState } from 'react'
import { PLANETS } from '../data/planets'
import type { PlanetContent } from '../data/types'
import { usePlanetNavigation } from '../hooks/usePlanetNavigation'
import { OPEN_PHASES } from '../utils/transitionEasing'
import PlanetPreview from './PlanetPreview'
import PanelOverlay from './PanelOverlay'
import ThreeSolarSystem from './ThreeSolarSystem'

export interface SolarSystemProps {
  /** Routed section. App owns the URL; this component renders whatever it says. */
  sectionId: string | null
  navigate: (id: string | null) => void
}

export default function SolarSystem({ sectionId, navigate }: SolarSystemProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  /* Owned here so a moon click and a project card select the same thing.
     Project moon ids are the project ids, which is what lets the two
     surfaces address one another without a lookup table. */
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
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
    jumpTo,
  } = usePlanetNavigation()

  /**
   * The URL drives selection, never the other way round. Clicks call
   * navigate(); this effect turns whatever the URL now says into scene state,
   * so a click, a back button, a forward button and a pasted deep link all
   * travel the same path.
   */
  const hasSynced = useRef(false)
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true
      // Landing directly on /work should already be at /work, not fly there.
      if (sectionId !== null) jumpTo(sectionId)
      return
    }
    if (sectionId === selectedId) return

    setActiveProjectId(null)
    if (sectionId === null) closePanel()
    else if (selectedId === null) selectPlanet(sectionId)
    // Section to section (a history pop, usually): swap content immediately
    // and let the camera spring carry the viewpoint across.
    else jumpTo(sectionId)
  }, [sectionId, selectedId, selectPlanet, closePanel, jumpTo])

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
    <main className="scene" id="main-content">
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
        onSelect={(id: string) => navigate(id)}
        onSelectProject={setActiveProjectId}
        onHome={() => navigate(null)}
      />

      <PlanetPreview ref={previewRef} planet={hoveredPlanet} />

      <PanelOverlay
        planet={selectedPlanet}
        visible={panelVisible}
        activeProjectId={activeProjectId}
        onActiveProjectChange={setActiveProjectId}
        onClose={() => navigate(null)}
      />
    </main>
  )
}
