import { useEffect, useState } from 'react'
import { TIPS } from '../data/tips'
import { useReducedMotion } from '../hooks/useMediaQuery'

/** How often the clock refreshes. Keeps the seconds digit within a quarter of
 *  a second of true without rendering every frame. */
const SAMPLE_MS = 250
/** How long each slide holds before the next takes over. */
const SLIDE_MS = 6000

const pad = (n: number) => String(n).padStart(2, '0')

/** Offset as the visitor's own clock expresses it, e.g. "+01:00". */
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

/** The clock, ticking on its own timer rather than on the slide timer. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), SAMPLE_MS)
    return () => clearInterval(id)
  }, [])
  return now
}

export interface TelemetryStripProps {
  /** True while a panel is open. The rail is scene furniture, and the scene is
   *  backgrounded then — so it steps down with it. */
  retracted?: boolean
}

export default function TelemetryStrip({ retracted = false }: TelemetryStripProps) {
  const now = useNow()
  const reducedMotion = useReducedMotion()
  const [cycle, setCycle] = useState(0)

  /* Where in the deck this visit starts. Chosen once per mount, so two
     sessions do not open on the same tip, and walked forward from there rather
     than reshuffled — which is what stops a tip repeating before the other
     ninety-nine have had their turn. */
  const [deckOffset] = useState(() => Math.floor(Math.random() * TIPS.length))

  /* Auto-advance is auto-updating content, which WCAG 2.2.2 asks to be
     pausable. Reduced motion is the signal available here, so the rail holds
     on the clock — the slide carrying information a visitor might be after. */
  const paused = reducedMotion
  useEffect(() => {
    if (paused) {
      setCycle(0)
      return
    }
    const id = setInterval(() => setCycle((c) => c + 1), SLIDE_MS)
    return () => clearInterval(id)
  }, [paused])

  /* Tip, clock, tip, clock. Even cycles are tips and odd ones the clock, so
     the time is never more than one slide away no matter where the deck is. */
  const showingTip = !paused && cycle % 2 === 0
  const tipNumber = (deckOffset + Math.floor(cycle / 2)) % TIPS.length
  const tip = TIPS[tipNumber]!

  /* Tips carry no number — the point of the rail is the line itself, and a
     "TIP 07" in front of it just files a label on a sentence. The tip sits in
     the centre slot, where the clock keeps its date. */
  const left = showingTip
    ? ''
    : `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const centre = showingTip
    ? tip.text
    : `${DAYS[now.getDay()]} ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const right = showingTip ? (tip.source ?? '') : `UTC${utcOffset(now)}`

  return (
    <div
      className={`telemetry ${retracted ? 'is-retracted' : ''}`}
      role="status"
      aria-live="off"
      // Out of the reading order entirely while retracted: a rail that is
      // invisible but still announced is worse than one that is neither.
      aria-hidden={retracted || undefined}
    >
      {/* Keyed on the slide so the entrance replays when the slide turns over,
          but not when the seconds digit ticks — which would otherwise fade the
          clock in and out four times a second. */}
      <div
        className={`telemetry-row ${showingTip ? 'is-tip' : 'is-clock'}`}
        key={showingTip ? `tip-${tipNumber}` : 'clock'}
      >
        <span className="telemetry-field is-left">{left}</span>
        <span className="telemetry-field is-centre">{centre}</span>
        <span className="telemetry-field is-right">{right}</span>
      </div>
    </div>
  )
}
