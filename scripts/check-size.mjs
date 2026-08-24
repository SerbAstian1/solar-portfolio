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

const assetKB = existsSync(PUBLIC)
  ? readdirSync(PUBLIC)
      .filter((f) => /\.(glb|gltf|png|jpe?g|webp|avif|ktx2)$/i.test(f))
      .reduce((sum, f) => sum + statSync(join(PUBLIC, f)).size / 1024, 0)
  : 0

const checks = [
  ['entry JS (gzip, all devices)', entryKB, budget.entryJsGzipKB],
  ['scene JS (gzip, largest split)', sceneKB, budget.sceneJsGzipKB],
  ['CSS (gzip)', cssKB, budget.cssGzipKB],
  ['public 3D assets (raw)', assetKB, budget.assetsKB],
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

if (splitFiles.length === 0) {
  console.log('  note: no code splitting — everything is in the entry chunk.')
}
console.log()

if (failed > 0) {
  console.error(`  ${failed} budget${failed > 1 ? 's' : ''} exceeded.\n`)
  process.exit(1)
}
console.log('  all budgets met.\n')
