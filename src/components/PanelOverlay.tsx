import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PlanetContent, Project } from '../data/types'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { DURATION, EASE_OUT_EXPO } from '../motion'
import OutlineButton, { OutlineLink } from './OutlineButton'
import ProjectShowcase, { ProjectCover } from './ProjectShowcase'

interface PanelOverlayProps {
  planet: PlanetContent | null
  /** Omitted by the fallback nav, which has no phased transition to wait on. */
  visible?: boolean
  onClose: () => void
  /** Controlled when the scene is present, so a project moon and a project
   *  card address the same selection. Uncontrolled on the mobile branch. */
  activeProjectId?: string | null
  onActiveProjectChange?: (id: string | null) => void
}

export default function PanelOverlay({
  planet,
  visible,
  onClose,
  activeProjectId: controlledProjectId,
  onActiveProjectChange,
}: PanelOverlayProps) {
  const [uncontrolledProjectId, setUncontrolledProjectId] = useState<string | null>(null)
  const activeProjectId = controlledProjectId ?? uncontrolledProjectId
  const setActiveProjectId = onActiveProjectChange ?? setUncontrolledProjectId
  const panelRef = useRef<HTMLDivElement | null>(null)
  const show = Boolean(planet) && (visible ?? true)

  useFocusTrap(panelRef, show, onClose)

  useEffect(() => {
    setActiveProjectId(null)
    // setActiveProjectId is stable in both the controlled and uncontrolled
    // cases; depending on it would reset the selection on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet])

  const activeProject: Project | null =
    planet?.panel?.projects?.find((project) => project.id === activeProjectId) ?? null

  return (
    <AnimatePresence>
      {show && planet && (
        <motion.div className="panel-overlay is-open">
          <motion.div
            className="panel-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.scrim, ease: EASE_OUT_EXPO }}
            onClick={onClose}
          />
          {/* Step 4 — glass panel fades up and scales into view */}
          <motion.div
            ref={panelRef}
            className="panel panel-glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: DURATION.panel, ease: EASE_OUT_EXPO }}
          >
            {/* One control, two jobs, and it sticks to the top of the scroll
                area rather than scrolling away with the content — which is
                what lets the duplicate "back to projects" button at the foot
                of a long project go. Escape still closes the panel outright
                from either level. */}
            <div className="panel-bar">
              <button
                className="panel-close"
                aria-label={activeProject ? 'Back to projects' : 'Close panel'}
                onClick={activeProject ? () => setActiveProjectId(null) : onClose}
              >
                {activeProject ? '← Back' : 'Close ✕'}
              </button>
            </div>

            <div className="eyebrow">{planet.panel.eyebrow}</div>
            <h2 id="panel-title">{planet.panel.title}</h2>
            {planet.panel.body && <p>{planet.panel.body}</p>}

            {planet.panel.tiers && (
              <div className="pricing-grid">
                {planet.panel.tiers.map((tier) => (
                  <div className="price-tier" key={tier.name}>
                    <div className="tier-name">{tier.name}</div>
                    <div className="tier-price">{tier.price}</div>
                    <ul>
                      {tier.features.map((f: string) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {planet.panel.projects && !activeProject && (
              <div className="project-grid">
                {planet.panel.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="project-card"
                    onClick={() => setActiveProjectId(project.id)}
                  >
                    <div className="project-tag">{project.type}</div>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <span className="project-link">{project.cta}</span>
                  </button>
                ))}
              </div>
            )}

            {activeProject && (
              <motion.div
                className="project-detail-modal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: DURATION.content, ease: EASE_OUT_EXPO }}
              >
                <div className="project-detail-header">
                  <div className="project-tag">{activeProject.type}</div>
                  <h3>{activeProject.title}</h3>
                  <p>{activeProject.detail.summary}</p>
                </div>

                {/* The work comes first and takes the room. Everything below it
                    is reference the client reads once, so it is set small and
                    kept out of the way of the thing they came to look at. */}
                {activeProject.detail.cover && (
                  <ProjectCover cover={activeProject.detail.cover} />
                )}

                <ProjectShowcase detail={activeProject.detail} />

                <dl className="project-facts">
                  <div>
                    <dt>Role</dt>
                    <dd>{activeProject.detail.role}</dd>
                  </div>
                  <div>
                    <dt>Tools</dt>
                    <dd>{activeProject.detail.tools.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Delivered</dt>
                    <dd>{activeProject.detail.highlights.join(' · ')}</dd>
                  </div>
                </dl>

                {(activeProject.detail.spotifyUrl || activeProject.detail.behanceUrl) && (
                  <div className="project-detail-actions">
                    {activeProject.detail.spotifyUrl && (
                      <OutlineLink
                        href={activeProject.detail.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Listen on Spotify
                      </OutlineLink>
                    )}
                    {activeProject.detail.behanceUrl && (
                      <OutlineLink
                        href={activeProject.detail.behanceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview on Behance
                      </OutlineLink>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {planet.panel.contact && (
              <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" type="text" placeholder="Your full name" />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" placeholder="you@company.com" />
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" rows={4} placeholder="What are you building?" />
                </div>
              </form>
            )}

            <div style={{ marginTop: 32 }}>
              <OutlineButton>Start a project</OutlineButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
