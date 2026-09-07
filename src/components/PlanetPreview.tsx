import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PlanetContent } from '../data/types'
import { SPRING } from '../motion'

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
              /* Grows from the planet it belongs to rather than from its own
                 middle, so the card reads as coming out of the body under the
                 pointer. */
              style={{ transformOrigin: '50% 100%' }}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={SPRING.hint}
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
