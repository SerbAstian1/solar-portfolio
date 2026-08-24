import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

/**
 * The container (border, padding, hit area) never animates its geometry.
 * Only the text node inside re-renders during the hover typewriter effect,
 * so the button never jumps, resizes, or flickers as a whole.
 */
export default function OutlineButton({
  children,
  onClick,
  className = '',
  ...props
}: OutlineButtonProps) {
  const label = typeof children === 'string' ? children : ''
  const { display, isTyping, start, reset } = useTypewriter(label)

  return (
    <button
      className={`btn-outline ${className}`}
      onMouseLeave={reset}
      onFocus={start}
      onBlur={reset}
      onClick={onClick}
      {...props}
    >
      <span className="btn-text" onMouseEnter={start} onMouseLeave={reset}>
        {display}
      </span>
      <span className="btn-text-hidden" aria-hidden="true">{label}</span>
      <span className={`caret ${isTyping ? 'is-typing' : ''}`} aria-hidden="true" />
    </button>
  )
}
