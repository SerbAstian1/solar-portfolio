import { useCallback, useEffect, useRef, useState } from 'react'
import { createAmbient, type Ambient } from '../audio/ambient'

/**
 * The one control for the site's sound.
 *
 * Off on arrival, every time, and deliberately not remembered between visits.
 * A stored preference sounds considerate and cannot actually be honoured:
 * browsers refuse to start audio without a gesture, so a page that remembered
 * "on" would either sit silent while claiming to play, or ambush someone the
 * moment they clicked something unrelated. Within a visit it stays on — the
 * app never remounts on navigation — which is the part that was ever worth
 * keeping.
 *
 * It does not retract with the telemetry rail when a panel opens, though it
 * sits beside it. The rail is decoration and can leave; this is the only way
 * to stop a sound that is still playing, and a stop control that hides while
 * the thing it stops keeps running is the one state it must never be in. The
 * panel is docked right, so there is nothing for it to collide with.
 */
export default function SoundToggle() {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const ambient = useRef<Ambient | null>(null)

  // Built on first use, not on mount: a page nobody asked for sound on should
  // not be holding an audio context open.
  const instance = useCallback(() => {
    if (!ambient.current) ambient.current = createAmbient()
    return ambient.current
  }, [])

  useEffect(() => () => ambient.current?.dispose(), [])

  /* Sound from a tab nobody is looking at is the single most irritating thing
     a site can do, and the visitor often cannot find which tab it is. */
  useEffect(() => {
    if (!playing) return
    const onVisibility = () => {
      if (document.hidden) void ambient.current?.stop()
      else void ambient.current?.start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [playing])

  const toggle = async () => {
    try {
      if (playing) {
        setPlaying(false)
        await instance().stop()
      } else {
        await instance().start()
        setPlaying(true)
      }
    } catch {
      /* Web Audio is refused often enough to plan for: an autoplay policy that
         did not accept the gesture, a locked-down browser, no output device.
         The control removes itself rather than sitting there doing nothing. */
      setFailed(true)
      setPlaying(false)
    }
  }

  if (failed) return null

  return (
    <button
      type="button"
      className={`sound-toggle ${playing ? 'is-on' : ''}`}
      onClick={toggle}
      aria-pressed={playing}
      /* The label says what pressing it does, not what the state is — a
         screen reader already announces the state from aria-pressed, and
         hearing "sound on, pressed" is a riddle. */
      aria-label={playing ? 'Turn sound off' : 'Turn sound on'}
    >
      {/* Three bars that stand up when it is playing. Drawn rather than set as
          a glyph so the two states are the same shape moving, and so it needs
          no icon font. */}
      <span className="sound-bars" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="sound-label">{playing ? 'Sound on' : 'Sound'}</span>
    </button>
  )
}
