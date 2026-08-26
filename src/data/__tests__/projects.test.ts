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
  const albums = PROJECTS.filter((p) => p.detail.spotifyUrl)

  it('exist', () => {
    expect(albums.length).toBeGreaterThan(0)
  })

  it('points every Spotify link at Spotify, over https', () => {
    // The link is rendered wherever the field is present, so a mistyped host
    // would ship a button that says Spotify and goes somewhere else.
    for (const project of albums) {
      const url = new URL(project.detail.spotifyUrl!)
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
