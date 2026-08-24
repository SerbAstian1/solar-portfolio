import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Makes a dialog actually behave like one.
 *
 * The panel already declared role="dialog" aria-modal="true" while
 * implementing none of the behaviour those attributes promise: focus never
 * entered, Tab walked out into the scene behind it, Escape did nothing, and
 * focus never returned to whatever opened it. Claiming modality without
 * providing it misleads screen-reader users more than plain markup would.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): void {
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    restoreTo.current = document.activeElement as HTMLElement | null

    // Move focus in. Prefer the heading so a screen reader announces what
    // opened rather than reading out the close button first.
    const heading = container.querySelector<HTMLElement>('h2, h3')
    const target = heading ?? container.querySelector<HTMLElement>(FOCUSABLE) ?? container
    if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape()
        return
      }
      if (event.key !== 'Tab') return

      // Re-queried every keypress: the panel's content changes when a project
      // card opens, so a list captured on mount would go stale.
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) return

      const first = items[0]!
      const last = items[items.length - 1]!
      const activeEl = document.activeElement

      if (event.shiftKey && (activeEl === first || activeEl === container || activeEl === heading)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Only restore if focus is still inside the closing dialog; the visitor
      // may have clicked elsewhere deliberately.
      if (container.contains(document.activeElement)) {
        restoreTo.current?.focus({ preventScroll: true })
      }
    }
  }, [active, containerRef, onEscape])
}
