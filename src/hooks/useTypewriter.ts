import { useCallback, useEffect, useRef, useState } from 'react'

export interface Typewriter {
  display: string
  isTyping: boolean
  start: () => void
  reset: () => void
}

/**
 * Animates a string char-by-char. Intended to be applied to the inner
 * <span class="btn-text"> of a button only — the button/container itself
 * never re-renders its border, fill, or size during this animation.
 */
export function useTypewriter(fullText: string, speed = 28): Typewriter {
  const [display, setDisplay] = useState(fullText)
  const [isTyping, setIsTyping] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const indexRef = useRef(0)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    stop()
    indexRef.current = 0
    setDisplay('')
    setIsTyping(true)
    intervalRef.current = setInterval(() => {
      indexRef.current += 1
      setDisplay(fullText.slice(0, indexRef.current))
      if (indexRef.current >= fullText.length) {
        stop()
        setIsTyping(false)
      }
    }, speed)
  }, [fullText, speed, stop])

  const reset = useCallback(() => {
    stop()
    setIsTyping(false)
    setDisplay(fullText)
  }, [fullText, stop])

  // The interval outlives the component without this; it was previously
  // never cleared on unmount.
  useEffect(() => stop, [stop])

  return { display, isTyping, start, reset }
}
