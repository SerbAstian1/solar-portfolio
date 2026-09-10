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

/**
 * What makes the submit read as ready.
 *
 * Five required answers, and the brief is not one of them. It used to demand
 * twenty characters, which meant a visitor could answer every question on the
 * form and still be looking at a grey button with nothing telling them the
 * long field at the bottom was the hold-up. The five that remain are each a
 * single decision, and the two a visitor might genuinely not know are
 * answerable with "not sure yet" rather than left blank — see the option
 * lists below.
 *
 * Nothing is lost by letting the brief through empty: name, address, kind of
 * project, budget and timeline is already an enquiry worth replying to, and
 * the reply can ask for the rest.
 */
export function isContactComplete(values: ContactValues): boolean {
  return (
    values.name.trim().length > 1 &&
    looksLikeEmail(values.email) &&
    /* trim() rather than a bare !== '' so this agrees with firstIncomplete,
       which has always trimmed. The three come from <select>s whose values are
       fixed, so a stray space cannot be typed — but the pricing cards write
       these fields programmatically, and the two functions disagreeing would
       mean a button that reads ready pointing at a field it thinks is empty. */
    values.projectType.trim() !== '' &&
    values.budget.trim() !== '' &&
    values.timeline.trim() !== ''
  )
}

/** The order fields are checked in, so an incomplete submit sends the visitor
 *  to the first thing missing rather than to the last. The brief is absent
 *  because an optional field can never be the thing that is missing. */
const FIELD_ORDER: readonly (keyof ContactValues)[] = [
  'name',
  'email',
  'projectType',
  'budget',
  'timeline',
]

function firstIncomplete(values: ContactValues): keyof ContactValues | null {
  for (const key of FIELD_ORDER) {
    if (key === 'email' ? !looksLikeEmail(values.email) : values[key].trim() === '') return key
    if (key === 'name' && values.name.trim().length <= 1) return key
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
export const BUDGETS = [
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
      key === 'brief' ? false
      : key === 'email' ? !looksLikeEmail(values.email)
      : key === 'name' ? values.name.trim().length <= 1
      : values[key] === ''
    )

  return (
    <div className="contact-form">
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          name="name"
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
          name="email"
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
          name="projectType"
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
          name="budget"
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
          name="timeline"
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
        {/* The only optional field, so it is the only one carrying a tag.
            Marking the five required ones instead would put a badge on almost
            every label and leave the eye nothing to catch — the exception is
            what is worth saying out loud. It sits inside the <label> so it is
            announced with the field name rather than stranded beside it. */}
        <label htmlFor="brief">
          The project <span className="field-optional">Optional</span>
        </label>
        {/* The hint does the work a placeholder cannot: placeholders vanish the
            moment someone starts typing, which is exactly when they would be
            useful. */}
        <p className="field-hint" id="brief-hint">
          What are you building, who is it for, and what does success look like?
          Anything already decided — a name, a deadline, work you like — helps,
          but send it blank and I will ask.
        </p>
        <textarea
          id="brief"
          name="brief"
          rows={5}
          aria-describedby="brief-hint"
          placeholder="A sentence or two is plenty to start."
          value={values.brief}
          aria-invalid={invalid('brief') || undefined}
          ref={(el) => { refs.current.brief = el }}
          onChange={(e) => set('brief')(e.target.value)}
        />
      </div>

      {/* Formspree discards a submission whose _gotcha field has anything in
          it. It is hidden from sight and from assistive tech, and carries
          tabindex -1 so a keyboard never lands in it — the only thing that
          fills it is something reading the markup rather than the page. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
    </div>
  )
}
