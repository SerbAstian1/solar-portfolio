import { useEffect } from 'react'

/**
 * Everything that should acknowledge a press.
 *
 * Kept as one list rather than a prop on each component because the ripple is
 * a property of the interface, not of any one button — a new control should
 * get it by being a control, without anyone remembering to opt in.
 */
const RIPPLE_TARGETS = [
  '.btn-outline',
  '.panel-close',
  '.project-card',
  '.price-tier',
  '.mobile-tile',
  '.ground-option',
  '.swatch',
].join(',')

/** How long the ripple takes to travel and fade. Mirrored in the stylesheet. */
export const RIPPLE_MS = 520

/**
 * The radius a ripple must reach to cover the whole element from where it
 * started.
 *
 * It is the distance to the furthest corner, not half the width: a press near
 * one edge is further from the opposite corner than from the centre, and a
 * circle sized for the centre would stop short and read as a bubble rather
 * than as the surface responding.
 */
export function rippleRadius(
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const dx = Math.max(x, width - x)
  const dy = Math.max(y, height - y)
  return Math.hypot(dx, dy)
}

/** Honoured at press time rather than subscribed to, so a visitor changing the
 *  setting mid-session is respected without re-binding anything. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Adds a press ripple to every control on the page, from one listener.
 *
 * Bound on `pointerdown`, not click. A control that acknowledges on release
 * feels dead even when the total elapsed time is identical, because what is
 * being designed here is perceived latency rather than duration — the response
 * has to be inside the same frame as the press.
 *
 * Delegated at the document rather than attached per element: controls come
 * and go as panels open, projects expand and sections render, and a per-node
 * listener would need adding and removing on each of those. One listener has
 * no lifecycle to get wrong.
 */
export function useRipple(): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (prefersReducedMotion()) return
      // Secondary and middle presses open menus and tabs; neither is the kind
      // of activation this is acknowledging.
      if (event.button !== 0) return

      const target = (event.target as Element | null)?.closest?.(RIPPLE_TARGETS)
      if (!(target instanceof HTMLElement)) return
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return

      const rect = target.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const radius = rippleRadius(rect.width, rect.height, x, y)

      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      // aria-hidden and pointer-events:none in CSS: this is decoration, and it
      // must never sit between the pointer and the control it is decorating.
      ripple.setAttribute('aria-hidden', 'true')
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.style.width = `${radius * 2}px`
      ripple.style.height = `${radius * 2}px`

      /* Cleaned up on whichever comes first: the animation ending, or a
         timeout. animationend does not fire if the element is hidden or its
         animation is dropped, and a ripple that is never removed leaks a node
         onto every press for the life of the page. */
      let done = false
      const remove = () => {
        if (done) return
        done = true
        ripple.remove()
      }
      ripple.addEventListener('animationend', remove, { once: true })
      window.setTimeout(remove, RIPPLE_MS + 120)

      target.appendChild(ripple)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])
}
