import type { ContactValues } from '../components/ContactForm'

/**
 * The Formspree endpoint.
 *
 * Public by design — every site using Formspree ships its endpoint in the
 * markup, and the service expects that. It is not a secret and does not belong
 * in an environment variable pretending to be one. What protects it is
 * Formspree's own spam filtering plus the honeypot below.
 */
export const ENDPOINT = 'https://formspree.io/f/mdawdrwo'

export type SubmitState = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Turns the form's own shape into the one that arrives in an inbox.
 *
 * The keys matter. Formspree treats `email` as the reply-to address, so
 * answering an enquiry is one click rather than a copy and paste, and it
 * surfaces `message` as the body — which is why the brief is sent under that
 * name rather than its internal one. The rest are titled because they become
 * literal labels in the email, and "projectType" reads like a database column.
 *
 * `_subject` means an enquiry is identifiable in a list of notifications
 * without opening it.
 */
export function buildPayload(values: ContactValues, gotcha = ''): Record<string, string> {
  return {
    /* The honeypot's value, forwarded rather than dropped. It is only useful
       if it actually reaches Formspree — the field existed in the markup for a
       while doing nothing, because the payload is built by hand here rather
       than scraped from the form, so nothing ever read it. */
    _gotcha: gotcha,
    name: values.name.trim(),
    email: values.email.trim(),
    'Project type': values.projectType,
    Budget: values.budget,
    Timeline: values.timeline,
    message: values.brief.trim(),
    _subject: `New enquiry — ${values.projectType} — ${values.name.trim()}`,
  }
}

export interface SubmitResult {
  ok: boolean
  /** Shown to the visitor. Written to be useful rather than accurate about
   *  internals: nobody is helped by a status code. */
  message?: string
}

/**
 * Sends the enquiry.
 *
 * `Accept: application/json` is what stops Formspree replying with a redirect
 * to its own thank-you page; with it the response is JSON and the site keeps
 * control of what the visitor sees.
 *
 * Every failure path returns rather than throwing, because the caller's only
 * sensible response to any of them is the same: keep the visitor's typing and
 * say it did not send. The distinction that does matter is offline versus
 * refused — one is worth retrying in a moment, the other is not — so the
 * message differs even though the shape does not.
 */
export async function submitContact(
  values: ContactValues,
  gotcha = '',
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(values, gotcha)),
    })

    if (response.ok) return { ok: true }

    /* Formspree explains itself in the body on a 4xx — a disabled form, a
       address that needs confirming. Worth surfacing, because those are
       things the owner has to fix and a generic failure would hide them. */
    let detail = ''
    try {
      const body = (await response.json()) as { errors?: { message?: string }[] }
      detail = body.errors?.map((e) => e.message).filter(Boolean).join(' ') ?? ''
    } catch {
      // A non-JSON error body is not worth reporting; the status said enough.
    }
    return {
      ok: false,
      message: detail || 'That did not send. Please try again, or email me directly.',
    }
  } catch {
    // fetch only rejects on a network-level failure, which almost always means
    // the connection rather than the form.
    return {
      ok: false,
      message: 'That did not send — you may be offline. Your message is still here.',
    }
  }
}
