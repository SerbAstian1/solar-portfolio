// Content only. Orbital elements and render sizes live in
// src/orbital/elements.ts, keyed by the same ids.
import type { PlanetContent } from './types'

export const PLANETS: readonly PlanetContent[] = [
  {
    id: 'work',
    label: 'Work',
    cat: 'Selected Work',
    preview: 'Brand, web, and content projects — REDMUR, Jutech Horizon, Campus Turkey.',
    panel: {
      eyebrow: 'Selected Work',
      title: 'Selected case studies and project previews.',
      body: 'Brand guideline systems and cover work. Open a project to see the marks, palette, type and applications as they were delivered.',
      projects: [
        {
          id: 'redmur',
          type: 'Branding',
          title: 'REDMUR Digital',
          description: 'Brand guideline for a mediatech company: mark, colour system, type, and applications.',
          href: '#redmur',
          cta: 'Open project',
          detail: {
            summary:
              'A brand guideline for REDMUR Digital, a mediatech company building tools that help brands stay relevant online. Sleek and minimal, built on a black-and-white core with a set of vivid accents.',
            role: 'Brand identity, guideline system, and visual application across digital and merchandise.',
            tools: ['Logo system', 'Colour system', 'Typography', 'Media assets'],
            behanceUrl: 'https://www.behance.net/gallery/225530681/REDMUR-Digital-Brand-Guideline',
            highlights: [
              'Mark built from a sleek, forward-leaning monogram',
              'Black-and-white core with four accent colours',
              'Archivo across headlines, body and UI',
              'Merchandise, social and interface applications',
            ],
            /* The guideline's own logo tiles: white over black, its primary
               pairing. As with Jutech the artwork brings its own ground. */
            logos: [
              { name: 'Symbol', src: '/projects/redmur/mark-symbol.webp' },
              { name: 'Primary lockup', src: '/projects/redmur/mark-lockup.webp' },
              { name: 'Horizontal lockup', src: '/projects/redmur/mark-wordmark.webp' },
            ],
            palette: [
              { name: 'Black', hex: '#000000', role: 'Primary' },
              { name: 'White', hex: '#FDFDFD', role: 'Primary' },
              { name: 'Ash', hex: '#AEADB0', role: 'Secondary' },
              { name: 'Graphite', hex: '#666666', role: 'Secondary' },
              { name: 'Signal Blue', hex: '#1C7CFF', role: 'Accent' },
              { name: 'Magenta', hex: '#EC33A4', role: 'Accent' },
              { name: 'Teal', hex: '#2CB6A7', role: 'Accent' },
              { name: 'Violet', hex: '#B13FDC', role: 'Accent' },
            ],
            fonts: [
              {
                name: 'Archivo',
                role: 'Display',
                stack: 'Archivo, "Archivo Expanded", sans-serif',
                sample: 'Create · Connect · Evolve',
              },
              {
                name: 'Archivo',
                role: 'Body',
                stack: 'Archivo, sans-serif',
                sample: 'Handgloves 0123456789',
              },
            ],
            applications: [
              { title: 'Merchandise', caption: 'Tote, cap, apparel and signage.', src: '/projects/redmur/app-mockups.webp' },
              { title: 'Media assets', caption: 'Instagram and LinkedIn templates.', src: '/projects/redmur/app-media.webp' },
              { title: 'Visual identity', caption: 'Imagery direction and texture.', src: '/projects/redmur/app-identity.webp' },
            ],
          },
        },
        {
          id: 'jutech',
          type: 'Branding',
          title: 'Jutech Horizon Development Ltd.',
          description: 'Brand guideline for a construction and development company: identity, colour, type, and site application.',
          href: '#jutech',
          cta: 'Open project',
          detail: {
            summary:
              'A brand guideline system for Jutech Horizon Development Ltd, a multidisciplinary construction and development company. It defines the visual identity, typography, colour system, logo usage and imagery style across every touchpoint.',
            role: 'Brand identity, guideline system, and application across print, site and digital.',
            tools: ['Logo system', 'Colour system', 'Typography', 'Imagery direction'],
            behanceUrl: 'https://www.behance.net/gallery/242161087/Jutech-Horizon-Development-Ltd-Brand-Guideline',
            highlights: [
              'Mark built from a hard hat, ship anchor and building silhouette',
              'Navy, cool gray and gold with full tint and shade ramps',
              'Host Grotesk across six weights',
              'Stationery, on-site branding and social applications',
            ],
            /* Each mark is the guideline's own approved tile: gold accent over
               navy, lifted straight from the Color Usage page rather than
               composited here. The artwork carries its own ground, so the
               tiles are set to cover — a contain fit would letterbox the
               brand's own background inside the viewer's. */
            logos: [
              { name: 'Symbol', src: '/projects/jutech/mark-symbol.webp' },
              { name: 'Horizontal lockup', src: '/projects/jutech/mark-lockup.webp' },
              { name: 'Wordmark', src: '/projects/jutech/mark-wordmark.webp' },
            ],
            palette: [
              { name: 'Navy Blue', hex: '#001F3F', role: 'Primary' },
              { name: 'Cool Gray', hex: '#BABCBD', role: 'Secondary' },
              { name: 'Gold', hex: '#FFD700', role: 'Accent' },
            ],
            fonts: [
              {
                name: 'Host Grotesk',
                role: 'Display',
                stack: '"Host Grotesk", "Space Grotesk", sans-serif',
                sample: 'We engineer excellence',
              },
              {
                name: 'Host Grotesk',
                role: 'Body',
                stack: '"Host Grotesk", Inter, sans-serif',
                sample: 'Handgloves 0123456789',
              },
            ],
            applications: [
              { title: 'Stationery', caption: 'Cards, letterhead and ID.', src: '/projects/jutech/app-stationery.webp' },
              { title: 'On-site branding', caption: 'Signage, helmets, uniforms and vehicles.', src: '/projects/jutech/app-onsite.webp' },
              { title: 'Social', caption: 'Post and story templates.', src: '/projects/jutech/app-social.webp' },
            ],
          },
        },
        {
          id: 'licha',
          type: 'Single Cover',
          title: 'Licha — Feychi',
          description: "Cover art for a love song, released deliberately into Valentine's week.",
          href: '#licha',
          cta: 'Open project',
          detail: {
            summary:
              "A love song with a Valentine's release date, which is a brief that arrives carrying its own cliches — pink, hearts, a script face, a heart-shaped crop. The cover answers by taking one colour the whole way instead: the entire frame collapsed to a single red, so the romance reads as heat rather than as sweetness.",
            role: 'Cover art direction, colour grade, title treatment and artist mark.',
            tools: ['Photo composite', 'Duotone grade', 'Title treatment', 'Release crops'],
            cover: [{ title: 'Cover', src: '/projects/licha/cover.webp' }],
            highlights: [
              'Single-hue red grade across the whole frame, so nothing competes with the mood',
              'Title formed out of the cloud rather than set on top of the picture',
              'Couple held small against the field — the feeling outscales the people in it',
              'Handwritten artist mark as the one intimate thing in a cinematic frame',
              'Built to survive a feed thumbnail, where the moon and the silhouette still read',
            ],
          },
        },
        {
          id: 'who-i-become',
          type: 'EP Artwork',
          title: 'Who I Become — Meechgan',
          description: 'Front and tracklist for an introductory EP — the first thing anyone sees of the artist.',
          href: '#who-i-become',
          cta: 'Open project',
          detail: {
            summary:
              'An introduction has a harder job than a follow-up, because nobody is looking for it yet. There is no back catalogue to trade on and no audience already inclined to click, so the artwork has to establish who he is before a note has played.',
            role: 'Art direction, photo treatment, hand lettering and tracklist layout.',
            tools: ['Photo direction', 'Hand lettering', 'Grain treatment', 'Tracklist layout'],
            /* Two faces, because the tracklist here is a designed surface
               rather than the back of a sleeve — it carries the same hand, the
               same carriage and the credits. */
            cover: [
              { title: 'Front', src: '/projects/who-i-become/cover.webp' },
              { title: 'Tracklist', src: '/projects/who-i-become/tracklist.webp' },
            ],
            highlights: [
              'Black and white throughout — no palette to be remembered by, so the portrait has to carry it',
              'Title scratched into the frame by hand rather than typeset over it',
              'Both faces shot in transit: the record is called Who I Become, and neither image has arrived anywhere',
              'Tracklist designed as the second face, holding the four titles and the full credit block',
              'Grain kept rather than cleaned, which is the difference between unpolished and unfinished',
            ],
          },
        },
      ],
    },
  },
  {
    id: 'services',
    label: 'Services',
    cat: 'What I Offer',
    preview: 'Two things I do properly — brand identity and cover artwork — plus the work that surrounds them.',
    panel: {
      eyebrow: 'Services',
      title: 'Two things, done properly.',
      body: 'Brand identity and cover artwork are what I build from the ground up. Everything else is work that attaches to those — useful, and rarely the reason a project starts.',
      services: {
        primary: [
          {
            name: 'Brand identity',
            icon: 'identity',
            summary:
              'A complete identity and the document that keeps it intact — mark, colour, type, and how all of it behaves once other people are using it.',
            includes: [
              'Logo system: symbol, lockups and approved variations',
              'Colour system with tints, shades and usage rules',
              'Typographic system across display, body and UI',
              'Application: stationery, signage, packaging, social',
              'A written guideline your team can actually follow',
            ],
          },
          {
            name: 'Album & cover artwork',
            icon: 'artwork',
            summary:
              'Cover art for a release, built to survive the places it will actually be seen — a thumbnail in a feed as readily as a printed sleeve.',
            includes: [
              'Primary cover artwork, print and digital',
              'Streaming and platform crops',
              'Release package: singles, promos, social frames',
              'Typography and title treatment',
              'Merch and physical concepts where wanted',
            ],
          },
        ],
        secondary: [
          {
            name: 'Web design & development',
            summary: 'Sites and interfaces, designed and built — usually the place an identity meets its audience first.',
          },
          {
            name: 'Social media content',
            summary: 'Templates, campaign frames and UGC direction that hold a brand together between larger pieces.',
          },
          {
            name: 'Event & campaign posters',
            summary: 'Single-surface work: posters, flyers and key art for launches, shows and campaigns.',
          },
          {
            name: 'Art direction',
            summary: 'Direction for photography, imagery and print when a project needs a hand held over it rather than a deliverable.',
          },
        ],
      },
    },
  },
  {
    id: 'about',
    label: 'About',
    cat: 'The Studio',
    preview: 'Self-taught, built by persistence — brand systems, covers and web, in-house and for clients.',
    panel: {
      eyebrow: 'About',
      title: 'Self-taught, and still teaching myself.',
      body: 'AW. is an independent creative practice. Every mark is executed by hand, and every project is argued through before anything is drawn.',
      about: {
        clients: [
          { name: 'Jutech Horizon Development Ltd.', src: '/about/client-jutech.webp' },
          { name: 'REDMUR Digital', src: '/about/client-redmur.webp' },
          { name: 'Nextberries', src: '/about/client-nextberries.webp' },
          { name: 'Campus Turkey', src: '/about/client-campusturkey.webp' },
        ],
        portrait: { src: '/about/portrait.webp', alt: 'Akagha Wisdom' },
        story: [
          'Nobody taught me this. There was no studio to come up in and no course that got me here — the craft came from building, breaking and rebuilding until the reasons good work holds together stopped being invisible.',
          'That is slower than being trained, and it leaves you with something training does not: every rule I follow, I follow because I watched what happened when I did not. Persistence was the whole method, and it still is. Nothing ships here because it was the first idea.',
        ],
        disciplines: [
          'Logos and marks',
          'Brand identity systems',
          'Album and cover artwork',
          'Web design and build',
          'Posters and campaign work',
          'Social and content design',
        ],
        roles: [
          {
            org: 'Jutech Horizon Development Ltd.',
            role: 'In-house designer',
            note: 'Identity, guideline system and application across print, site and digital for a multidisciplinary construction and development company.',
          },
          {
            org: 'REDMUR Digital',
            role: 'In-house designer',
            note: 'Mark, colour system and media assets for a mediatech company building tools that keep brands present online.',
          },
        ],
      },
    },
  },
  {
    id: 'pricing',
    label: 'Pricing',
    cat: 'Investment',
    preview: 'Four engagement tiers, from a single deliverable to full brand + web partnerships.',
    panel: {
      eyebrow: 'Investment',
      title: 'Four ways to work together.',
      tiers: [
        { name: 'Starter', price: 'From ₦350k', budget: '₦350k – ₦850k', features: ['Single deliverable (logo, one-page site, or content batch)', '1 revision round', '2 week turnaround'] },
        { name: 'Studio', price: 'From ₦850k', budget: '₦850k – ₦1.6M', features: ['Full brand identity or web design', '2 revision rounds', '4–6 week turnaround'] },
        { name: 'Partner', price: 'From ₦1.6M', budget: '₦1.6M and above', features: ['Brand + web, fully integrated', '3 revision rounds', 'Dedicated async support'] },
        { name: 'Retainer', price: 'Custom', budget: 'Not sure yet', features: ['Ongoing brand + content partnership', 'Priority turnaround', 'Monthly strategy check-in'] },
      ],
    },
  },
  {
    id: 'contact',
    label: 'Contact',
    cat: 'Get In Touch',
    preview: "Start a conversation about your brand or product — replies within two working days.",
    panel: {
      eyebrow: 'Contact',
      title: 'Start a conversation.',
      body: "Tell me what you're building — I reply within two working days.",
      contact: true,
    },
  },
]
