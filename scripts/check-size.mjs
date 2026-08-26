#!/usr/bin/env node
/**
 * Size gate. Fails the build when a bundle or asset budget is exceeded.
 *
 * A budget enforced by intention is not enforced, so this exits non-zero.
 * It is expected to FAIL on the pre-Phase-01 baseline — that is the point:
 * a gate that passes on a known-broken build measures nothing.
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const PUBLIC = 'public'
const budget = JSON.parse(readFileSync('perf-budget.json', 'utf8'))

if (!existsSync(DIST)) {
  console.error('✗ no dist/ — run `npm run build` first')
  process.exit(1)
}

const gzipKB = (buf) => gzipSync(buf, { level: 9 }).length / 1024
const KB = (n) => `${n.toFixed(1)} KB`

const assetDir = join(DIST, 'assets')
const files = existsSync(assetDir) ? readdirSync(assetDir) : []

/* Vite names the entry chunk `index-*`; anything else emitted as .js is a
   split chunk. The scene chunk is whichever split chunk is largest — it is
   the three.js/R3F payload by a wide margin once splitting lands. */
const js = files.filter((f) => f.endsWith('.js'))
const entryFile = js.find((f) => f.startsWith('index-')) ?? js[0]
const splitFiles = js.filter((f) => f !== entryFile)

const entryKB = entryFile ? gzipKB(readFileSync(join(assetDir, entryFile))) : 0
const sceneKB = splitFiles.reduce((max, f) => Math.max(max, gzipKB(readFileSync(join(assetDir, f)))), 0)
const cssKB = files
  .filter((f) => f.endsWith('.css'))
  .reduce((sum, f) => sum + gzipKB(readFileSync(join(assetDir, f))), 0)

/**
 * Every file under public/, at any depth.
 *
 * This walked only the top level. Anything in a subdirectory — which is
 * exactly where project imagery would naturally go — was invisible to the
 * gate, so the budget would have reported green while the site got heavier.
 * A gate with a blind spot that big is worse than no gate, because it is
 * trusted.
 */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

const publicFiles = existsSync(PUBLIC) ? walk(PUBLIC) : []
const sizeKB = (f) => statSync(f).size / 1024
const sum = (fs) => fs.reduce((n, f) => n + sizeKB(f), 0)

/* Models and imagery are budgeted apart because they are not paid for by the
   same people. The 3D payload is desktop-only — a phone never requests a byte
   of it. Project imagery is fetched at every viewport, so per kilobyte it
   costs more, and letting the two share one pool would let models crowd out
   images or the reverse without either being visible. */
const modelFiles = publicFiles.filter((f) => /\.(glb|gltf|ktx2)$/i.test(f))
/* SVG counts. It was absent from the old pattern entirely, so hand-authored
   vector artwork — the kind most likely to be added next — weighed nothing as
   far as the gate was concerned. */
const imageFiles = publicFiles.filter((f) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f))

/* The total is the wrong alarm on its own: twenty tidy images and one
   forgotten 900KB export sum to the same number as twenty-one middling ones,
   and only the second is fine. The per-file cap is what actually catches an
   unoptimised drop-in. */
const heaviest = imageFiles.reduce(
  (worst, f) => (sizeKB(f) > worst.kb ? { file: f, kb: sizeKB(f) } : worst),
  { file: null, kb: 0 },
)

const checks = [
  ['entry JS (gzip, all devices)', entryKB, budget.entryJsGzipKB],
  ['scene JS (gzip, largest split)', sceneKB, budget.sceneJsGzipKB],
  ['CSS (gzip)', cssKB, budget.cssGzipKB],
  ['public 3D models (raw)', sum(modelFiles), budget.modelsKB],
  ['public imagery (raw)', sum(imageFiles), budget.imagesKB],
  ['largest single image', heaviest.kb, budget.maxImageKB],
]

let failed = 0
console.log('\n  budget check\n  ' + '─'.repeat(58))
for (const [label, actual, max] of checks) {
  const over = actual > max
  if (over) failed++
  const pct = max > 0 ? Math.round((actual / max) * 100) : 0
  console.log(
    `  ${over ? '✗' : '✓'} ${label.padEnd(32)} ${KB(actual).padStart(10)} / ${KB(max).padStart(9)}  ${pct}%`,
  )
}
console.log('  ' + '─'.repeat(58))

if (heaviest.file && heaviest.kb > budget.maxImageKB) {
  console.error(`  heaviest image: ${heaviest.file} at ${KB(heaviest.kb)}`)
  console.error('  convert to webp/avif and resize to the largest size actually rendered.')
}
if (splitFiles.length === 0) {
  console.log('  note: no code splitting — everything is in the entry chunk.')
}
console.log()

if (failed > 0) {
  console.error(`  ${failed} budget${failed > 1 ? 's' : ''} exceeded.\n`)
  process.exit(1)
}
console.log('  all budgets met.\n')
