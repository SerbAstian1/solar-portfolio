export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/**
 * Reads a hex colour written any of the ways a person actually writes one.
 *
 * Accepts `#EB5E28`, `eb5e28`, `#e52`, and the same with stray whitespace or
 * mixed case. Returns null for anything else rather than throwing or guessing,
 * because these values arrive from a content file a designer edits by hand and
 * a typo there should degrade one swatch, not take down the page.
 */
export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return null
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  const n = Number.parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Normalised form, so two spellings of one colour compare equal. */
export function normaliseHex(input: string): string | null {
  const rgb = parseHex(input)
  if (!rgb) return null
  const part = (v: number) => v.toString(16).padStart(2, '0')
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`.toUpperCase()
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two luminances, 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return (light + 0.05) / (dark + 0.05)
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 }
const WHITE: Rgb = { r: 255, g: 255, b: 255 }

/**
 * Black or white, whichever is legible on the given colour.
 *
 * This is the whole reason a client can paste any palette into the content
 * file and have it render correctly: the swatch label picks its own ink by
 * measurement rather than being hard-coded to one that happens to suit the
 * placeholder colours. A pale brand yellow gets black text and a deep navy
 * gets white, with no edit to the component.
 *
 * Falls back to white on an unreadable value, matching the neutral tile the
 * swatch itself falls back to.
 */
export function readableInk(hex: string): '#000000' | '#FFFFFF' {
  const rgb = parseHex(hex)
  if (!rgb) return '#FFFFFF'
  return contrastRatio(rgb, BLACK) >= contrastRatio(rgb, WHITE) ? '#000000' : '#FFFFFF'
}

/** The contrast the chosen ink actually achieves — used to flag a swatch whose
 *  label cannot reach AA no matter which ink is picked. */
export function inkContrast(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 21
  return Math.max(contrastRatio(rgb, BLACK), contrastRatio(rgb, WHITE))
}
