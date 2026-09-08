import { Suspense, lazy } from 'react'
import DitherCanvas from './components/DitherCanvas'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorPage from './components/ErrorPage'
import SceneLoading from './components/SceneLoading'
import TelemetryStrip from './components/TelemetryStrip'
import MobileNav from './components/MobileNav'
import PanelOverlay from './components/PanelOverlay'
import { useRipple } from './hooks/useRipple'
import { useSpatialMode } from './hooks/useSpatialMode'
import { useRouteSection } from './navigation/useRouteSection'
import { PLANETS } from './data/planets'
import './styles/scene.css'

/**
 * The 3D scene is the entire three/R3F/drei payload plus ~1MB of models.
 * React.lazy puts all of that in its own chunk, and gating the mount on a
 * media query means a phone never requests the chunk at all — it was
 * previously hidden with `display:none`, which hides a component without
 * unmounting it or preventing its imports.
 */
const SolarSystem = lazy(() => import('./components/SolarSystem'))

export default function App() {
  const mode = useSpatialMode()
  /* One delegated listener for every control on the page, including the ones
     inside the lazily loaded scene and the error pages below. */
  useRipple()
  const hasScene = mode !== 'list'

  /* Routing is owned here, once. Both viewport branches and the fallback nav
     read the same section, so a link, a planet click and the back button
     cannot disagree about where the visitor is. */
  const { sectionId, notFound, navigate } = useRouteSection()
  const section = PLANETS.find((p) => p.id === sectionId) ?? null

  /* A path that names nothing renders the 404 and stops there. The scene is
     not mounted for it: a wrong URL should not pull a megabyte of models down
     to decorate the answer, and the dithered starfield alone still makes the
     page look like this site. */
  if (notFound) {
    return (
      <>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <DitherCanvas />
        {/* The rail runs here too. It is the site's furniture rather than the
            scene's — it carries the clock, and it is the one thing on a 404
            that is still working normally. */}
        <TelemetryStrip />
        <ErrorPage
          code="404"
          title="There is nothing at this address."
          message="The link may be mistyped, or it may have pointed at something that has since moved. Neither is your problem to solve."
          action={{ label: 'Back to the system', onClick: () => navigate(null) }}
          showSections
        />
      </>
    )
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <DitherCanvas />

      {/* Mounted outside the scene branch on purpose: it is a clock first, and
          a clock that disappears on a phone is a worse clock. Without the
          scene it simply has no telemetry to cycle to and holds the time. */}
      <TelemetryStrip retracted={section !== null} />

      {/* Exactly one h1 at every viewport. The scene branch has no visible
          heading of its own, so the document previously started at h2 on
          desktop — a WCAG structure failure and an SEO one on a page that
          already ships little crawlable copy. MobileNav supplies the visible
          h1 on small screens. */}
      {hasScene && (
        <h1 className="visually-hidden">
          AW. — Akagha Wisdom Creative Studio: brand and digital work
        </h1>
      )}

      {/* Keyboard and screen-reader navigation, reachable at every viewport.
          These are real links to real URLs, so they work with middle-click,
          copy-link, and browser history like any other navigation. */}
      <nav className="visually-hidden-nav" aria-label="Sections">
        {PLANETS.map((p) => (
          <a
            href={`/${p.id}`}
            key={p.id}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navigate(p.id)
            }}
          >
            {p.label}
          </a>
        ))}
      </nav>

      {hasScene ? (
        /* If the scene throws — an unusual GPU, a model that will not parse, a
           chunk that never arrives — the site does not need to apologise. It
           already carries a complete WebGL-free way to navigate itself for
           small screens, and that path is what a desktop visitor gets instead.
           Same components, same URLs, no 3D. The notice explains the missing
           scene so the plainer page does not read as the whole site. */
        <ErrorBoundary
          fallback={
            <div className="mobile-only">
              <p className="scene-notice" role="status">
                The interactive view could not load here, so this is the plain
                one. Everything is still reachable.{' '}
                <button type="button" onClick={() => window.location.reload()}>
                  Try again
                </button>
              </p>
              <MobileNav onSelect={navigate} />
              <PanelOverlay planet={section} onClose={() => navigate(null)} onNavigate={navigate} />
            </div>
          }
        >
          <Suspense fallback={<SceneLoading />}>
            <SolarSystem
              sectionId={sectionId}
              navigate={navigate}
              mode={mode === 'full' ? 'full' : 'compact'}
            />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <div className="mobile-only">
          <MobileNav onSelect={navigate} />
          <PanelOverlay planet={section} onClose={() => navigate(null)} onNavigate={navigate} />
        </div>
      )}
    </>
  )
}
