import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { useScramble } from '../hooks/useScramble'

/**
 * The label, one fixed-width cell per character.
 *
 * Fixing the whole label's width was necessary but not sufficient. Inside a
 * stable box, a proportional face still re-lays-out the line every time a
 * glyph is swapped: an `m` standing in for an `i` pushes everything after it
 * along, and the next frame pulls it back. The container stops moving and the
 * letters underneath it wobble, which is the jitter that survived the first
 * fix.
 *
 * So each character gets its own cell, sized by an invisible copy of the
 * *settled* character and holding the live glyph absolutely on top of it. A
 * substitute can now be any width it likes without moving anything: it
 * overflows its own cell, centred, and its neighbours never learn about it.
 * Nothing in the line reflows between the first frame and the last.
 *
 * All of it is aria-hidden — a name assembled from per-character spans would
 * be read letter by letter even when it happened to be settled — so the
 * accessible name comes from an aria-label on the control itself.
 */
/* A real space in an inline-block cell collapses and the word gap vanishes; a
   non-breaking one holds the cell open. Written as an escape rather than as
   the character itself, which is invisible in an editor. */
const NBSP = '\u00a0'

/** What to paint in a cell, with spaces made non-collapsing. */
function cellGlyph(char: string): string {
  return char === ' ' ? NBSP : char
}

function ScrambleLabel({ display, label }: { display: string; label: string }) {
  return (
    <span className="btn-label" aria-hidden="true">
      {[...label].map((char, i) => (
        // Index keys: this is a fixed-length positional row, and the character
        // at a given slot is exactly what is meant to change.
        // eslint-disable-next-line react/no-array-index-key
        <span className="btn-char" key={i}>
          <span className="btn-char-size">{cellGlyph(char)}</span>
          <span className="btn-char-live">{cellGlyph(display[i] ?? char)}</span>
        </span>
      ))}
    </span>
  )
}

/** Wires hover and focus to the scramble without swallowing a caller's own
 *  handlers for those events. */
function useScrambleTriggers<E extends HTMLElement>(
  label: string,
  handlers: {
    onMouseEnter?: (e: React.MouseEvent<E>) => void
    onMouseLeave?: (e: React.MouseEvent<E>) => void
    onFocus?: (e: React.FocusEvent<E>) => void
    onBlur?: (e: React.FocusEvent<E>) => void
  },
) {
  const { display, start, reset } = useScramble(label)
  return {
    display,
    triggers: {
      onMouseEnter: (e: React.MouseEvent<E>) => {
        start()
        handlers.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent<E>) => {
        reset()
        handlers.onMouseLeave?.(e)
      },
      onFocus: (e: React.FocusEvent<E>) => {
        start()
        handlers.onFocus?.(e)
      },
      onBlur: (e: React.FocusEvent<E>) => {
        reset()
        handlers.onBlur?.(e)
      },
    },
  }
}

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

/**
 * The container's geometry never animates — only the text inside re-renders
 * while the scramble runs.
 *
 * `type` defaults to "button". A bare <button> inside or adjacent to a form
 * defaults to "submit", and this one sits directly below the contact form.
 */
export default function OutlineButton({
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: OutlineButtonProps) {
  const label = typeof children === 'string' ? children : ''
  const { display, triggers } = useScrambleTriggers<HTMLButtonElement>(label, {
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  })

  return (
    <button
      type="button"
      className={`btn-outline ${className}`.trim()}
      aria-label={label || undefined}
      {...triggers}
      {...props}
    >
      {label ? <ScrambleLabel display={display} label={label} /> : children}
    </button>
  )
}

interface OutlineLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode
}

/**
 * The same control rendered as an anchor.
 *
 * It exists so that a link wearing this style behaves like one. The markup
 * previously applied `.btn-outline` straight to an <a>, which picked up the
 * border and padding but none of the text behaviour — two things that looked
 * identical and did not act alike.
 */
export function OutlineLink({
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: OutlineLinkProps) {
  const label = typeof children === 'string' ? children : ''
  const { display, triggers } = useScrambleTriggers<HTMLAnchorElement>(label, {
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  })

  return (
    <a
      className={`btn-outline ${className}`.trim()}
      aria-label={label || undefined}
      {...triggers}
      {...props}
    >
      {label ? <ScrambleLabel display={display} label={label} /> : children}
    </a>
  )
}
