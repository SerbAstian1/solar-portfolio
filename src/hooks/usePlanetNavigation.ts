import { useCallback, useEffect, useRef, useState } from 'react'
import { OPEN_PHASES, TOTAL_CLOSE, TOTAL_OPEN } from '../utils/transitionEasing'

/** Direction of travel: 1 opens a panel, -1 closes it. */
export type TransitionDirection = 1 | -1

export interface TransitionState {
  active: boolean
  direction: TransitionDirection
  startTime: number
  /** 0 at the system view, 1 at the fully opened panel. Read every frame by
   *  the scene; deliberately not React state. */
  progress: number
  targetId: string | null
}

export interface PlanetNavigation {
  selectedId: string | null
  panelVisible: boolean
  isTransitioning: boolean
  isLocked: boolean
  transitionRef: React.MutableRefObject<TransitionState>
  selectPlanet: (id: string) => void
  closePanel: () => void
  /**
   * Resolve straight to a settled state with no phased transition.
   *
   * Used for deep links and for back/forward between two sections. Running
   * the full five-phase approach on page load would animate a camera journey
   * the visitor never asked for from a place they were never at; and on a
   * history pop it would contradict the instant feel of a browser button.
   * The camera spring still travels smoothly to the new target, because
   * retargeting mid-flight is what it is for.
   */
  jumpTo: (id: string | null) => void
}

/**
 * Manages planet selection transitions with phase timing.
 * React state updates only at phase boundaries; progress lives in a ref
 * so the 3D scene can read it every frame without re-renders.
 */
export function usePlanetNavigation(): PlanetNavigation {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionRef = useRef<TransitionState>({
    active: false,
    direction: 1,
    startTime: 0,
    progress: 0,
    targetId: null,
  })

  const rafRef = useRef<number | null>(null)

  const tick = useCallback(() => {
    const tr = transitionRef.current
    if (!tr.active) return

    const elapsed = performance.now() - tr.startTime
    // Closing runs on its own, shorter clock — see CLOSE_SCALE.
    const span = tr.direction === 1 ? TOTAL_OPEN : TOTAL_CLOSE
    const raw = Math.min(elapsed / span, 1)
    tr.progress = tr.direction === 1 ? raw : 1 - raw

    const opening = tr.direction === 1
    const isComplete = opening ? tr.progress >= 1 : tr.progress <= 0

    if (opening) {
      /* Overlapped with the camera rather than queued behind it. The panel
         begins as the approach ends and fades in *while* the system
         repositions, which is what removes the dead half-second where the
         camera had arrived and there was still nothing to read. */
      setPanelVisible(tr.progress >= OPEN_PHASES.approach)
      if (isComplete) {
        tr.active = false
        setIsTransitioning(false)
      }
    } else {
      if (tr.progress <= OPEN_PHASES.panel) setPanelVisible(false)
      if (isComplete) {
        tr.active = false
        tr.progress = 0
        setSelectedId(null)
        setIsTransitioning(false)
      }
    }

    if (tr.active) rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startTransition = useCallback(
    (direction: TransitionDirection, targetId: string) => {
      const tr = transitionRef.current
      if (tr.active) return false

      tr.active = true
      tr.direction = direction
      tr.startTime = performance.now()
      tr.targetId = targetId
      tr.progress = direction === 1 ? 0 : 1

      setIsTransitioning(true)
      if (direction === 1) setSelectedId(targetId)
      else setPanelVisible(false)

      rafRef.current = requestAnimationFrame(tick)
      return true
    },
    [tick],
  )

  const selectPlanet = useCallback(
    (id: string) => {
      if (transitionRef.current.active) return
      // Any existing selection blocks a new one; the panel must be closed
      // first so the camera has a defined place to travel from.
      if (selectedId !== null) return
      startTransition(1, id)
    },
    [selectedId, startTransition],
  )

  const closePanel = useCallback(() => {
    if (transitionRef.current.active) return
    if (selectedId === null) return
    startTransition(-1, selectedId)
  }, [selectedId, startTransition])

  const jumpTo = useCallback((id: string | null) => {
    const tr = transitionRef.current
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    tr.active = false
    tr.direction = id === null ? -1 : 1
    tr.targetId = id
    tr.progress = id === null ? 0 : 1

    setIsTransitioning(false)
    setSelectedId(id)
    setPanelVisible(id !== null)
  }, [])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return {
    selectedId,
    panelVisible,
    isTransitioning,
    isLocked: isTransitioning || selectedId !== null,
    transitionRef,
    selectPlanet,
    closePanel,
    jumpTo,
  }
}
