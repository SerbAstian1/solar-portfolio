import { describe, expect, it } from 'vitest'
import { BUDGETS } from '../../components/ContactForm'
import { PLANETS } from '../planets'
import type { PricingTier } from '../types'

const TIERS: readonly PricingTier[] = PLANETS.flatMap((p) => p.panel.tiers ?? [])

/**
 * Clicking a tier drops its budget straight into the contact form's select.
 * That only works while the two lists agree, and they live in different files
 * — so this is the seam that holds them together.
 */
describe('tier to budget mapping', () => {
  it('has tiers to check', () => {
    expect(TIERS.length).toBeGreaterThan(0)
  })

  it('maps every tier to a budget the form actually offers', () => {
    // A value that is not in the list would set the select to nothing, and the
    // visitor would land on Contact with a blank budget and no idea why.
    for (const tier of TIERS) {
      expect(BUDGETS).toContain(tier.budget)
    }
  })

  it('gives each paid tier its own band', () => {
    // Two tiers sharing a band would make the choice between them meaningless
    // by the time the enquiry arrives.
    const paid = TIERS.filter((t) => t.budget !== 'Not sure yet').map((t) => t.budget)
    expect(new Set(paid).size).toBe(paid.length)
  })

  it('sends the open-ended tier to "Not sure yet" rather than a number', () => {
    // Retainer is priced "Custom". Inventing a band for it would put a figure
    // in the enquiry that nobody chose.
    const custom = TIERS.filter((t) => t.price.toLowerCase().includes('custom'))
    expect(custom.length).toBeGreaterThan(0)
    for (const tier of custom) expect(tier.budget).toBe('Not sure yet')
  })

  it('never maps a tier to the band below its own starting price', () => {
    /* "From ₦850k" belongs in the ₦850k–₦1.6M band, not the one under it.
       Parsed from the price so the check is independent of how the mapping
       was written, rather than restating it. */
    const floor = (price: string): number | null => {
      const m = /₦([\d.]+)(k|M)/i.exec(price)
      // Both groups are required by the pattern, but TypeScript types capture
      // groups as possibly undefined, so this is checked rather than asserted.
      const [, amount, unit] = m ?? []
      if (!amount || !unit) return null
      return Number(amount) * (unit.toLowerCase() === 'm' ? 1_000_000 : 1_000)
    }
    for (const tier of TIERS) {
      const from = floor(tier.price)
      if (from === null) continue
      const bandFloor = floor(tier.budget)
      expect(bandFloor).not.toBeNull()
      expect(bandFloor).toBe(from)
    }
  })
})
