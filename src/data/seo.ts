/**
 * Per-route metadata. Kept apart from planets.ts because search and social
 * copy answers to different constraints than on-screen copy — length caps,
 * brand-first ordering, and a full sentence that survives being read with no
 * surrounding page.
 *
 * Targets: title 50-60 chars, description 150-160. Actual lengths are
 * asserted in the tests rather than eyeballed.
 */
export interface SeoEntry {
  readonly title: string
  readonly description: string
}

export const SITE_NAME = 'AW. — Akagha Wisdom Creative Studio'

/** Set at build time; used for canonical URLs, og:url and the sitemap. */
export const SITE_ORIGIN = 'https://akaghawisdom.com'

export const HOME_SEO: SeoEntry = {
  title: 'AW. — Akagha Wisdom, Brand & Digital Studio in Lagos',
  description:
    'AW. is an independent Lagos creative studio building brand identity systems, websites, and art direction. Strategy is resolved before any visual work begins.',
}

export const SEO_BY_SECTION: Readonly<Record<string, SeoEntry>> = {
  work: {
    title: 'Selected Work — Brand, Web & Album Cover Design | AW.',
    description:
      'Selected brand identity, web, and album cover projects from AW., including REDMUR, Jutech Horizon and Campus Turkey. Case studies list role, tools and scope.',
  },
  services: {
    title: 'Services — Brand Identity, Web Design & Art Direction | AW.',
    description:
      'Brand identity systems, web design and build, art direction for print and campaign work, and UGC content — as standalone projects or bundled partnerships.',
  },
  about: {
    title: 'About the Studio — How AW. Works | Akagha Wisdom, Lagos',
    description:
      'AW. is a Lagos-based independent creative studio. Strategy is resolved before any visual direction begins, and every mark is executed by hand, never generated.',
  },
  pricing: {
    title: 'Pricing — Four Ways to Work With AW. | Engagement Tiers',
    description:
      'Four engagement tiers, from a single deliverable to a full brand and web partnership or an ongoing retainer. Each states scope, revision rounds and turnaround.',
  },
  contact: {
    title: 'Contact — Start a Project With AW. | Akagha Wisdom Studio',
    description:
      'Start a conversation about your brand or product with AW., a creative studio in Lagos. Tell me what you are building — I reply within two working days.',
  },
}

export function seoFor(sectionId: string | null): SeoEntry {
  if (sectionId === null) return HOME_SEO
  return SEO_BY_SECTION[sectionId] ?? HOME_SEO
}
