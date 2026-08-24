import { Suspense, lazy } from 'react'
import DitherCanvas from './components/DitherCanvas'
import MobileNav from './components/MobileNav'
import PanelOverlay from './components/PanelOverlay'
import { DESKTOP_QUERY, useMediaQuery } from './hooks/useMediaQuery'
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
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  /* Routing is owned here, once. Both viewport branches and the fallback nav
     read the same section, so a link, a planet click and the back button
     cannot disagree about where the visitor is. */
  const { sectionId, navigate } = useRouteSection()
  const section = PLANETS.find((p) => p.id === sectionId) ?? null

  return (
    <>
      <DitherCanvas />

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

      {isDesktop ? (
        <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}>
          <SolarSystem sectionId={sectionId} navigate={navigate} />
        </Suspense>
      ) : (
        <div className="mobile-only">
          <MobileNav onSelect={navigate} />
          <PanelOverlay planet={section} onClose={() => navigate(null)} />
        </div>
      )}
    </>
  )
}
