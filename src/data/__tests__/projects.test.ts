import { describe, expect, it } from 'vitest'
import { PLANETS } from '../planets'
import type { Project } from '../types'

const PROJECTS: readonly Project[] = PLANETS.flatMap((p) => p.panel.projects ?? [])

const hasShowcase = (p: Project) =>
  Boolean(
    p.detail.logos?.length ||
      p.detail.palette?.length ||
      p.detail.fonts?.length ||
      p.detail.applications?.length,
  )

describe('the project deck', () => {
  it('has projects to test', () => {
    expect(PROJECTS.length).toBeGreaterThan(0)
  })

  it('gives every project a unique id', () => {
    const ids = PROJECTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('album cover projects', () => {
  /* Selected on the cover itself, not on a Spotify link.
     This filtered on spotifyUrl, which held only while the two cover projects
     here were placeholders carrying an example track id. Real releases arrived
     without links to hand, every cover project vanished from the filter, and
     the suite reported that cover projects had stopped existing — a true
     statement about the filter and a false one about the data. The cover is
     what makes a cover project. */
  const albums = PROJECTS.filter((p) => p.detail.cover)

  it('exist', () => {
    expect(albums.length).toBeGreaterThan(0)
  })

  it('gives every face a title, and artwork where it claims one', () => {
    // A face with no title renders a blank switch option, and the caption
    // beneath the tile goes empty with it.
    for (const project of albums) {
      expect(project.detail.cover!.length).toBeGreaterThan(0)
      for (const face of project.detail.cover!) {
        expect(face.title.trim()).not.toBe('')
        if (face.src !== undefined) expect(face.src.startsWith('/')).toBe(true)
      }
    }
  })

  it('keeps face titles distinct within a release', () => {
    // They key the switch buttons and label them, so a repeat is both a React
    // key collision and two buttons a visitor cannot tell apart.
    for (const project of albums) {
      const titles = project.detail.cover!.map((f) => f.title)
      expect(new Set(titles).size).toBe(titles.length)
    }
  })

  it('points every Spotify link at Spotify, over https', () => {
    // The link is rendered wherever the field is present, so a mistyped host
    // would ship a button that says Spotify and goes somewhere else.
    for (const project of albums) {
      if (!project.detail.spotifyUrl) continue
      const url = new URL(project.detail.spotifyUrl)
      expect(url.protocol).toBe('https:')
      expect(['open.spotify.com', 'spotify.com']).toContain(url.hostname)
    }
  })

  it('carries a cover rather than showcase sections', () => {
    // Cover work has no marks, palette or applications to expand into. The two
    // shapes are meant to stay distinct: a project is either a brand system
    // with sections, or a cover with a link.
    for (const project of albums) {
      expect(project.detail.cover).toBeTruthy()
      expect(hasShowcase(project)).toBe(false)
    }
  })

  it('does not also advertise a Behance page', () => {
    for (const project of albums) {
      expect(project.detail.behanceUrl).toBeUndefined()
    }
  })
})

describe('brand system projects', () => {
  const systems = PROJECTS.filter(hasShowcase)

  it('exist', () => {
    expect(systems.length).toBeGreaterThan(0)
  })

  it('carries no Spotify link or cover', () => {
    for (const project of systems) {
      expect(project.detail.spotifyUrl).toBeUndefined()
      expect(project.detail.cover).toBeUndefined()
    }
  })
})

describe('every outbound link', () => {
  it('is absolute and https', () => {
    for (const project of PROJECTS) {
      for (const url of [project.detail.behanceUrl, project.detail.spotifyUrl]) {
        if (!url) continue
        expect(() => new URL(url)).not.toThrow()
        expect(new URL(url).protocol).toBe('https:')
      }
    }
  })
})
