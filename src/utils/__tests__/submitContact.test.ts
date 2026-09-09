import { describe, expect, it, vi } from 'vitest'
import type { ContactValues } from '../../components/ContactForm'
import { ENDPOINT, buildPayload, submitContact } from '../submitContact'

const values: ContactValues = {
  name: '  Ada Okoye  ',
  email: ' ada@studio.co ',
  projectType: 'Brand identity or guideline system',
  budget: '₦850k – ₦1.6M',
  timeline: 'Within a month',
  brief: '  A full identity for a construction firm launching in Q1.  ',
}

const ok = () => new Response('{}', { status: 200 })
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('payload', () => {
  it('sends the keys Formspree gives meaning to', () => {
    // `email` becomes the reply-to and `message` becomes the body. Renaming
    // either turns a one-click reply into a copy and paste.
    const p = buildPayload(values)
    expect(p.email).toBe('ada@studio.co')
    expect(p.message).toBe('A full identity for a construction firm launching in Q1.')
  })

  it('trims what the visitor typed', () => {
    // Leading space on an address is the difference between a reply arriving
    // and bouncing.
    expect(buildPayload(values).name).toBe('Ada Okoye')
    expect(buildPayload(values).email).not.toMatch(/^\s|\s$/)
  })

  it('titles the fields that become labels in the email', () => {
    const p = buildPayload(values)
    expect(p['Project type']).toBe('Brand identity or guideline system')
    expect(p.Budget).toBe('₦850k – ₦1.6M')
    expect(p.Timeline).toBe('Within a month')
    expect(p).not.toHaveProperty('projectType')
  })

  it('forwards the honeypot so Formspree can act on it', () => {
    // The field existed in the markup for a while without ever being sent,
    // which made it decoration. Empty for a person, filled by a bot.
    expect(buildPayload(values)._gotcha).toBe('')
    expect(buildPayload(values, 'bot-filled-this')._gotcha).toBe('bot-filled-this')
  })

  it('makes the subject identifiable without opening it', () => {
    expect(buildPayload(values)._subject).toContain('Ada Okoye')
    expect(buildPayload(values)._subject).toContain('Brand identity')
  })
})

describe('submitting', () => {
  it('posts JSON and asks for JSON back', async () => {
    // Without the Accept header Formspree answers with a redirect to its own
    // thank-you page and the site loses control of what the visitor sees.
    const fetchMock = vi.fn().mockResolvedValue(ok())
    await submitContact(values, '', fetchMock as unknown as typeof fetch)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.headers.Accept).toBe('application/json')
    expect(JSON.parse(init.body).email).toBe('ada@studio.co')
  })

  it('reports success only on a successful response', async () => {
    const result = await submitContact(values, '', vi.fn().mockResolvedValue(ok()) as never)
    expect(result.ok).toBe(true)
  })

  it('never claims success on a rejected submission', async () => {
    // The failure that matters most: a thank-you shown for a message that
    // went nowhere is worse than an error, because nobody follows up.
    const body = { errors: [{ message: 'Form is disabled' }] }
    const result = await submitContact(values, '', vi.fn().mockResolvedValue(json(403, body)) as never)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('disabled')
  })

  it('still fails cleanly when the error body is not JSON', async () => {
    const html = new Response('<html>gateway</html>', { status: 502 })
    const result = await submitContact(values, '', vi.fn().mockResolvedValue(html) as never)
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it('treats a network failure as offline rather than as a broken form', async () => {
    const result = await submitContact(
      values,
      '',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as never,
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/offline/i)
  })

  it('never throws, whatever the network does', async () => {
    // The caller keeps the visitor's typing on any failure; an exception
    // escaping here would leave the form stuck mid-send instead.
    for (const impl of [
      vi.fn().mockRejectedValue(new Error('boom')),
      vi.fn().mockRejectedValue('a string'),
      vi.fn().mockResolvedValue(json(500, {})),
    ]) {
      await expect(submitContact(values, '', impl as never)).resolves.toMatchObject({ ok: false })
    }
  })
})
