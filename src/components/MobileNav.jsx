import { PLANETS } from '../data/planets.js'

export default function MobileNav({ onSelect }) {
  return (
    <div className="mobile-nav">
      <div className="eyebrow">Akagha Wisdom Creative Studio</div>
      <h1>Brand and digital work, reasoned through, hand-built.</h1>

      {PLANETS.map((p) => (
        <button className="mobile-tile" key={p.id} onClick={() => onSelect(p.id)}>
          <span className="cat">{p.cat}</span>
          <h5>{p.label}</h5>
          <p>{p.preview}</p>
        </button>
      ))}
    </div>
  )
}
