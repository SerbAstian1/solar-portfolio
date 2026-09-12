/**
 * The icon system.
 *
 * Pixel art rather than a drawn icon set, because the site already speaks that
 * language: the planets are dithered, the panel carries a 3px scanline, and the
 * loading state is a swept track. A smooth rounded icon set would have been the
 * one thing on the page pretending to be from a different machine.
 *
 * Every icon is authored as a 12x12 grid of characters. That is the whole
 * format — no editor, no sprite sheet, no build step. A twelfth of the grid is
 * visible at the sizes these render, so the grid is small enough to reason
 * about by eye and large enough for five section marks to stay distinct from
 * each other. Editing one is editing the picture.
 *
 * Why not an icon library: the smallest useful one is ~8KB gzipped before a
 * single glyph is chosen, ships hundreds of icons to use ten, and none of them
 * are pixel art. These ten cost 1.6KB of source and no runtime dependency.
 */

const GRID = 12

/**
 * The set, drawn.
 *
 * '#' is a lit cell. Rows are read top to bottom. Every grid is asserted square
 * and 12-wide by a test, because a mis-typed row is invisible in source and
 * obvious on screen.
 */
const ICONS = {
  /* Utility — these carry controls, not decoration. */
  close: [
    '............',
    '............',
    '..##....##..',
    '...##..##...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '....####....',
    '...##..##...',
    '..##....##..',
    '............',
    '............',
  ],
  back: [
    '............',
    '............',
    '....##......',
    '...##.......',
    '..##........',
    '.##########.',
    '.##########.',
    '..##........',
    '...##.......',
    '....##......',
    '............',
    '............',
  ],
  external: [
    '............',
    '............',
    '.....#####..',
    '........##..',
    '......####..',
    '.....##.....',
    '....##......',
    '...##.......',
    '..##........',
    '............',
    '............',
    '............',
  ],
  sent: [
    '............',
    '............',
    '.........##.',
    '........##..',
    '.......##...',
    '.##...##....',
    '..##.##.....',
    '...####.....',
    '....##......',
    '............',
    '............',
    '............',
  ],
  alert: [
    '............',
    '............',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '............',
    '.....##.....',
    '.....##.....',
    '............',
  ],

  /* Section marks. Keyed to the planet ids, and used where the scene is not
     there to do the wayfinding — which on a phone is everywhere. */
  work: [
    '............',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '............',
    '............',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '............',
  ],
  services: [
    '............',
    '............',
    '...######...',
    '...######...',
    '............',
    '..########..',
    '..########..',
    '............',
    '.##########.',
    '.##########.',
    '............',
    '............',
  ],
  about: [
    '............',
    '............',
    '....####....',
    '....####....',
    '....####....',
    '............',
    '..########..',
    '.##########.',
    '.##########.',
    '.##########.',
    '............',
    '............',
  ],
  pricing: [
    '............',
    '.........##.',
    '.........##.',
    '.........##.',
    '.....##..##.',
    '.....##..##.',
    '.....##..##.',
    '.##..##..##.',
    '.##..##..##.',
    '.##..##..##.',
    '.##..##..##.',
    '............',
  ],
  contact: [
    '............',
    '............',
    '............',
    '.##########.',
    '.##......##.',
    '.#.#....#.#.',
    '.#..#..#..#.',
    '.#...##...#.',
    '.#........#.',
    '.##########.',
    '............',
    '............',
  ],

  /* The two services the studio is actually built on. Deliberately abstract
     rather than literal: an identity is a mark held inside a system, which is
     what concentric frames say and what a pencil or a swatch would not. */
  identity: [
    '............',
    '............',
    '..########..',
    '..#......#..',
    '..#.####.#..',
    '..#.#..#.#..',
    '..#.#..#.#..',
    '..#.####.#..',
    '..#......#..',
    '..########..',
    '............',
    '............',
  ],
  artwork: [
    '............',
    '....####....',
    '..##....##..',
    '.##......##.',
    '.#........#.',
    '.#...##...#.',
    '.#...##...#.',
    '.#........#.',
    '.##......##.',
    '..##....##..',
    '....####....',
    '............',
  ],
} as const

export type PixelIconName = keyof typeof ICONS

/**
 * Section id to mark.
 *
 * Lives here rather than in either component that reads it. The mobile nav and
 * the panel eyebrow both label the same five sections, and a visitor who taps
 * a tile and lands on the matching panel should meet the same mark twice —
 * which is the entire reason the panel eyebrow got one. Two private copies of
 * this object would have been two places for that to quietly stop being true.
 */
export const SECTION_ICONS: Record<string, PixelIconName> = {
  work: 'work',
  services: 'services',
  about: 'about',
  pricing: 'pricing',
  contact: 'contact',
}

/**
 * Grid to path, run-length encoded a row at a time.
 *
 * One <path> per icon rather than one <rect> per cell. A 12x12 grid is 144
 * possible cells, and the busiest mark here lights 48 of them — as rects that
 * is 48 elements per icon, multiplied by five tiles on the mobile nav. Merging
 * each run of lit cells into a single subpath puts every icon at one node.
 *
 * Runs once per icon at module load, not per render.
 */
export function toPath(rows: readonly string[]): string {
  let d = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x] !== '#') {
        x += 1
        continue
      }
      let w = 0
      while (row[x + w] === '#') w += 1
      d += `M${x} ${y}h${w}v1h-${w}z`
      x += w
    }
  })
  return d
}

const PATHS = Object.fromEntries(
  Object.entries(ICONS).map(([name, rows]) => [name, toPath(rows)]),
) as Record<PixelIconName, string>

/** Exported for the grid-shape test, which should fail on a mis-typed row. */
export const ICON_GRIDS = ICONS

export interface PixelIconProps {
  name: PixelIconName
  className?: string
  /**
   * Given only when the icon is the sole carrier of meaning. Everywhere in
   * this site it sits beside a real label, so it defaults to decorative —
   * announcing "close icon, Close" is worse than announcing "Close".
   */
  title?: string
}

export default function PixelIcon({ name, className = '', title }: PixelIconProps) {
  return (
    <svg
      className={`pixel-icon ${className}`.trim()}
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={GRID}
      height={GRID}
      /* The whole point. Without it the browser antialiases the cell edges and
         a 12px icon arrives as a smudge with the colour roughly in the right
         place. crispEdges snaps every edge to the device pixel grid, so the
         mark stays hard however it is scaled. */
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      /* IE/Edge legacy put SVGs in the tab order. Harmless to state, and the
         one line that stops a decorative mark becoming a tab stop. */
      focusable="false"
    >
      {title && <title>{title}</title>}
      {/* currentColor, so the icon takes the colour of the text it sits with
          and the orange is set once in CSS rather than baked into ten files. */}
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  )
}
