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
  /** The interactive showcase. Each absent section simply has no tab. */
  readonly logos?: readonly BrandLogo[]
  readonly palette?: readonly BrandColor[]
  readonly fonts?: readonly BrandFont[]
  readonly applications?: readonly BrandApplication[]
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
}

export interface PanelContent {
  readonly eyebrow: string
  readonly title: string
  readonly body?: string
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
