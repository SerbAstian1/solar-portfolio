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

  it('needs every single field', () => {
    for (const key of Object.keys(filled) as (keyof ContactValues)[]) {
      expect(isContactComplete({ ...filled, [key]: '' })).toBe(false)
    }
  })

  it('does not accept whitespace as an answer', () => {
    expect(isContactComplete({ ...filled, name: '   ' })).toBe(false)
    expect(isContactComplete({ ...filled, brief: '                          ' })).toBe(false)
  })

  it('treats "not sure yet" as a real answer', () => {
    // It is an option on the budget list on purpose. Plenty of good enquiries
    // genuinely do not know the figure, and forcing one invents a number
    // nobody believes.
    expect(isContactComplete({ ...filled, budget: 'Not sure yet' })).toBe(true)
  })

  it('wants a brief with something in it', () => {
    expect(isContactComplete({ ...filled, brief: 'hi' })).toBe(false)
    expect(isContactComplete({ ...filled, brief: 'A'.repeat(20) })).toBe(true)
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
