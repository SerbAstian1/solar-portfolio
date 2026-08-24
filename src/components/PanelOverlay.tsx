import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PlanetContent, Project } from '../data/types'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { DURATION, EASE_OUT_EXPO } from '../motion'
import OutlineButton from './OutlineButton'

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
            <button className="panel-close" aria-label="Close panel" onClick={onClose}>
              Close ✕
            </button>

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

                {activeProject.detail.previewImages && (
                  <div className="project-detail-gallery">
                    {activeProject.detail.previewImages.map((card) => (
                      <div className="project-preview-card" key={card.title}>
                        <div className="project-preview-thumb">
                          <span>{card.title}</span>
                        </div>
                        <h4>{card.title}</h4>
                        <p>{card.caption}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="project-detail-meta">
                  <div>
                    <strong>Role</strong>
                    <p>{activeProject.detail.role}</p>
                  </div>
                  <div>
                    <strong>Tools</strong>
                    <p>{activeProject.detail.tools.join(', ')}</p>
                  </div>
                </div>

                <ul className="project-detail-list">
                  {activeProject.detail.highlights.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="project-detail-actions">
                  {activeProject.detail.behanceUrl && (
                    <a href={activeProject.detail.behanceUrl} target="_blank" rel="noreferrer" className="btn-outline">
                      Preview on Behance
                    </a>
                  )}
                  <button type="button" className="btn-outline" onClick={() => setActiveProjectId(null)}>
                    Back to projects
                  </button>
                </div>
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
