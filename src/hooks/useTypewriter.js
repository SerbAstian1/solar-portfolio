import { useCallback, useRef, useState } from 'react'

/**
 * Animates a string char-by-char. Intended to be applied to the inner
 * <span class="btn-text"> of a button only — the button/container itself
 * never re-renders its border, fill, or size during this animation.
 */
export function useTypewriter(fullText, speed = 28) {
  const [display, setDisplay] = useState(fullText)
  const [isTyping, setIsTyping] = useState(false)
  const intervalRef = useRef(null)
  const indexRef = useRef(0)

  const start = useCallback(() => {
    clearInterval(intervalRef.current)
    indexRef.current = 0
    setDisplay('')
    setIsTyping(true)
    intervalRef.current = setInterval(() => {
      indexRef.current += 1
      setDisplay(fullText.slice(0, indexRef.current))
      if (indexRef.current >= fullText.length) {
        clearInterval(intervalRef.current)
        setIsTyping(false)
      }
    }, speed)
  }, [fullText, speed])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setIsTyping(false)
    setDisplay(fullText)
  }, [fullText])

  return { display, isTyping, start, reset }
}
