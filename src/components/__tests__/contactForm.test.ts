import { describe, expect, it } from 'vitest'
import { EMPTY_CONTACT, isContactComplete, looksLikeEmail, type ContactValues } from '../ContactForm'

const filled: ContactValues = {
  name: 'Ada Okoye',
  email: 'ada@studio.co',
  projectType: 'Brand identity or guideline system',
  budget: 'Not sure yet',
  timeline: 'Within a month',
  brief: 'A full identity for a new construction firm launching in Q1.',
}

/**
 * This decides whether the submit reads as ready. Getting it wrong in either
 * direction costs an enquiry: too strict and someone who filled the form is
 * told they have not, too loose and the button promises readiness it cannot
 * keep.
 */
describe('contact completeness', () => {
  it('is not complete when empty', () => {
    expect(isContactComplete(EMPTY_CONTACT)).toBe(false)
  })

  it('is complete when every field is answered', () => {
    expect(isContactComplete(filled)).toBe(true)
  })

  it('needs every required field', () => {
    const required = (Object.keys(filled) as (keyof ContactValues)[]).filter((k) => k !== 'brief')
    for (const key of required) {
      expect(isContactComplete({ ...filled, [key]: '' })).toBe(false)
    }
  })

  it('does not accept whitespace as an answer', () => {
    expect(isContactComplete({ ...filled, name: '   ' })).toBe(false)
    expect(isContactComplete({ ...filled, projectType: '   ' })).toBe(false)
  })

  it('treats "not sure yet" as a real answer', () => {
    // It is an option on the budget list on purpose. Plenty of good enquiries
    // genuinely do not know the figure, and forcing one invents a number
    // nobody believes.
    expect(isContactComplete({ ...filled, budget: 'Not sure yet' })).toBe(true)
  })

  it('treats the brief as optional', () => {
    // It used to demand twenty characters, which meant someone could answer
    // every question on the form and still face a grey button with nothing
    // saying the long field at the bottom was the hold-up.
    expect(isContactComplete({ ...filled, brief: '' })).toBe(true)
    expect(isContactComplete({ ...filled, brief: '   ' })).toBe(true)
    expect(isContactComplete({ ...filled, brief: 'hi' })).toBe(true)
  })

  it('still will not go ready on the brief alone', () => {
    // The inverse of the above, and the one that would actually cost an
    // enquiry: a filled brief must not stand in for the address to reply to.
    expect(isContactComplete({ ...EMPTY_CONTACT, brief: 'A'.repeat(400) })).toBe(false)
  })

  it('rejects a single-character name but accepts a short real one', () => {
    expect(isContactComplete({ ...filled, name: 'A' })).toBe(false)
    expect(isContactComplete({ ...filled, name: 'Li' })).toBe(true)
  })
})

describe('email check', () => {
  it('accepts ordinary addresses', () => {
    for (const email of [
      'ada@studio.co',
      'first.last@agency.design',
      'name+tag@gmail.com',
      'a@b.io',
    ]) {
      expect(looksLikeEmail(email)).toBe(true)
    }
  })

  it('rejects what is clearly not an address', () => {
    for (const email of ['', 'ada', 'ada@', '@studio.co', 'ada@studio', 'a b@c.com', 'ada@@b.co']) {
      expect(looksLikeEmail(email)).toBe(false)
    }
  })

  it('ignores surrounding whitespace rather than failing on it', () => {
    // Pasted addresses very often arrive with a trailing space.
    expect(looksLikeEmail('  ada@studio.co  ')).toBe(true)
  })

  it('stays permissive about new and unusual domains', () => {
    // A false rejection here costs an enquiry; a false accept costs one
    // bounced reply. Only the delivery attempt really validates an address.
    expect(looksLikeEmail('hello@studio.design')).toBe(true)
    expect(looksLikeEmail("o'brien@agency.ie")).toBe(true)
  })
})
