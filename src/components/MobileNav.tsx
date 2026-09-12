import { PLANETS } from '../data/planets'
import PixelIcon, { SECTION_ICONS } from './PixelIcon'

interface MobileNavProps {
  onSelect: (id: string) => void
}

/*
 * This nav is not a fallback in the usual sense — it is the whole navigation
 * for every visitor on a small screen, and the one on a desktop whose GPU
 * could not run the scene. Those visitors lose the planets entirely, which is
 * the site's only non-textual way of telling five sections apart. Five tiles of
 * identical grey text is what is left, and a mark per tile is what gives the
 * scanning eye something to land on again.
 */

export default function MobileNav({ onSelect }: MobileNavProps) {
  return (
    <div className="mobile-nav">
      <div className="eyebrow">Akagha Wisdom Creative Studio</div>
      <h1>Brand and digital work, reasoned through, hand-built.</h1>

      {PLANETS.map((p) => {
        const icon = SECTION_ICONS[p.id]
        return (
          <button className="mobile-tile" key={p.id} onClick={() => onSelect(p.id)}>
            {/* Decorative: the label directly beneath it says the same thing,
                and announcing both reads the section name twice. */}
            {icon && <PixelIcon name={icon} className="mobile-tile-mark" />}
            <span className="cat">{p.cat}</span>
            <h5>{p.label}</h5>
            <p>{p.preview}</p>
          </button>
        )
      })}
    </div>
  )
}
