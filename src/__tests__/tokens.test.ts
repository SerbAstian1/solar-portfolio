import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DURATION, EASE_OUT_EXPO, EASE_OUT_EXPO_CSS } from '../motion'
import { RING_MS } from '../hooks/useRipple'

const globalCss = readFileSync('src/styles/global.css', 'utf8')
const sceneCss = readFileSync('src/styles/scene.css', 'utf8')
const allCss = globalCss + sceneCss

function token(name: string): string {
  const match = globalCss.match(new RegExp(`--${name}\s*:\s*([^;]+);`))
  if (!match) throw new Error(`token --${name} is not defined`)
  return match[1]!.trim()
}

describe('motion tokens stay in sync across CSS and JS', () => {
  it('defines the same easing curve in both places', () => {
    expect(token('ease-out')).toBe(EASE_OUT_EXPO_CSS)
    const fromCss = token('ease-out').match(/[\d.]+/g)!.map(Number)
    expect(fromCss).toEqual([...EASE_OUT_EXPO])
  })

  it('keeps the one shared duration in step with its JS counterpart', () => {
    // Only --dur-hover is shared: CSS animates hover feedback itself, while
    // the panel/scrim/tooltip timings belong to framer-motion and are defined
    // once in motion.ts rather than mirrored here.
    expect(token('dur-hover')).toBe(`${Math.round(DURATION.feedback * 1000)}ms`)
    // The echo's ring length lives in two files — the stylesheet animates it
    // and the hook schedules its own cleanup against it. If they drift, the
    // overlay is either removed mid-animation or left on the page.
    expect(token('dur-ripple-ring')).toBe(`${RING_MS}ms`)
  })
})

describe('token hygiene', () => {
  const defined = [...globalCss.matchAll(/^\s*--([a-z0-9-]+)\s*:/gm)].map((m) => m[1]!)

  it('defines no token that nothing references', () => {
    // --cream and --font-serif sat here unused, the latter costing a webfont
    // request on every visit.
    const orphans = defined.filter((name) => {
      return !allCss.includes(`var(--${name})`)
    })
    expect(orphans).toEqual([])
  })

  it('references no token that is never defined', () => {
    const used = new Set([...allCss.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]!))
    const undef = [...used].filter((name) => !defined.includes(name))
    expect(undef).toEqual([])
  })

  it('states a named type scale rather than ad hoc sizes', () => {
    for (const step of ['text-eyebrow', 'text-caption', 'text-body', 'text-heading']) {
      expect(() => token(step)).not.toThrow()
    }
  })

  it('states a spacing scale on a 4px base', () => {
    for (const step of ['space-2', 'space-3', 'space-4', 'space-6']) {
      expect(Number.parseInt(token(step), 10) % 4).toBe(0)
    }
  })
})

/**
 * Structural checks on the stylesheets themselves.
 *
 * These exist because of a bug that shipped. Removing a block from scene.css
 * left one orphaned `}` behind — a media query's closing brace whose rules had
 * been cut out from under it. CSS has no syntax errors to speak of, so nothing
 * complained: the build succeeded, every existing test passed, and the file
 * looked fine.
 *
 * What it actually did was end a block early, which re-nested everything after
 * it. Vite concatenates the stylesheets, so `:root` — sitting in the file that
 * came next — was swallowed into an at-rule and never applied. Every design
 * token vanished at once: no fonts, no spacing, no borders, since each is a
 * `var()` that now resolved to nothing. The 3D scene still drew, so desktop
 * looked broadly right and the mobile page, which is all CSS, looked destroyed.
 *
 * One stray character, invisible to every check in the project.
 */
describe('stylesheet integrity', () => {
  const SHEETS = ['src/styles/global.css', 'src/styles/scene.css', 'src/motion/logo/logo-reveal.css']

  /** Comments are blanked first: a brace inside one is not structural, and the
   *  stylesheets are heavily commented. */
  const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

  it.each(SHEETS)('%s has balanced braces', (file) => {
    const css = strip(readFileSync(file, 'utf8'))
    const open = (css.match(/\{/g) ?? []).length
    const close = (css.match(/\}/g) ?? []).length
    expect({ file, open, close }).toEqual({ file, open, close: open })
  })

  it.each(SHEETS)('%s never closes more blocks than it opens', (file) => {
    // Balance alone is not enough: "}{" balances and is still wrong. This walks
    // the file and fails at the first point nesting goes negative, which is
    // where the orphaned brace actually was.
    const css = strip(readFileSync(file, 'utf8'))
    let depth = 0
    let firstBad = -1
    for (let i = 0; i < css.length && firstBad < 0; i += 1) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}' && --depth < 0) firstBad = i
    }
    const line = firstBad < 0 ? null : css.slice(0, firstBad).split('\n').length
    expect({ file, orphanOnLine: line }).toEqual({ file, orphanOnLine: null })
  })

  it('defines every custom property the stylesheets use', () => {
    /* The symptom the brace bug produced, checked directly. A var() with no
       definition is silently dropped by the browser, so a missing token shows
       up as a missing border or a fallback font rather than as an error. */
    const all = SHEETS.map((f) => readFileSync(f, 'utf8')).join('\n')
    const defined = new Set([...all.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]))
    const used = new Set([...all.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]))
    const missing = [...used].filter((t) => !defined.has(t))
    expect(missing).toEqual([])
  })
})
