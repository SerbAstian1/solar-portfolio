import { useEffect, useRef } from 'react'
import { cursorDisplacement } from '../orbital/cursorField'
import { BAYER_8 } from '../render/bayer'

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

interface Comet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  delay: number
}

interface DitherCanvasProps {
  /** Normalised position of the star's glow centre, 0-1 of the viewport. */
  sunPos?: { x: number; y: number }
}

function pseudoNoise(x: number, y: number, t: number): number {
  // Cheap layered sine "noise" — deterministic, fast, good enough for animated grain.
  const n =
    Math.sin(x * 0.021 + t * 0.00012) * Math.cos(y * 0.017 - t * 0.00009) * 0.5 +
    Math.sin((x + y) * 0.011 + t * 0.00021) * 0.5
  return (n + 1) / 2 // 0..1
}

/**
 * Renders a true ordered-dither field to a low-res offscreen canvas each frame,
 * then blits it up with nearest-neighbor scaling for a chunky, print-halftone look.
 * Stars and comets are drawn as a separate crisp layer on top.
 */
export default function DitherCanvas({ sunPos = { x: 0.5, y: 0.42 } }: DitherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const rawCtx = canvasEl.getContext('2d')
    if (!rawCtx) return

    // Re-bound with non-nullable declared types. TS does not carry the
    // null-guard narrowing into the hoisted function declarations below,
    // so the guard is done once here and the rest of the effect uses these.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = rawCtx

    const DITHER_SCALE = 12 // smaller scale = tighter, denser grain
    let low: HTMLCanvasElement
    let lctx: CanvasRenderingContext2D
    let w = 0
    let h = 0
    let lw = 0
    let lh = 0
    let stars: Star[] = []
    let comets: Comet[] = []

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      lw = Math.ceil(w / DITHER_SCALE)
      lh = Math.ceil(h / DITHER_SCALE)
      low = document.createElement('canvas')
      low.width = lw
      low.height = lh
      const lowCtx = low.getContext('2d')
      if (!lowCtx) return
      lctx = lowCtx

      stars = Array.from({ length: 160 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0015 + Math.random() * 0.002,
      }))
      comets = Array.from({ length: 2 }, (_, i) => makeComet(i))
    }

    function makeComet(seed: number): Comet {
      return {
        x: w * (0.5 + Math.random() * 0.4),
        y: h * (0.05 + Math.random() * 0.3),
        vx: -(2.2 + Math.random() * 1.4),
        vy: 1.1 + Math.random() * 0.9,
        life: 0,
        maxLife: 140 + Math.random() * 80,
        delay: seed * 300 + Math.random() * 400,
      }
    }

    function drawDitherField(t: number) {
      const imgData = lctx.createImageData(lw, lh)
      const cx = lw * sunPos.x
      const cy = lh * sunPos.y
      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < lw; x++) {
          const dx = (x - cx) / lw
          const dy = (y - cy) / lh
          const dist = Math.sqrt(dx * dx + dy * dy)
          const glow = Math.max(0, 1 - dist * 1.6) // brighter near sun
          const noise = pseudoNoise(x, y, t)
          const value = Math.min(1, glow * 0.55 + noise * 0.3)

          const bx = x % 8
          const by = y % 8
          const threshold = BAYER_8[by * 8 + bx] ?? 0
          const on = value > threshold

          const idx = (y * lw + x) * 4
          if (on) {
            imgData.data[idx] = 255
            imgData.data[idx + 1] = 255
            imgData.data[idx + 2] = 255
            imgData.data[idx + 3] = Math.min(18, glow * 27) // softer, subtler grain
          } else {
            imgData.data[idx + 3] = 0
          }
        }
      }
      lctx.putImageData(imgData, 0, 0)
    }

    function draw(t: number) {
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      drawDitherField(t)
      ctx.drawImage(low, 0, 0, lw, lh, 0, 0, w, h)

      // Stars
      stars.forEach((s: Star) => {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase))
        ctx.globalAlpha = tw
        ctx.fillStyle = '#fff'
        // Bounded inverse-square nudge away from the pointer. Applied at draw
        // time rather than integrated into the star's stored position, so the
        // field returns to rest exactly when the pointer leaves and cannot
        // accumulate drift over a long session.
        const push = pointer.active
          ? cursorDisplacement(s.x, s.y, pointer.x, pointer.y)
          : { dx: 0, dy: 0 }
        ctx.beginPath()
        ctx.arc(s.x + push.dx, s.y + push.dy, s.r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Comets
      comets.forEach((c: Comet, i: number) => {
        c.life += 1
        if (c.life < c.delay) return
        const localLife = c.life - c.delay
        if (localLife > c.maxLife) {
          comets[i] = makeComet(i)
          return
        }
        const progress = localLife / c.maxLife
        const cx2 = c.x + c.vx * localLife
        const cy2 = c.y + c.vy * localLife
        const alpha = Math.sin(progress * Math.PI) // fade in/out
        const grad = ctx.createLinearGradient(cx2, cy2, cx2 - c.vx * 26, cy2 - c.vy * 26)
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(cx2, cy2)
        ctx.lineTo(cx2 - c.vx * 26, cy2 - c.vy * 26)
        ctx.stroke()
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.beginPath()
        ctx.arc(cx2, cy2, 1.6, 0, Math.PI * 2)
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Pointer position, in a ref rather than state: this is read once per
       frame by the draw loop and must never cause a React render. Reduced
       motion opts out of the disturbance entirely — it is ambient motion the
       visitor did not ask for. */
    const pointer = { x: -1e6, y: -1e6, active: false }
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }
    const onPointerLeave = () => {
      pointer.active = false
    }
    if (!reduceMotion) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave)
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduceMotion) {
      draw(0) // single static frame, no animation loop
    } else {
      rafRef.current = requestAnimationFrame(draw)
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [sunPos.x, sunPos.y])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
      aria-hidden="true"
    />
  )
}
