import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  BrandApplication,
  BrandColor,
  BrandFont,
  BrandLogo,
  ProjectDetail,
} from '../data/types'
import { inkContrast, normaliseHex, readableInk } from '../utils/color'

type SectionId = 'logos' | 'palette' | 'fonts' | 'applications'

const SECTION_LABELS: Record<SectionId, string> = {
  logos: 'Marks',
  palette: 'Colour',
  fonts: 'Type',
  applications: 'In use',
}

/**
 * A titled block of work. It does not collapse and it does not react to being
 * hovered.
 *
 * It used to do both — the section rested collapsed and opened on hover — and
 * that turned out to be the wrong level to put it at. Hover-expansion and
 * scrolling want the same pixels: the pointer sits still while the page moves
 * beneath it, so sections opened and shut on their own as they passed under
 * the cursor, shifting the very content the reader was trying to move
 * through. It is a fine interaction for something you approach deliberately
 * and a bad one for something you scroll past.
 *
 * The reveal moved down a level instead. Sections stay open, and the hover
 * states live on the individual marks, swatches and tiles inside them, where
 * nothing they do can change the height of the page.
 */
function ShowcaseSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="showcase-card">
      <h4 className="showcase-head">
        <span className="showcase-label">{label}</span>
      </h4>
      <div className="showcase-body">{children}</div>
    </section>
  )
}

/**
 * An image that is allowed not to exist yet.
 *
 * Three states, and the layout is identical in all of them: the asset, a
 * placeholder while there is no path, and the same placeholder when a path was
 * given but failed to load. The box takes its size from an aspect ratio rather
 * than from the file, so real artwork dropping in later cannot reflow the grid
 * around it, and a wrong path degrades to a labelled tile instead of a broken
 * image icon.
 */
function AssetTile({
  src,
  label,
  ratio,
  fit = 'cover',
  ground,
  showLabel = true,
}: {
  src?: string
  label: string
  ratio: string
  fit?: 'cover' | 'contain'
  ground?: 'light' | 'dark'
  showLabel?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const missing = !src || failed

  return (
    <div
      className={`asset-tile ${ground ? `is-${ground}` : ''} ${missing ? 'is-empty' : ''}`}
      style={{ aspectRatio: ratio }}
    >
      {missing ? (
        showLabel ? <span className="asset-placeholder">{label}</span> : null
      ) : (
        <img
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          style={{ objectFit: fit }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

/**
 * The cover, on its own, with nothing to open.
 *
 * Shares AssetTile with the showcase so a missing or broken file degrades the
 * same way here as everywhere else.
 */
export function ProjectCover({ cover }: { cover: { title: string; src?: string } }) {
  return (
    <figure className="project-cover">
      {/* No label inside the tile: the caption below names it in both states,
          and printing it twice reads as a mistake while the artwork is still
          a placeholder. */}
      <AssetTile src={cover.src} label={cover.title} ratio="1 / 1" fit="cover" showLabel={false} />
      <figcaption>{cover.title}</figcaption>
    </figure>
  )
}

/** Marks, on a ground the viewer controls — the one thing you always want to
 *  check about a logo and the one thing a static sheet cannot show. */
function LogoSection({ logos }: { logos: readonly BrandLogo[] }) {
  const [ground, setGround] = useState<'dark' | 'light'>('dark')
  return (
    <>
      <div className="showcase-controls">
        <span className="showcase-hint">Ground</span>
        <div className="ground-toggle" role="group" aria-label="Preview background">
          {(['dark', 'light'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`ground-option ${ground === g ? 'is-active' : ''}`}
              aria-pressed={ground === g}
              onClick={() => setGround(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="showcase-grid is-logos">
        {logos.map((logo) => (
          <figure key={logo.name} className="showcase-item">
            <AssetTile
              src={logo.src}
              label={logo.name}
              ratio="4 / 3"
              // Never crop a mark: a logo tile that fills its box by cropping
              // is showing a different logo.
              fit="contain"
              ground={ground}
            />
            <figcaption>{logo.name}</figcaption>
          </figure>
        ))}
      </div>
    </>
  )
}

/** Swatches that carry their own hex and copy it on click. */
function PaletteSection({ palette }: { palette: readonly BrandColor[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard?.writeText(hex)
      setCopied(hex)
    } catch {
      // Clipboard access is refused in plenty of ordinary situations — an
      // insecure origin, a permissions policy, an older browser. The swatch
      // shows its value either way, so copying is a convenience and never the
      // only route to the number.
      setCopied(null)
      return
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1400)
  }, [])

  return (
    <div className="showcase-grid is-palette">
      {palette.map((colour) => {
        const hex = normaliseHex(colour.hex)
        const valid = hex !== null
        const ink = readableInk(colour.hex)
        /* A mid-grey cannot reach AA for small text against either ink. The
           label is set large enough to be judged at 3:1, and this flags the
           ones sitting near that floor so the sheet stays honest about it. */
        const tight = valid && inkContrast(colour.hex) < 4.5
        return (
          <button
            key={`${colour.name}-${colour.hex}`}
            type="button"
            className={`swatch ${valid ? '' : 'is-invalid'}`}
            style={valid ? { backgroundColor: hex, color: ink } : undefined}
            onClick={() => valid && hex && copy(hex)}
            aria-label={`${colour.name}, ${hex ?? colour.hex}${valid ? '. Copy hex' : '. Unreadable value'}`}
          >
            <span className="swatch-name">{colour.name}</span>
            {colour.role && <span className="swatch-role">{colour.role}</span>}
            <span className="swatch-hex">{copied === hex ? 'Copied' : (hex ?? colour.hex)}</span>
            {/* Revealed on hover of this swatch alone. It is drawn over the
                tile rather than added to it, so it cannot change any height. */}
            {valid && (
              <span className="swatch-action" aria-hidden="true">
                Copy
              </span>
            )}
            {tight && <span className="swatch-flag" aria-hidden="true">◑</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Specimens set in the project's own faces where they are available. */
function FontSection({ fonts }: { fonts: readonly BrandFont[] }) {
  return (
    <div className="showcase-fonts">
      {fonts.map((font) => (
        <div key={font.name} className="specimen">
          <div className="specimen-meta">
            <span className="specimen-name">{font.name}</span>
            <span className="specimen-role">{font.role}</span>
          </div>
          {/* The stack is applied inline because it comes from content rather
              than from the stylesheet. If the family is unavailable the browser
              falls through it and the specimen still reads. */}
          <p className="specimen-line" style={font.stack ? { fontFamily: font.stack } : undefined}>
            {font.sample ?? 'Handgloves 0123456789'}
          </p>
        </div>
      ))}
    </div>
  )
}

/** Mockups and applications. */
function ApplicationSection({ items }: { items: readonly BrandApplication[] }) {
  return (
    <div className="showcase-grid is-applications">
      {items.map((item) => (
        <figure key={item.title} className="showcase-item">
          <AssetTile src={item.src} label={item.title} ratio="3 / 2" fit="cover" />
          <figcaption>
            <span className="application-title">{item.title}</span>
            {item.caption && <span className="application-caption">{item.caption}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/**
 * The client-facing preview of a project: marks, palette, type, applications.
 *
 * Sections are built from whatever the content actually has. A project with
 * only a palette shows one section and no empty scaffolding; a project with
 * none of the four renders nothing — which is what lets an album cover, which
 * has none of them, sit beside a full brand system.
 */
export default function ProjectShowcase({ detail }: { detail: ProjectDetail }) {
  const sections = useMemo(() => {
    const present: SectionId[] = []
    if (detail.logos?.length) present.push('logos')
    if (detail.palette?.length) present.push('palette')
    if (detail.fonts?.length) present.push('fonts')
    if (detail.applications?.length) present.push('applications')
    return present
  }, [detail])

  if (sections.length === 0) return null

  return (
    <section className="showcase" aria-label="Project preview">
      {sections.map((id) => (
        <ShowcaseSection key={id} label={SECTION_LABELS[id]}>
          {id === 'logos' && <LogoSection logos={detail.logos!} />}
          {id === 'palette' && <PaletteSection palette={detail.palette!} />}
          {id === 'fonts' && <FontSection fonts={detail.fonts!} />}
          {id === 'applications' && <ApplicationSection items={detail.applications!} />}
        </ShowcaseSection>
      ))}
    </section>
  )
}
