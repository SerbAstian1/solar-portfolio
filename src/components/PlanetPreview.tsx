import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PlanetContent } from '../data/types'

interface PlanetPreviewProps {
  planet: PlanetContent | null
}

/**
 * Hover card for a planet. The outer anchor is a zero-size point that
 * ThreeSolarSystem moves to the planet's projected position each frame; the
 * card hangs off it, so nothing here needs to know about screen coordinates.
 */
const PlanetPreview = forwardRef<HTMLDivElement, PlanetPreviewProps>(function PlanetPreview(
  { planet },
  ref,
) {
  return (
    <div className="planet-preview-anchor" ref={ref} aria-hidden="true">
      <div className="planet-preview-slot">
        <AnimatePresence>
          {planet && (
            <motion.div
              className="planet-preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cat">{planet.cat}</div>
              <h5>{planet.label}</h5>
              <p>{planet.preview}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

export default PlanetPreview
