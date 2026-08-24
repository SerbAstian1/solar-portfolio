/** Content shapes for the five sections. Presentation copy only — orbital
 *  elements live in src/orbital/elements.ts, keyed by the same ids. */

export interface ProjectDetail {
  readonly summary: string
  readonly role: string
  readonly tools: readonly string[]
  readonly previewImages?: readonly { readonly title: string; readonly caption: string }[]
  readonly behanceUrl?: string
  readonly highlights: readonly string[]
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
