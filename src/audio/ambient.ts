/** The track, served from /public. */
const SOURCE = '/music.mp3'

/**
 * Playback level. Low on purpose — this sits under a room's own noise and
 * under whatever the visitor is already listening to.
 *
 * One constant, so "a little louder" is a one-line change.
 */
const MASTER_GAIN = 0.18

/** Fade applied on start and stop, so neither ever begins or ends abruptly. */
const FADE_SECONDS = 2.2

/**
 * Gently rolls the top off. Background music is fatiguing mostly in the treble,
 * and at this volume the high end is the part that cuts through a page rather
 * than sitting behind it. High enough not to muffle the track — it is a
 * softening, not a telephone filter.
 */
const TONE_HZ = 3200

export interface Ambient {
  /** Begins loading if it has not already, then fades in. */
  start: () => Promise<void>
  /** Fades out and pauses. */
  stop: () => Promise<void>
  /** Releases everything. */
  dispose: () => void
}

/**
 * Plays the site's background track.
 *
 * Streamed through an <audio> element rather than decoded into an AudioBuffer,
 * which matters more here than it usually would. The file is fourteen and a
 * half minutes long; `decodeAudioData` would hold all of it as uncompressed
 * float PCM, which for stereo at 44.1kHz is roughly 150MB of memory for a
 * 6.5MB download, and none of it would play until the whole file had arrived.
 * An element streams: audio starts within a second or two and memory stays
 * flat.
 *
 * The element is still routed through Web Audio rather than played directly,
 * because `HTMLAudioElement.volume` cannot be ramped — every fade would be a
 * step. A GainNode can be scheduled on the audio clock, which is what makes
 * starting and stopping smooth.
 *
 * `preload="none"` is the other half of the size story: nothing is fetched
 * until someone actually asks for sound, so the 6.5MB is never paid by a
 * visitor who leaves it off.
 */
export function createAmbient(): Ambient {
  const el = new Audio()
  el.src = SOURCE
  el.loop = true
  el.preload = 'none'
  /* Same-origin, but stated anyway: without it a cross-origin file would
     silently produce a Web Audio graph that outputs nothing but silence. */
  el.crossOrigin = 'anonymous'

  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctor()

  const source = ctx.createMediaElementSource(el)
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = TONE_HZ
  tone.Q.value = 0.3

  const master = ctx.createGain()
  master.gain.value = 0

  source.connect(tone)
  tone.connect(master)
  master.connect(ctx.destination)

  let running = false

  const rampTo = (value: number, seconds: number) => {
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    // Anchored at the current value first, or a ramp from a scheduled-but-not-
    // reached value jumps before it starts.
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(value, now + seconds)
  }

  return {
    async start() {
      if (running) return
      running = true
      // A context begins suspended until a gesture resumes it, which is also
      // what stops any of this from autoplaying.
      if (ctx.state === 'suspended') await ctx.resume()
      // Silent before play, so the opening moment is faded in rather than
      // arriving at full level.
      master.gain.value = 0
      await el.play()
      rampTo(MASTER_GAIN, FADE_SECONDS)
    },
    async stop() {
      if (!running) return
      running = false
      rampTo(0, FADE_SECONDS * 0.6)
      // Paused only once silent; pausing on the instant would clip.
      await new Promise((r) => setTimeout(r, FADE_SECONDS * 600 + 60))
      if (!running) el.pause()
    },
    dispose() {
      running = false
      el.pause()
      // Dropping the src releases the buffered audio; leaving it attached
      // keeps the download alive on a page that has finished with it.
      el.removeAttribute('src')
      el.load()
      source.disconnect()
      tone.disconnect()
      master.disconnect()
      void ctx.close()
    },
  }
}
