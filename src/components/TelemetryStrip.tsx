import { useEffect, useMemo, useRef, useState } from 'react'
import { getBody } from '../orbital/elements'
import { timeToNextTransit, transitSchedule } from '../orbital/schedule'
import { sceneTelemetry } from '../orbital/telemetry'
import { useReducedMotion } from '../hooks/useMediaQuery'

/** Matches SUN_SIZE / 2 in the scene. */
const STAR_RADIUS = 69
/** How often the readout refreshes. Fast enough for a ticking second, far
 *  slower than the frame loop it reads from. */
const SAMPLE_MS = 250
/** How long each slide holds before the next one takes over. */
const SLIDE_MS = 6000

interface Slide {
  readonly id: string
  readonly left: string
  readonly centre: string
  readonly right: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Offset as the visitor's clock actually expresses it, e.g. "+01:00". */
function utcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

function clockSlide(now: Date): Slide {
  return {
    id: 'clock',
    left: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    centre: `${DAYS[now.getDay()]} ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    right: `UTC${utcOffset(now)}`,
  }
}

/**
 * The strip's own state, sampled rather than subscribed.
 *
 * The scene publishes to a module singleton every frame; reading it during
 * render would change values under React without React knowing, so it is
 * copied into state on a timer instead. Four samples a second is enough for a
 * seconds display and a countdown, and costs four renders a second rather than
 * sixty.
 */
function useTelemetrySample() {
  const [sample, setSample] = useState(() => ({
    now: new Date(),
    active: false,
    elapsed: 0,
    coverage: 0,
    flux: 1,
    state: sceneTelemetry.transit.state,
  }))

  useEffect(() => {
    const read = () => {
      setSample({
        now: new Date(),
        active: sceneTelemetry.active,
        elapsed: sceneTelemetry.elapsed,
        coverage: sceneTelemetry.transit.coverage,
        flux: sceneTelemetry.transit.flux,
        state: sceneTelemetry.transit.state,
      })
    }
    read()
    const id = setInterval(read, SAMPLE_MS)
    return () => clearInterval(id)
  }, [])

  return sample
}

interface TelemetryStripProps {
  /** True while a panel is open. The strip is scene instrumentation, and the
   *  scene is backgrounded then — so it steps down with it. */
  retracted?: boolean
}

export default function TelemetryStrip({ retracted = false }: TelemetryStripProps) {
  const sample = useTelemetrySample()
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  /* Walked once, not per frame — and only for the body that actually reaches
     the disk. Every other planet returns null and contributes no slide. */
  const schedule = useMemo(() => {
    const work = getBody('work')
    return work ? transitSchedule(work, STAR_RADIUS) : null
  }, [])

  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [clockSlide(sample.now)]
    if (!sample.active) return list

    if (schedule) {
      const until = timeToNextTransit(schedule, sample.elapsed)
      list.push(
        until === 0
          ? { id: 'transit', left: 'TRANSIT', centre: 'IN PROGRESS', right: 'WORK' }
          : {
              id: 'transit',
              left: 'NEXT TRANSIT',
              centre: `T−${pad(Math.floor(until / 60))}:${pad(Math.floor(until % 60))}`,
              right: 'WORK',
            },
      )
    }

    list.push({
      id: 'flux',
      left: 'STELLAR FLUX',
      // Two decimals: the deepest dip this system produces is about 6%, and a
      // whole-number readout would sit at 100 through most of the event.
      centre: `${(sample.flux * 100).toFixed(2)}%`,
      right: sample.coverage > 0 ? 'OBSTRUCTED' : 'NOMINAL',
    })

    list.push({
      id: 'state',
      left: 'STAR',
      centre: sample.state.replace('-', ' ').toUpperCase(),
      right: sample.coverage > 0 ? `${(sample.coverage * 100).toFixed(1)}% COVERED` : 'CLEAR',
    })

    return list
  }, [sample, schedule])

  /* Auto-advance is auto-updating content, which WCAG 2.2.2 asks to be
     pausable. Reduced motion is the signal available here, so the strip stops
     rotating and holds the clock — which is the slide carrying information the
     visitor might actually want. */
  const count = slides.length
  const paused = reducedMotion || count <= 1
  useEffect(() => {
    if (paused) {
      setIndex(0)
      return
    }
    const id = setInterval(() => setIndex((i) => i + 1), SLIDE_MS)
    return () => clearInterval(id)
  }, [paused])

  const slide = slides[index % count] ?? slides[0]!
  /* Keyed on the slide's identity so the fade restarts when the slide changes
     but not when its numbers tick. Without this the flux readout would fade
     out and back in four times a second. */
  const previousId = useRef(slide.id)
  const changed = previousId.current !== slide.id
  previousId.current = slide.id

  return (
    <div
      className={`telemetry ${retracted ? 'is-retracted' : ''}`}
      role="status"
      aria-live="off"
      // Removed from the reading order entirely while retracted: a strip that
      // is invisible but still announced is worse than one that is neither.
      aria-hidden={retracted || undefined}
    >
      <div className={`telemetry-row ${changed ? 'is-entering' : ''}`} key={slide.id}>
        <span className="telemetry-field is-left">{slide.left}</span>
        <span className="telemetry-field is-centre">{slide.centre}</span>
        <span className="telemetry-field is-right">{slide.right}</span>
      </div>
      {!paused && (
        <div className="telemetry-ticks" aria-hidden="true">
          {slides.map((s, i) => (
            <span
              key={s.id}
              className={`telemetry-tick ${i === index % count ? 'is-active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
