import { useRef, useState } from 'react'

export interface ContactValues {
  name: string
  email: string
  projectType: string
  budget: string
  timeline: string
  brief: string
}

export const EMPTY_CONTACT: ContactValues = {
  name: '',
  email: '',
  projectType: '',
  budget: '',
  timeline: '',
  brief: '',
}

/**
 * Permissive on purpose: something before an @, something after it, a dot in
 * the domain, no spaces.
 *
 * Stricter patterns reject real addresses — plus-tags, new TLDs, apostrophes —
 * and the cost of a false rejection here is a lost enquiry, while the cost of
 * letting a typo through is one bounced reply. Only the delivery attempt can
 * really validate an address.
 */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

/** Every field carries information worth having, so every field is required.
 *  The two that a visitor might not know are answerable with "not sure yet"
 *  rather than left blank — see the option lists below. */
export function isContactComplete(values: ContactValues): boolean {
  return (
    values.name.trim().length > 1 &&
    looksLikeEmail(values.email) &&
    values.projectType !== '' &&
    values.budget !== '' &&
    values.timeline !== '' &&
    values.brief.trim().length >= 20
  )
}

/** The order fields are checked in, so an incomplete submit sends the visitor
 *  to the first thing missing rather than to the last. */
const FIELD_ORDER: readonly (keyof ContactValues)[] = [
  'name',
  'email',
  'projectType',
  'budget',
  'timeline',
  'brief',
]

function firstIncomplete(values: ContactValues): keyof ContactValues | null {
  for (const key of FIELD_ORDER) {
    if (key === 'email' ? !looksLikeEmail(values.email) : values[key].trim() === '') return key
    if (key === 'name' && values.name.trim().length <= 1) return key
    if (key === 'brief' && values.brief.trim().length < 20) return key
  }
  return null
}

const PROJECT_TYPES = [
  'Brand identity or guideline system',
  'Album or cover artwork',
  'Website or digital product',
  'Content or social design',
  'Something else',
]

/* Mirrors the four tiers on the Pricing panel, so an answer here means the
   same thing as the number a visitor has already seen. "Not sure yet" is a
   real answer rather than an escape hatch: plenty of good enquiries do not
   know the figure, and forcing one invents a number nobody believes. */
const BUDGETS = [
  'Under ₦350k',
  '₦350k – ₦850k',
  '₦850k – ₦1.6M',
  '₦1.6M and above',
  'Not sure yet',
]

const TIMELINES = ['As soon as possible', 'Within a month', 'One to three months', 'Flexible']

interface Props {
  values: ContactValues
  onChange: (values: ContactValues) => void
  /** Set by the panel when an incomplete form is submitted, so the form can
   *  move focus to what is missing. Reset once handled. */
  focusRequest: number
}

export default function ContactForm({ values, onChange, focusRequest }: Props) {
  const [touched, setTouched] = useState(false)
  const refs = useRef<Partial<Record<keyof ContactValues, HTMLElement | null>>>({})
  const lastRequest = useRef(focusRequest)

  if (focusRequest !== lastRequest.current) {
    lastRequest.current = focusRequest
    setTouched(true)
    const missing = firstIncomplete(values)
    if (missing) refs.current[missing]?.focus()
  }

  const set = (key: keyof ContactValues) => (value: string) =>
    onChange({ ...values, [key]: value })

  /* Only after a submit attempt. Marking a field invalid while someone is
     still typing their own name tells them they are wrong before they have
     finished being right. */
  const invalid = (key: keyof ContactValues) =>
    touched && firstIncomplete(values) !== null && (
      key === 'email' ? !looksLikeEmail(values.email)
      : key === 'brief' ? values.brief.trim().length < 20
      : key === 'name' ? values.name.trim().length <= 1
      : values[key] === ''
    )

  return (
    <div className="contact-form">
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="First and last"
          value={values.name}
          aria-invalid={invalid('name') || undefined}
          ref={(el) => { refs.current.name = el }}
          onChange={(e) => set('name')(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          aria-invalid={invalid('email') || undefined}
          ref={(el) => { refs.current.email = el }}
          onChange={(e) => set('email')(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="projectType">What kind of project is it?</label>
        <select
          id="projectType"
          value={values.projectType}
          aria-invalid={invalid('projectType') || undefined}
          ref={(el) => { refs.current.projectType = el }}
          onChange={(e) => set('projectType')(e.target.value)}
        >
          <option value="">Choose one</option>
          {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="budget">Budget</label>
          <select
            id="budget"
            value={values.budget}
            aria-invalid={invalid('budget') || undefined}
            ref={(el) => { refs.current.budget = el }}
            onChange={(e) => set('budget')(e.target.value)}
          >
            <option value="">Choose one</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="timeline">Timeline</label>
          <select
            id="timeline"
            value={values.timeline}
            aria-invalid={invalid('timeline') || undefined}
            ref={(el) => { refs.current.timeline = el }}
            onChange={(e) => set('timeline')(e.target.value)}
          >
            <option value="">Choose one</option>
            {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="brief">The project</label>
        {/* The hint does the work a placeholder cannot: placeholders vanish the
            moment someone starts typing, which is exactly when they would be
            useful. */}
        <p className="field-hint" id="brief-hint">
          What are you building, who is it for, and what does success look like?
          Anything already decided — a name, a deadline, work you like — helps.
        </p>
        <textarea
          id="brief"
          rows={5}
          aria-describedby="brief-hint"
          placeholder="A sentence or two is plenty to start."
          value={values.brief}
          aria-invalid={invalid('brief') || undefined}
          ref={(el) => { refs.current.brief = el }}
          onChange={(e) => set('brief')(e.target.value)}
        />
      </div>
    </div>
  )
}
