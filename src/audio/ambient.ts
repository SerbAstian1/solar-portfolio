/**
 * A calm orchestral drone, generated in the browser.
 *
 * There is no audio file. The site could not use the score it was modelled on
 * — that music is owned, and a lo-fi cover of it needs the composition rights
 * just as the original does — so the character is built rather than borrowed:
 * sustained low chords with a slow figure moving above them. Style is not
 * ownable; a particular piece of music is.
 *
 * Three things fall out of generating it that a file would not have given.
 * It costs about four kilobytes of code rather than several megabytes of
 * audio, against a scene chunk already at 95% of its budget. It never loops
 * audibly, because there is no loop — the chord cycle and the arpeggio run on
 * different periods and drift against each other. And it starts instantly,
 * with nothing to download.
 *
 * The pad's oscillators are never restarted. Chord changes glide the existing
 * voices to their new pitches, which is both why it sounds like one continuous
 * instrument and why there is never a click at a chord boundary.
 */

/** Chord cycle, as frequencies in Hz. A minor, low and open. */
const CHORDS: readonly (readonly number[])[] = [
  [110.0, 164.81, 220.0, 261.63], // Am  — A2 E3 A3 C4
  [87.31, 130.81, 174.61, 220.0], // F   — F2 C3 F3 A3
  [130.81, 196.0, 261.63, 329.63], // C  — C3 G3 C4 E4
  [98.0, 146.83, 196.0, 246.94], // G   — G2 D3 G3 B3
]

/** Seconds each chord is held. Long: this is furniture, not a progression
 *  anyone is meant to follow. */
const CHORD_SECONDS = 14
/** Seconds between arpeggio notes. Deliberately not a factor of the chord
 *  length, so the two never line up the same way twice. */
const ARP_SECONDS = 2.9
/** Master level. Low enough to sit under a room's own noise. */
const MASTER_GAIN = 0.16
/** Fade applied when starting and stopping, so neither ever clicks. */
const FADE_SECONDS = 1.6

/**
 * A reverb tail, synthesised rather than loaded.
 *
 * Exponentially decaying noise is a crude impulse response and exactly right
 * here: the point is to blur the pad into a space, not to model a hall. The
 * two channels get independent noise so the tail is wide rather than centred.
 */
function buildReverb(ctx: AudioContext, seconds = 3.4): AudioBuffer {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const buffer = ctx.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      const decay = (1 - i / length) ** 2.6
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }
  return buffer
}

export interface Ambient {
  /** Resumes and fades in. Safe to call when already playing. */
  start: () => Promise<void>
  /** Fades out and suspends. The graph stays built so a restart is instant. */
  stop: () => Promise<void>
  /** Releases everything. */
  dispose: () => void
}

/**
 * Builds the graph. Nothing is audible until `start`.
 *
 * The AudioContext is created here rather than at module load: a context made
 * before a user gesture begins life suspended in most browsers, and one made
 * on a page nobody ever asked for sound on is a resource taken for nothing.
 */
export function createAmbient(): Ambient {
  const Ctor: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctor()

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  /* A gentle low-pass over everything. Rolling the top off is most of what
     makes a synthesised pad read as "orchestral" rather than as an organ. */
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1100
  tone.Q.value = 0.4
  tone.connect(master)

  const reverb = ctx.createConvolver()
  reverb.buffer = buildReverb(ctx)
  const reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.55
  reverbSend.connect(reverb)
  reverb.connect(master)

  /* Pad voices: one per chord tone, plus a detuned twin on each so the pair
     beat slowly against one another. Beating is what stops a sustained
     synthetic chord sounding dead. */
  const voices = CHORDS[0]!.map((freq, i) => {
    const gain = ctx.createGain()
    gain.gain.value = i === 0 ? 0.30 : 0.16
    gain.connect(tone)
    gain.connect(reverbSend)

    const make = (detune: number) => {
      const osc = ctx.createOscillator()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(gain)
      osc.start()
      return osc
    }
    return { oscillators: [make(-4), make(5)] }
  })

  /** Slides every pad voice to a new chord. setTargetAtTime rather than a
   *  jump: the glide is the sound, and it is also why nothing clicks. */
  const glideTo = (chord: readonly number[]) => {
    voices.forEach((voice, i) => {
      const target = chord[i] ?? chord[chord.length - 1]!
      for (const osc of voice.oscillators) {
        osc.frequency.setTargetAtTime(target, ctx.currentTime, 2.2)
      }
    })
  }

  /** One arpeggio note: a short voice that is created, played and discarded. */
  const pluck = (freq: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.09, now + 0.6)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5)
    osc.connect(gain)
    gain.connect(tone)
    gain.connect(reverbSend)
    osc.start(now)
    osc.stop(now + 4.6)
    // Freed when it finishes; nothing accumulates over a long session.
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }

  let chordIndex = 0
  let arpIndex = 0
  let chordTimer: ReturnType<typeof setInterval> | null = null
  let arpTimer: ReturnType<typeof setInterval> | null = null
  let running = false

  const startTimers = () => {
    glideTo(CHORDS[chordIndex]!)
    chordTimer = setInterval(() => {
      chordIndex = (chordIndex + 1) % CHORDS.length
      glideTo(CHORDS[chordIndex]!)
    }, CHORD_SECONDS * 1000)

    arpTimer = setInterval(() => {
      const chord = CHORDS[chordIndex]!
      // Walks the chord an octave up, so the figure always belongs to
      // whatever the pad is currently holding.
      pluck(chord[arpIndex % chord.length]! * 2)
      arpIndex += 1
    }, ARP_SECONDS * 1000)
  }

  const stopTimers = () => {
    if (chordTimer) clearInterval(chordTimer)
    if (arpTimer) clearInterval(arpTimer)
    chordTimer = null
    arpTimer = null
  }

  return {
    async start() {
      if (running) return
      running = true
      // Browsers start a context suspended until a gesture resumes it, which
      // is also the behaviour that keeps this from ever autoplaying.
      if (ctx.state === 'suspended') await ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(MASTER_GAIN, ctx.currentTime + FADE_SECONDS)
      startTimers()
    },
    async stop() {
      if (!running) return
      running = false
      stopTimers()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_SECONDS * 0.5)
      // Suspended once silent, not merely muted: a muted context still runs
      // its graph and still costs CPU on a page nobody is listening to.
      await new Promise((r) => setTimeout(r, FADE_SECONDS * 500 + 60))
      if (!running && ctx.state === 'running') await ctx.suspend()
    },
    dispose() {
      stopTimers()
      running = false
      for (const voice of voices) {
        for (const osc of voice.oscillators) {
          try {
            osc.stop()
          } catch {
            // Already stopped; nothing to undo.
          }
          osc.disconnect()
        }
      }
      void ctx.close()
    },
  }
}
