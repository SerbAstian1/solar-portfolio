#!/usr/bin/env node
/**
 * Cuts an MP3 to a shorter loop without re-encoding it.
 *
 * An MP3 is a run of self-contained frames, each holding a fixed number of
 * samples, so a cut that lands on frame boundaries is a byte copy — the audio
 * that survives is bit-identical to the original. Re-encoding would have meant
 * a second generation of lossy compression on a file already at 64kbps, which
 * is where that starts to be audible.
 *
 * Usage:
 *   node scripts/trim-audio.mjs public/music.mp3 --seconds 180
 *   node scripts/trim-audio.mjs public/music.mp3 --seconds 180 --start 12
 *
 * --start skips into the track before cutting, for when the opening is an
 * intro that will not loop back on itself.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs'

const [input] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : Number(process.argv[i + 1])
}
const targetSeconds = arg('seconds', 180)
const startSeconds = arg('start', 0)

if (!input) {
  console.error('usage: node scripts/trim-audio.mjs <file.mp3> [--seconds N] [--start N]')
  process.exit(1)
}

const buf = readFileSync(input)

/* An ID3v2 tag is metadata, not audio: 'ID3', two version bytes, flags, then
   four syncsafe length bytes (7 bits each). It is carried over untouched —
   it is tiny, and it is where any title or attribution lives. */
let audioStart = 0
let tag = Buffer.alloc(0)
if (buf.toString('latin1', 0, 3) === 'ID3') {
  const size =
    ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
  audioStart = 10 + size
  tag = buf.subarray(0, audioStart)
}

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
const SAMPLE_RATES = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
}

/** Reads one frame header. Returns null when this is not a frame. */
function readFrame(at) {
  if (at + 4 > buf.length) return null
  if (buf[at] !== 0xff || (buf[at + 1] & 0xe0) !== 0xe0) return null
  const versionBits = (buf[at + 1] >> 3) & 3
  const layerBits = (buf[at + 1] >> 1) & 3
  if (versionBits === 1 || layerBits !== 1) return null // reserved, or not Layer III
  const rates = SAMPLE_RATES[versionBits]
  if (!rates) return null
  const sampleRate = rates[(buf[at + 2] >> 2) & 3]
  if (!sampleRate) return null
  const table = versionBits === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3
  const bitrate = table[(buf[at + 2] >> 4) & 0xf]
  if (!bitrate) return null
  const padding = (buf[at + 2] >> 1) & 1
  // MPEG-1 Layer III carries 1152 samples per frame; MPEG-2 and 2.5 carry 576.
  const samples = versionBits === 3 ? 1152 : 576
  const length = Math.floor((samples / 8) * 1000 * bitrate / sampleRate) + padding
  return { length, seconds: samples / sampleRate, sampleRate, bitrate }
}

/* A Xing or Info frame is the first frame of many encoders' output: silent,
   and carrying a frame count and byte length for the *whole* original file.
   Kept, those numbers would describe a file that no longer exists, and players
   would seek and report duration against fiction. Dropped instead. */
function isMetadataFrame(at, length) {
  const window = buf.toString('latin1', at + 4, Math.min(at + length, buf.length))
  return window.includes('Xing') || window.includes('Info')
}

let cursor = audioStart
// Walk to the first real frame; some files carry junk before it.
while (cursor < buf.length && !readFrame(cursor)) cursor += 1

const kept = []
let skipped = 0
let held = 0
let droppedMeta = 0

while (cursor < buf.length) {
  const frame = readFrame(cursor)
  if (!frame) break

  if (isMetadataFrame(cursor, frame.length)) {
    droppedMeta += 1
    cursor += frame.length
    continue
  }
  if (skipped < startSeconds) {
    skipped += frame.seconds
    cursor += frame.length
    continue
  }
  if (held >= targetSeconds) break

  kept.push(buf.subarray(cursor, cursor + frame.length))
  held += frame.seconds
  cursor += frame.length
}

if (kept.length === 0) {
  console.error('no audio frames found — is this an MP3?')
  process.exit(1)
}

const before = statSync(input).size
writeFileSync(input, Buffer.concat([tag, ...kept]))
const after = statSync(input).size

const mins = (s) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
console.log(`  trimmed ${input}`)
if (droppedMeta) console.log(`  dropped ${droppedMeta} metadata frame(s) (Xing/Info)`)
if (startSeconds) console.log(`  skipped first ${mins(skipped)}`)
console.log(`  kept    ${kept.length} frames, ${mins(held)}`)
console.log(`  size    ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB`)
