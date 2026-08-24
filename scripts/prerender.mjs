#!/usr/bin/env node
/**
 * Emits one static HTML file per route, plus robots.txt and sitemap.xml.
 *
 * Why static generation and not SSR: every word on this site is known at
 * build time and there is no request-time data, so SSR would buy nothing and
 * cost a server. Why not plain CSR: a crawler arriving at /pricing would
 * otherwise receive an empty <div id="root"> and one title shared by all five
 * routes. Metadata set client-side is read unreliably, on a second pass, with
 * a rendering budget — for a five-page portfolio that is a needless gamble.
 *
 * Each file carries its own title, description, canonical, Open Graph and
 * Twitter tags, plus a block of real copy in #static-content. React does not
 * own that node; main.tsx removes it once the app has mounted, so it is a
 * progressive-enhancement fallback rather than a shadow copy that could drift
 * from what the visitor sees.
 *
 * Run after `vite build`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DIST = 'dist'

/* The data modules are TypeScript, so rather than adding a build step just to
   read them, the few values needed here are parsed out of the source. Keeping
   one copy of the copy is worth a small amount of parsing. */
function readTs(path) {
  return readFileSync(path, 'utf8')
}

function extractSeo() {
  const src = readTs('src/data/seo.ts')
  const entries = {}

  const home = src.match(/export const HOME_SEO: SeoEntry = \{([\s\S]*?)\n\}/)
  entries[''] = parseEntry(home[1])

  const block = src.match(/export const SEO_BY_SECTION[^=]*= \{([\s\S]*?)\n\}\n/)[1]
  const perSection = block.matchAll(/^  ([a-z-]+): \{([\s\S]*?)^  \},$/gm)
  for (const [, id, body] of perSection) entries[id] = parseEntry(body)

  const origin = src.match(/SITE_ORIGIN = '([^']+)'/)[1]
  const siteName = src.match(/SITE_NAME = '([^']+)'/)[1]
  return { entries, origin, siteName }
}

function parseEntry(body) {
  const title = body.match(/title:\s*\n?\s*'([\s\S]*?)',/)[1]
  const description = body.match(/description:\s*\n?\s*'([\s\S]*?)',/)[1]
  return { title, description: description.replace(/\s*\n\s*/g, ' ') }
}

function extractSections() {
  const src = readTs('src/data/planets.ts')
  const sections = []
  const re = /\{\s*\n\s*id: '([a-z-]+)',\s*\n\s*label: '([^']+)',\s*\n\s*cat: '([^']+)',/g
  let m
  while ((m = re.exec(src)) !== null) sections.push({ id: m[1], label: m[2], cat: m[3] })

  // Panel titles, in document order, pair with the sections above.
  const titles = [...src.matchAll(/^\s{6}title: ['"]([^'"]+)['"],$/gm)].map((t) => t[1])
  sections.forEach((s, i) => {
    s.headline = titles[i] ?? s.label
  })
  return sections
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const { entries, origin, siteName } = extractSeo()
const sections = extractSections()
/* Idempotency. This script reads dist/index.html as its template AND writes
   back to it, so a second run without an intervening `vite build` would inject
   a second head block on top of the first — duplicate canonicals and two
   competing descriptions, which is worse than no metadata. Injected regions
   are fenced and stripped before re-injecting, so any number of runs converge
   on the same output. */
const HEAD_START = '<!--seo:start-->'
const HEAD_END = '<!--seo:end-->'
const BODY_START = '<!--static:start-->'
const BODY_END = '<!--static:end-->'

function stripInjected(html) {
  return html
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/g, '<title></title>')
    .replace(/<!--static:start-->[\s\S]*?<!--static:end-->/g, '')
}

const template = stripInjected(readFileSync(join(DIST, 'index.html'), 'utf8'))

function organizationLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: origin,
    description: entries[''].description,
    address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
  })
}

function pageLd(section, seo, url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url,
    isPartOf: { '@type': 'WebSite', name: siteName, url: origin },
  })
}

function staticContent(section) {
  if (!section) {
    return sections
      .map((s) => `<li><a href="/${s.id}">${escape(s.label)} — ${escape(s.cat)}</a></li>`)
      .join('')
  }
  return `<h2>${escape(section.headline)}</h2><p>${escape(entries[section.id].description)}</p>`
}

function render(section) {
  const id = section ? section.id : ''
  const seo = entries[id]
  const path = section ? `/${section.id}` : '/'
  const url = `${origin}${path}`

  const head = [
    `<title>${escape(seo.title)}</title>`,
    `<meta name="description" content="${escape(seo.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(siteName)}" />`,
    `<meta property="og:title" content="${escape(seo.title)}" />`,
    `<meta property="og:description" content="${escape(seo.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${origin}/og-cover.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(seo.title)}" />`,
    `<meta name="twitter:description" content="${escape(seo.description)}" />`,
    `<meta name="twitter:image" content="${origin}/og-cover.png" />`,
    `<script type="application/ld+json">${section ? pageLd(section, seo, url) : organizationLd()}</script>`,
  ].join('\n  ')

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `${HEAD_START}\n  ${head}\n  ${HEAD_END}`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n  ${BODY_START}\n  <div id="static-content" hidden>\n    <h1>${escape(seo.title)}</h1>\n    ${staticContent(section)}\n  </div>\n  ${BODY_END}`,
    )
  return html
}

mkdirSync(DIST, { recursive: true })
writeFileSync(join(DIST, 'index.html'), render(null))

for (const section of sections) {
  const dir = join(DIST, section.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), render(section))
}

const urls = ['/', ...sections.map((s) => `/${s.id}`)]
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
)

writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
)

console.log(`  prerendered ${urls.length} routes + sitemap.xml + robots.txt`)
for (const section of sections) {
  const seo = entries[section.id]
  console.log(
    `    /${section.id.padEnd(9)} title ${String(seo.title.length).padStart(3)}  desc ${seo.description.length}`,
  )
}
void pathToFileURL
