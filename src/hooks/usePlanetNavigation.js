import { useCallback, useEffect, useRef, useState } from 'react'
import { OPEN_PHASES, TOTAL_OPEN } from '../utils/transitionEasing.js'

/**
 * Manages planet selection transitions with phase timing.
 * React state updates only at phase boundaries; progress lives in a ref
 * so the 3D scene can read it every frame without re-renders.
 */
export function usePlanetNavigation() {
  const [selectedId, setSelectedId] = useState(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionRef = useRef({
    active: false,
    direction: 1,
    startTime: 0,
    progress: 0,
    targetId: null,
  })

  const rafRef = useRef(null)

  const tick = useCallback(() => {
    const tr = transitionRef.current
    if (!tr.active) return

    const elapsed = performance.now() - tr.startTime
    const raw = Math.min(elapsed / TOTAL_OPEN, 1)
    tr.progress = tr.direction === 1 ? raw : 1 - raw

    const opening = tr.direction === 1
    const shouldShowPanel = tr.progress >= OPEN_PHASES.reposition
    const isComplete = opening ? tr.progress >= 1 : tr.progress <= 0

    if (opening) {
      setPanelVisible(shouldShowPanel)
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

    if (tr.active) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [])

  const startTransition = useCallback(
    (direction, targetId) => {
      const tr = transitionRef.current
      if (tr.active) return false

      tr.active = true
      tr.direction = direction
      tr.startTime = performance.now()
      tr.targetId = targetId
      tr.progress = direction === 1 ? 0 : 1

      setIsTransitioning(true)

      if (direction === 1) {
        setSelectedId(targetId)
      } else {
        setPanelVisible(false)
      }

      rafRef.current = requestAnimationFrame(tick)
      return true
    },
    [tick],
  )

  const selectPlanet = useCallback(
    (id) => {
      if (transitionRef.current.active) return
      if (selectedId && selectedId !== id) return
      if (selectedId === id && panelVisible) return
      if (selectedId === id) return
      startTransition(1, id)
    },
    [selectedId, panelVisible, startTransition],
  )

  const closePanel = useCallback(() => {
    if (transitionRef.current.active) return
    if (!selectedId) return
    startTransition(-1, selectedId)
  }, [selectedId, startTransition])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const isLocked = isTransitioning || Boolean(selectedId)

  return {
    selectedId,
    panelVisible,
    isTransitioning,
    isLocked,
    transitionRef,
    selectPlanet,
    closePanel,
  }
}
