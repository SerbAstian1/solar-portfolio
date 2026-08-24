import { useState } from 'react'
import DitherCanvas from './components/DitherCanvas.jsx'
import MobileNav from './components/MobileNav.jsx'
import PanelOverlay from './components/PanelOverlay.jsx'
import SolarSystem from './components/SolarSystem.jsx'
import { PLANETS } from './data/planets.js'
import './styles/scene.css'

export default function App() {
  const [mobileSelectedId, setMobileSelectedId] = useState(null)
  const mobileSelectedPlanet = PLANETS.find((p) => p.id === mobileSelectedId) || null

  return (
    <>
      <DitherCanvas />

      {/* Keyboard/screen-reader fallback nav — reachable regardless of viewport */}
      <nav className="visually-hidden-nav" aria-label="Site navigation">
        {PLANETS.map((p) => (
          <a href="#" key={p.id} onClick={(e) => { e.preventDefault(); setMobileSelectedId(p.id) }}>
            {p.label}
          </a>
        ))}
      </nav>

      <div className="desktop-only">
        <SolarSystem />
      </div>

      <div className="mobile-only">
        <MobileNav onSelect={setMobileSelectedId} />
        <PanelOverlay planet={mobileSelectedPlanet} onClose={() => setMobileSelectedId(null)} />
      </div>
    </>
  )
}
