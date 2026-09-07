import { useEffect } from 'react'

/**
 * Everything that should acknowledge a press.
 *
 * One list rather than a prop on each component: the echo is a property of the
 * interface, not of any one control, so a new control gets it by being a
 * control instead of by remembering to opt in.
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

/** How many outlines go out on a press. */
export const RING_COUNT = 3
/** Distance between one outline and the next, in pixels. */
export const RING_GAP = 9
/** How long a single outline takes to fade. Mirrored in the stylesheet. */
export const RING_MS = 460
/** Delay between one outline starting and the next. Mirrored in the stylesheet. */
export const RING_STAGGER = 90
/** Room the overlay needs around the control for the outermost ring. */
export const RING_MARGIN = RING_COUNT * RING_GAP + 2
/** When the last ring has finished and the overlay can go. */
export const RIPPLE_TOTAL_MS = RING_MS + RING_STAGGER * (RING_COUNT - 1)

/**
 * The control's own silhouette, offset outward by `d`.
 *
 * Written as an SVG polygon rather than a bordered box because the controls
 * are chamfered, and a CSS border under a clip-path loses the diagonal — the
 * clip removes the corner and takes that stretch of border with it, leaving
 * the outline visibly broken exactly where it should be most machined. A
 * stroked polygon has no such problem: the diagonal is simply one more edge.
 *
 * The offset expands the box by `d` on every side while leaving the cut the
 * same length, which is what a true parallel offset of a 45-degree chamfer
 * does — the diagonal moves outward perpendicular to itself and does not grow.
 * Scaling would have been easier and wrong: a 227x40 button scaled to cover
 * the same distance vertically would travel four times as far horizontally,
 * and the echo would read as stretching sideways rather than radiating.
 */
export function chamferPoints(
  width: number,
  height: number,
  cut: number,
  d: number,
): string {
  const x = RING_MARGIN - d
  const y = RING_MARGIN - d
  const w = width + d * 2
  const h = height + d * 2
  // A cut longer than the box it is cut from would fold the shape inside out.
  const c = Math.max(0, Math.min(cut, Math.min(w, h)))
  if (c === 0) {
    return `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`
  }
  return [
    `${x},${y}`,
    `${x + w},${y}`,
    `${x + w},${y + h - c}`,
    `${x + w - c},${y + h}`,
    `${x},${y + h}`,
  ].join(' ')
}

/** Honoured at press time rather than subscribed to, so a visitor changing the
 *  setting mid-session is respected without re-binding anything. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/** The chamfer size the stylesheet gave this control, or 0 where it has none. */
function readCut(el: Element): number {
  const raw = getComputedStyle(el).getPropertyValue('--cut').trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * Echoes a control's outline outward on press.
 *
 * The overlay is appended to `document.body`, not to the control. It has to
 * be: every one of these controls carries a `clip-path` for its chamfer, and a
 * clip-path clips descendants, so anything drawn inside the button is confined
 * to the button. An echo that must travel *outside* the edges cannot be a
 * child of the thing it is escaping.
 *
 * Bound on pointerdown, not click. A control that acknowledges on release
 * feels dead even when the total elapsed time is identical, because what is
 * being designed here is perceived latency rather than duration.
 *
 * Delegated at the document rather than attached per element: controls come
 * and go as panels open and sections render, and a per-node listener would
 * need adding and removing on each of those.
 */
export function useRipple(): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (prefersReducedMotion()) return
      // Secondary and middle presses open menus and tabs; neither is the kind
      // of activation this acknowledges.
      if (event.button !== 0) return

      const target = (event.target as Element | null)?.closest?.(RIPPLE_TARGETS)
      if (!(target instanceof HTMLElement)) return
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return

      const rect = target.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const cut = readCut(target)
      const boxW = rect.width + RING_MARGIN * 2
      const boxH = rect.height + RING_MARGIN * 2

      const host = document.createElement('div')
      host.className = 'ripple-echo'
      host.setAttribute('aria-hidden', 'true')
      host.style.left = `${rect.left - RING_MARGIN}px`
      host.style.top = `${rect.top - RING_MARGIN}px`
      host.style.width = `${boxW}px`
      host.style.height = `${boxH}px`
      /* Takes the control's own text colour, so the echo is white on a resting
         button and brand orange on a hovered one without being told which. */
      host.style.color = getComputedStyle(target).color

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`)
      svg.setAttribute('width', `${boxW}`)
      svg.setAttribute('height', `${boxH}`)

      for (let i = 0; i < RING_COUNT; i += 1) {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        poly.setAttribute('points', chamferPoints(rect.width, rect.height, cut, (i + 1) * RING_GAP))
        poly.setAttribute('class', 'ripple-ring')
        // Each outline waits its turn, so three static shapes read as one
        // wave travelling outward rather than as a box appearing three times.
        poly.style.animationDelay = `${i * RING_STAGGER}ms`
        svg.appendChild(poly)
      }
      host.appendChild(svg)

      /* Removed on whichever comes first: the last ring ending, or a timeout.
         animationend does not fire if the element is hidden or its animation
         is dropped, and an overlay that is never removed leaks a node onto
         every press for the life of the page. */
      let done = false
      const remove = () => {
        if (done) return
        done = true
        host.remove()
      }
      svg.lastElementChild?.addEventListener('animationend', remove, { once: true })
      window.setTimeout(remove, RIPPLE_TOTAL_MS + 150)

      document.body.appendChild(host)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])
}
