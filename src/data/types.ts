import type { PixelIconName } from '../components/PixelIcon'

/** Content shapes for the five sections. Presentation copy only — orbital
 *  elements live in src/orbital/elements.ts, keyed by the same ids. */

/**
 * The four things a client is shown of a brand project.
 *
 * Every asset field is optional, and every one of them renders a labelled
 * placeholder when it is absent rather than collapsing the layout. That is
 * deliberate: the sections are built and laid out *before* the artwork exists,
 * so dropping in the real files later is a content edit and never a code
 * change. Nothing here may become required later without breaking that.
 */
export interface BrandLogo {
  readonly name: string
  /** Path under /public. Omit until the file exists; the tile stands in. */
  readonly src?: string
  /** The ground the mark is drawn for, so it can be shown against the right
   *  one by default. */
  readonly ground?: 'light' | 'dark'
}

export interface BrandColor {
  readonly name: string
  /** Any hex spelling. The swatch parses it and picks its own legible ink, so
   *  no palette needs the component to be edited. */
  readonly hex: string
  readonly role?: string
}

export interface BrandFont {
  readonly name: string
  readonly role: string
  /** CSS stack for the specimen. If the family is not installed or served the
   *  browser falls through it, so a specimen always renders as *something*
   *  rather than as nothing. */
  readonly stack?: string
  readonly sample?: string
}

export interface BrandApplication {
  readonly title: string
  readonly caption?: string
  readonly src?: string
}

export interface ProjectDetail {
  readonly summary: string
  readonly role: string
  readonly tools: readonly string[]
  readonly previewImages?: readonly { readonly title: string; readonly caption: string }[]
  readonly behanceUrl?: string
  readonly highlights: readonly string[]
  /** The interactive showcase. Each absent section simply is not rendered. */
  readonly logos?: readonly BrandLogo[]
  readonly palette?: readonly BrandColor[]
  readonly fonts?: readonly BrandFont[]
  readonly applications?: readonly BrandApplication[]
  /**
   * A single, static piece of artwork — an album cover and nothing else.
   *
   * Cover work has no marks, palette or applications to expand into, so those
   * projects carry no showcase sections at all and simply show the cover. It
   * is deliberately not a section: there is nothing underneath it to reveal,
   * and a card that opens onto more of the same is a worse card.
   */
  readonly cover?: { readonly title: string; readonly src?: string }
  /**
   * Where to hear it. Rendered whenever it is present.
   *
   * Note what does *not* decide this: the project's `type` string. Keying the
   * behaviour off `type === 'Album Cover'` would put a rendering decision at
   * the mercy of a spelling — 'Album cover', 'album-cover', a stray plural —
   * and break silently the first time someone typed one. The data being there
   * is the condition.
   */
  readonly spotifyUrl?: string
}

export interface Project {
  readonly id: string
  readonly type: string
  readonly title: string
  readonly description: string
  readonly href: string
  readonly cta: string
  readonly detail: ProjectDetail
}

export interface PricingTier {
  readonly name: string
  readonly price: string
  readonly features: readonly string[]
  /**
   * The contact form's budget option this tier corresponds to.
   *
   * Declared on the tier rather than derived from the price string, which
   * would mean parsing "From ₦850k" at runtime and guessing at a band. It is
   * also not a lookup table living in the component: a mapping kept away from
   * the thing it maps drifts the moment either side is edited. A test asserts
   * every value here is a real option in the form.
   */
  readonly budget: string
}

/**
 * What the studio sells, split by how it is sold.
 *
 * The two are not a ranking of quality but of how the work arrives: a primary
 * service is a project someone comes for, a secondary one is work that usually
 * attaches to a project already underway. Keeping them in one list flattened
 * that, and left a poster looking like an alternative to a whole identity
 * system.
 */
export interface ServiceOffer {
  readonly name: string
  readonly summary: string
  /**
   * The mark shown on the card. Declared here rather than looked up from the
   * name in the component: matching on 'Album & cover artwork' would break the
   * moment the copy was reworded, and silently — the card would simply lose
   * its icon. Type-only import, so the data layer gains no runtime dependency
   * on a component.
   *
   * Primary services only. A secondary service is a line in a list.
   */
  readonly icon?: PixelIconName
  /** What a client actually receives. Primary services only — a secondary
   *  service is a line item, not a programme of work. */
  readonly includes?: readonly string[]
}

export interface ServiceSet {
  readonly primary: readonly ServiceOffer[]
  readonly secondary: readonly ServiceOffer[]
}

/** A place the work was done in-house rather than for a client at arm's length. */
export interface AboutRole {
  readonly org: string
  readonly role: string
  readonly note: string
}

/**
 * The studio's own story, structured rather than left as one block of prose.
 *
 * Split because the parts are read differently: the client marks are scanned
 * in a second, the disciplines are skimmed for a match, and only the story is
 * actually read. One paragraph containing all three gets none of them read.
 */
export interface AboutClient {
  readonly name: string
  readonly src: string
}

export interface AboutContent {
  /** Marks shown at the top, muted. Recognition before explanation. */
  readonly clients: readonly AboutClient[]
  readonly portrait?: { readonly src: string; readonly alt: string }
  readonly story: readonly string[]
  readonly disciplines: readonly string[]
  readonly roles: readonly AboutRole[]
}

export interface PanelContent {
  readonly eyebrow: string
  readonly title: string
  readonly body?: string
  readonly about?: AboutContent
  readonly services?: ServiceSet
  readonly tiers?: readonly PricingTier[]
  readonly projects?: readonly Project[]
  readonly contact?: boolean
}

export interface PlanetContent {
  readonly id: string
  readonly label: string
  /** Short category line shown above the label in hover and list views. */
  readonly cat: string
  readonly preview: string
  readonly panel: PanelContent
}
