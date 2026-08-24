// Content only — orbital elements and render sizes live with the scene, in
// ThreeSolarSystem's ORBITS table.
export const PLANETS = [
  {
    id: 'work',
    label: 'Work',
    cat: 'Selected Work',
    preview: 'Brand, web, and content projects — REDMUR, Jutech Horizon, Campus Turkey.',
    panel: {
      eyebrow: 'Selected Work',
      title: 'Selected case studies and project previews.',
      body: 'A client-facing showcase with four project placeholders. Each project card is clickable and behaves like a real portfolio entry.',
      projects: [
        {
          id: 'redmur',
          type: 'Branding',
          title: 'REDMUR Identity System',
          description: 'Logo, color system, typography, and visual applications for a modern lifestyle brand.',
          href: '#redmur',
          cta: 'Open project',
          detail: {
            summary: 'A comprehensive identity system for REDMUR with logo, palette, typography, and application examples.',
            role: 'Brand identity, design direction, and visual application across digital and print.',
            tools: ['Logo design', 'Color system', 'Typography', 'Brand applications'],
            previewImages: [
              { title: 'Logo suite', caption: 'Primary and secondary marks.' },
              { title: 'Color system', caption: 'Palette and mood explorations.' },
            ],
            behanceUrl: 'https://www.behance.net/your-profile',
            highlights: [
              'Modular logo lockup and symbol system',
              'Flexible color palette with core and accent palettes',
              'Type system for headlines, body, and UI',
              'Mockups for stationery, merch, and social',
            ],
          },
        },
        {
          id: 'jutech',
          type: 'Branding',
          title: 'Jutech Horizon Brand Refresh',
          description: 'Full brand system with identity, tone, and presentation assets.',
          href: '#jutech',
          cta: 'Open project',
          detail: {
            summary: 'A refreshed visual identity for Jutech Horizon with modern systemization and brand extensions.',
            role: 'Brand strategy, visual language, and campaign-ready assets.',
            tools: ['Brand strategy', 'Logo system', 'Visual language', 'Presentation design'],
            previewImages: [
              { title: 'Brand toolkit', caption: 'Logo system, color and type.' },
              { title: 'Application', caption: 'Packaging and digital examples.' },
            ],
            behanceUrl: 'https://www.behance.net/your-profile',
            highlights: [
              'Tone-driven color and texture system',
              'Signature type pairings and brand rules',
              'Identity applications for packaging, digital, and editorial',
              'Concepts for launch campaigns and social',
            ],
          },
        },
        {
          id: 'campus-turkey',
          type: 'Album Cover',
          title: 'Campus Turkey Cover Design',
          description: 'Album art concept with artwork treatment, typography, and visual direction.',
          href: '#campus-turkey',
          cta: 'Open project',
          detail: {
            summary: 'A bold album cover concept that combines imagery, typography, and mood-driven design.',
            role: 'Cover art direction, typography treatment, and release packaging layout.',
            tools: ['Cover art', 'Typography', 'Texture', 'Release mockups'],
            previewImages: [
              { title: 'Cover layout', caption: 'Primary album art treatment.' },
              { title: 'Release mockup', caption: 'Digital and physical presentation.' },
            ],
            behanceUrl: 'https://www.behance.net/your-profile',
            highlights: [
              'Striking title treatment and branding',
              'Mood-led visual palette and texture system',
              'Release package and social teaser ideas',
              'Streaming and physical packaging presentation',
            ],
          },
        },
        {
          id: 'mirror-inc',
          type: 'Album Cover',
          title: 'Mirror Inc. Release Package',
          description: 'Release package preview with cover, merch, and streaming presentation.',
          href: '#mirror-inc',
          cta: 'Open project',
          detail: {
            summary: 'A release package mockup with cover art, merch staging, and streaming layout concepts.',
            role: 'Visual packaging, merch styling, and release UX presentation.',
            tools: ['Cover mockups', 'Merch layout', 'Streaming UI', 'Release guide'],
            previewImages: [
              { title: 'Merch concept', caption: 'Package and wearable mocks.' },
              { title: 'Streaming UI', caption: 'Track list and release page.' },
            ],
            behanceUrl: 'https://www.behance.net/your-profile',
            highlights: [
              'Cover art applications for vinyl and digital',
              'Merch and promo concept styling',
              'Streaming layout with track list hierarchy',
              'Release campaign presentation ideas',
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
    preview: 'Brand identity, web design, art direction, and content — standalone or bundled.',
    panel: {
      eyebrow: 'Services',
      title: 'What I offer.',
      body: 'Brand identity systems, web design and build, art direction for print and campaign work, and UGC/marketing content — as standalone engagements or bundled partnerships.',
    },
  },
  {
    id: 'about',
    label: 'About',
    cat: 'The Studio',
    preview: 'How AW. works — strategy first, AI as reasoning backbone, craft always by hand.',
    panel: {
      eyebrow: 'About',
      title: 'Agency-depth thinking, one hand on every pixel.',
      body: 'AW. is a Lagos-based independent creative studio. Strategy is resolved before any visual direction begins; a systematized reasoning process extends range and speed, but every mark is executed manually.',
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
        { name: 'Starter', price: 'From ₦350k', features: ['Single deliverable (logo, one-page site, or content batch)', '1 revision round', '2 week turnaround'] },
        { name: 'Studio', price: 'From ₦850k', features: ['Full brand identity or web design', '2 revision rounds', '4–6 week turnaround'] },
        { name: 'Partner', price: 'From ₦1.6M', features: ['Brand + web, fully integrated', '3 revision rounds', 'Dedicated async support'] },
        { name: 'Retainer', price: 'Custom', features: ['Ongoing brand + content partnership', 'Priority turnaround', 'Monthly strategy check-in'] },
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
