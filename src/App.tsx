import { Suspense, lazy, useState } from 'react'
import DitherCanvas from './components/DitherCanvas'
import MobileNav from './components/MobileNav'
import PanelOverlay from './components/PanelOverlay'
import { DESKTOP_QUERY, useMediaQuery } from './hooks/useMediaQuery'
import { PLANETS } from './data/planets'
import './styles/scene.css'

/**
 * The 3D scene is the entire three/R3F/drei payload plus ~1MB of models.
 * Loading it behind React.lazy puts all of that in its own chunk, and
 * gating the mount on a media query means a phone never requests the
 * chunk at all — previously it was hidden with `display:none`, which
 * hides a component without unmounting it or preventing its imports.
 */
const SolarSystem = lazy(() => import('./components/SolarSystem.jsx'))

export default function App() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [navSelectedId, setNavSelectedId] = useState<string | null>(null)
  const navSelectedPlanet = PLANETS.find((p) => p.id === navSelectedId) || null

  return (
    <>
      <DitherCanvas />

      {/* Keyboard/screen-reader navigation. Reachable at every viewport, and
          its panel now renders at every viewport too — it previously lived
          inside a desktop-hidden container, so activating a link on a wide
          screen produced nothing at all. Focus management and Escape are
          still outstanding (Phase 05). */}
      <nav className="visually-hidden-nav" aria-label="Site navigation">
        {PLANETS.map((p) => (
          <a
            href="#"
            key={p.id}
            onClick={(e) => {
              e.preventDefault()
              setNavSelectedId(p.id)
            }}
          >
            {p.label}
          </a>
        ))}
      </nav>

      {isDesktop ? (
        <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}>
          <SolarSystem />
        </Suspense>
      ) : (
        <div className="mobile-only">
          <MobileNav onSelect={setNavSelectedId} />
        </div>
      )}

      <PanelOverlay planet={navSelectedPlanet} onClose={() => setNavSelectedId(null)} />
    </>
  )
}
