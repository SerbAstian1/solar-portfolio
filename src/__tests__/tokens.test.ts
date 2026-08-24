import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DURATION, EASE_OUT_EXPO, EASE_OUT_EXPO_CSS } from '../motion'

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
