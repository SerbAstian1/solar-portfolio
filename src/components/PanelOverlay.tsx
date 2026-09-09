import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PlanetContent, PricingTier, Project } from '../data/types'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { DURATION, EASE_OUT_EXPO, SPRING } from '../motion'
import OutlineButton, { OutlineLink } from './OutlineButton'
import ProjectShowcase, { ProjectCover } from './ProjectShowcase'
import ContactForm, { EMPTY_CONTACT, isContactComplete, type ContactValues } from './ContactForm'
import { submitContact, type SubmitState } from '../utils/submitContact'

/* The submit button sits outside the <form> element, below it in the panel's
   flow, so it is associated by id rather than by nesting. */
const CONTACT_FORM_ID = 'contact-form'

interface PanelOverlayProps {
  planet: PlanetContent | null
  /** Lets the panel send a visitor to another section — the primary button on
   *  every non-contact panel goes to Contact. */
  onNavigate?: (id: string) => void
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
  onNavigate,
  visible,
  onClose,
  activeProjectId: controlledProjectId,
  onActiveProjectChange,
}: PanelOverlayProps) {
  const [uncontrolledProjectId, setUncontrolledProjectId] = useState<string | null>(null)
  const activeProjectId = controlledProjectId ?? uncontrolledProjectId
  const setActiveProjectId = onActiveProjectChange ?? setUncontrolledProjectId
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isContact = Boolean(planet?.panel.contact)
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT)
  /* A counter rather than a boolean: two incomplete submits in a row have to
     be distinguishable, or the second one moves no focus. */
  const [focusRequest, setFocusRequest] = useState(0)
  const complete = isContactComplete(contact)

  /* Picking a tier fills in what it already tells us and moves to Contact.
     The panel does not remount between sections, so the values set here are
     still there when the form renders.

     Only the two fields the tier actually determines are filled. Guessing at
     the project type or the timeline from a price band would put words in
     someone's mouth and, worse, leave the form looking complete when nobody
     had answered it. */
  const chooseTier = useCallback(
    (tier: PricingTier) => {
      setContact((current) => ({
        ...current,
        budget: tier.budget,
        brief: current.brief.trim() === ''
          ? `Interested in the ${tier.name} tier (${tier.price}). `
          : current.brief,
      }))
      onNavigate?.('contact')
    },
    [onNavigate],
  )

  const [status, setStatus] = useState<SubmitState>('idle')
  const [failure, setFailure] = useState<string | null>(null)

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!complete) {
        setFocusRequest((n) => n + 1)
        return
      }
      // Guards the double-click and the impatient second press alike.
      if (status === 'sending') return

      setStatus('sending')
      setFailure(null)
      /* Read off the form itself rather than tracked in state: it is not the
         visitor's data, and nothing on screen should ever reflect it. */
      const gotcha = String(new FormData(event.currentTarget as HTMLFormElement).get('_gotcha') ?? '')
      const result = await submitContact(contact, gotcha)
      if (result.ok) {
        setStatus('sent')
        /* Cleared only now. Wiping it on submit would lose everything the
           moment a request failed, which is exactly when someone least wants
           to retype it. */
        setContact(EMPTY_CONTACT)
      } else {
        setStatus('error')
        setFailure(result.message ?? 'That did not send.')
      }
    },
    [complete, contact, status],
  )

  const show = Boolean(planet) && (visible ?? true)

  useFocusTrap(panelRef, show, onClose)

  useEffect(() => {
    setActiveProjectId(null)
    // setActiveProjectId is stable in both the controlled and uncontrolled
    // cases; depending on it would reset the selection on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setStatus('idle')
    setFailure(null)
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
            exit={{ opacity: 0, transition: SPRING.scrimExit }}
            transition={SPRING.scrim}
            onClick={onClose}
          />
          {/* Step 4 — glass panel fades up and scales into view */}
          <motion.div
            ref={panelRef}
            className="panel panel-glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            initial={{ opacity: 0, x: 28, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            /* The exit carries its own, shorter transition. ease-out-expo
               spends most of a short duration almost stationary, which on the
               way out reads as the panel hesitating; a plain ease-out leaves
               immediately. */
            /* Enters and leaves along the same path: in from the right edge it
               is docked to, back out the same way. The origin is that edge
               rather than the panel's centre, so it grows from where it comes
               from instead of inflating in place. */
            style={{ transformOrigin: '100% 50%' }}
            exit={{ opacity: 0, x: 24, scale: 0.99, transition: SPRING.panelExit }}
            transition={SPRING.panel}
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

            {planet.panel.services && (
              <section className="services" aria-label="Services">
                {/* The two that carry the studio, given the room to say what
                    they actually include. */}
                <div className="service-primary">
                  {planet.panel.services.primary.map((service) => (
                    <article className="service-card" key={service.name}>
                      <h3>{service.name}</h3>
                      <p className="service-summary">{service.summary}</p>
                      {service.includes && (
                        <ul className="service-includes">
                          {service.includes.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>

                {/* Set apart rather than listed alongside. These are real
                    services, but they attach to a project rather than being
                    the reason one starts, and ranking them level with a whole
                    identity system misrepresents both. */}
                <div className="service-secondary">
                  <h3 className="service-secondary-label">Alongside the above</h3>
                  <ul>
                    {planet.panel.services.secondary.map((service) => (
                      <li key={service.name}>
                        <span className="service-secondary-name">{service.name}</span>
                        <span className="service-secondary-summary">{service.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

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
                    {/* A button laid over the whole card rather than the card
                        made into one. A <button> may only contain phrasing
                        content, and this card holds a list — wrapping it would
                        be invalid markup that browsers then reflow
                        unpredictably. This keeps the card's structure intact,
                        makes every pixel of it clickable, and puts a single
                        real control in the tab order with a label that says
                        what it does rather than reading the card aloud. */}
                    <button
                      type="button"
                      className="tier-choose"
                      onClick={() => chooseTier(tier)}
                    >
                      Start a {tier.name} project
                    </button>
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
                transition={SPRING.content}
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

            {planet.panel.contact && status === 'sent' && (
              /* Only reachable after a response that actually said ok — a
                 thank-you for a message that went nowhere is worse than an
                 error. role=status announces it without stealing focus. */
              <div className="contact-sent" role="status">
                <p className="contact-sent-title">That's sent.</p>
                <p className="contact-sent-body">
                  I reply within two working days, to the address you gave.
                </p>
                <OutlineButton onClick={() => setStatus('idle')}>Send another</OutlineButton>
              </div>
            )}

            {planet.panel.contact && status !== 'sent' && (
              <form
                id={CONTACT_FORM_ID}
                className="contact-form-shell"
                onSubmit={onSubmit}
                noValidate
                aria-busy={status === 'sending' || undefined}
              >
                <ContactForm
                  values={contact}
                  onChange={setContact}
                  focusRequest={focusRequest}
                />
                {failure && (
                  // Assertive, not polite: the visitor pressed a button and is
                  // waiting to hear whether it worked.
                  <p className="contact-error" role="alert">
                    {failure}
                  </p>
                )}
              </form>
            )}

            {/* One button, two jobs. On every other panel it is the way to
                Contact; on Contact itself it is the form's submit, so the
                visitor is never offered a route to the page they are already
                on. */}
            <div className="panel-cta">
              {isContact && status === 'sent' ? null : isContact ? (
                <OutlineButton
                  type="submit"
                  form={CONTACT_FORM_ID}
                  className={complete ? 'is-ready' : 'is-waiting'}
                  aria-live="polite"
                  /* Deliberately not `disabled`. A disabled button cannot be
                     focused, so a keyboard or screen-reader user has no way to
                     reach it and find out what is missing — they are simply
                     stuck. It stays reachable and says it is not ready
                     instead, and pressing it moves focus to the first gap. */
                  aria-disabled={!complete || undefined}
                >
                  {status === 'sending' ? 'Sending' : 'Submit'}
                </OutlineButton>
              ) : (
                <OutlineButton onClick={() => onNavigate?.('contact')}>
                  Start a project
                </OutlineButton>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
