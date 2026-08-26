export interface Tip {
  /** The tip itself. Kept short — it has to fit one line of a 40px rail. */
  readonly text: string
  /**
   * Attributed only where the line is a real quotation and the attribution is
   * solid. Most entries here are craft principles that belong to no one in
   * particular, and inventing a famous name for them would be worse than
   * leaving them unsigned — a misattributed quote is a small lie that spreads.
   * Paraphrases of a known position are therefore left unsigned too.
   */
  readonly source?: string
}

/**
 * A hundred branding and design tips, shown one at a time in the bottom rail.
 *
 * Ordered loosely by discipline — strategy, mark, type, colour, layout,
 * interface, craft — so that a visitor who watches several in a row gets a
 * walk through the subject rather than a shuffle. The rail picks a random
 * starting point per visit and then walks forward, so no two sessions open on
 * the same tip and none repeats until all hundred have shown.
 */
export const TIPS: readonly Tip[] = [
  // ---- Brand strategy ----
  { text: 'A brand is a person’s gut feeling about a product or company.', source: 'Marty Neumeier' },
  { text: 'Your brand is what people say about you when you’re not in the room.', source: 'Jeff Bezos' },
  { text: 'Design is the silent ambassador of your brand.', source: 'Paul Rand' },
  { text: 'If you try to appeal to everyone, you resonate with no one.' },
  { text: 'Positioning is subtraction. Decide who you are not for.' },
  { text: 'A brand you can’t describe in one sentence isn’t positioned yet.' },
  { text: 'Consistency compounds. Novelty resets the clock.' },
  { text: 'Distinctiveness beats differentiation. Be recognisable first.' },
  { text: 'Name the feeling you want, then design toward it.' },
  { text: 'A tagline explains. A position decides.' },
  { text: 'Trust is built at the edges: receipts, errors, and empty states.' },
  { text: 'A competitor’s weakness is a better brief than your own strengths.' },
  { text: 'If the logo is the whole identity, the identity is too thin.' },
  { text: 'People remember shapes and colours long before they remember words.' },
  { text: 'Say the boring true thing before the clever untrue one.' },
  { text: 'A brand guideline nobody reads does not exist.' },
  { text: 'Price is a positioning statement. Set it like one.' },
  { text: 'The category you choose decides the comparisons you invite.' },
  { text: 'Rebrand the behaviour before the badge.' },
  { text: 'Every touchpoint either builds the brand or spends it.' },

  // ---- The mark ----
  { text: 'A logo derives meaning from what it stands for, not the reverse.', source: 'Paul Rand' },
  { text: 'Draw it in black first. Colour is the last decision.' },
  { text: 'If the mark fails at 16 pixels, the mark fails.' },
  { text: 'Test the mark on the ugliest background it will ever meet.' },
  { text: 'A good mark can be redrawn from memory by hand.' },
  { text: 'Complexity in a logo is a tax paid at every single use.' },
  { text: 'Give the mark air. Crowding reads as cheap.' },
  { text: 'One idea per mark. Two ideas is a compromise.' },
  { text: 'Symmetry is calm, asymmetry is energy. Choose on purpose.' },
  { text: 'Negative space is a shape. Draw it deliberately.' },
  { text: 'A trend with a birth year comes with an expiry date.' },

  // ---- Typography ----
  { text: 'Typography endows human language with durable visual form.', source: 'Robert Bringhurst' },
  { text: 'Type should be invisible. The reader should see only meaning.' },
  { text: 'Two typefaces is a system. Five is a mess.' },
  { text: 'Tracking is size-dependent. Tighten display, open small caps.' },
  { text: 'Keep lines to 45–75 characters. Longer loses the eye’s return.' },
  { text: 'Leading tracks size inversely. Large type wants less of it.' },
  { text: 'Never centre a paragraph you expect someone to read.' },
  { text: 'Hierarchy is contrast, not size alone.' },
  { text: 'If everything is bold, nothing is.' },
  { text: 'Set the body text first. Headlines are the easy part.' },
  { text: 'Optical alignment beats mathematical alignment.' },
  { text: 'Hyphen, en dash and em dash are three different marks.' },
  { text: 'Use real quotation marks. Always.' },
  { text: 'A type scale is a decision, not a ratio you found online.' },
  { text: 'Uppercase loses word shape. Pay for it with tracking.' },
  { text: 'Justified text without hyphenation is a river of holes.' },
  { text: 'Tabular figures for tables, proportional for prose.' },
  { text: 'If the family has an italic, use it. Never slant the roman.' },

  // ---- Colour ----
  { text: 'Colour is the last thing decided and the first thing seen.' },
  { text: 'Check contrast as a ratio, not as a feeling.' },
  { text: '4.5:1 for body text. 3:1 for large text and UI edges.' },
  { text: 'Never carry meaning in hue alone. Some readers cannot see it.' },
  { text: 'One accent used rarely beats three used evenly.' },
  { text: 'Dark mode is a second palette, not an inversion.' },
  { text: 'Saturated on saturated vibrates. Put a neutral between them.' },
  { text: 'Name colours by the job they do, not by the hue they are.' },
  { text: 'A palette needs a neutral more than a fifth accent.' },
  { text: 'Test colour on the cheapest screen your audience owns.' },
  { text: 'Warm advances, cool recedes. Use it for depth, not decoration.' },
  { text: 'Pure black is rare in nature. Give yours a temperature.' },

  // ---- Layout and composition ----
  { text: 'White space is not empty. It is the thing doing the work.' },
  { text: 'Grid first. Then break it knowingly.' },
  { text: 'Alignment is the cheapest quality signal there is.' },
  { text: 'Group by proximity before reaching for a border.' },
  { text: 'Repetition builds rhythm. Rhythm builds trust.' },
  { text: 'Two elements are aligned or clearly not. Never nearly.' },
  { text: 'The edge of the screen is a surface, not a boundary.' },
  { text: 'Scale is relative. Give the eye something to measure against.' },
  { text: 'The rule of thirds is a starting grid, not a law.' },
  { text: 'Balance visual weight, not element count.' },
  { text: 'Margins are structural. Shrink them last.' },
  { text: 'If everything is centred, the page has no spine.' },
  { text: 'Crop harder than feels comfortable.' },
  { text: 'A page has one entry point. Decide which.' },

  // ---- Interface and product ----
  { text: 'Don’t make me think.', source: 'Steve Krug' },
  { text: 'People ignore design that ignores people.', source: 'Frank Chimero' },
  { text: 'Good design is harder to notice than poor design.', source: 'Don Norman' },
  { text: 'Design is not just what it looks like. It is how it works.', source: 'Steve Jobs' },
  { text: 'The best interface is the one that asks for the least.' },
  { text: 'Every field you add is a person you lose.' },
  { text: 'Error states are part of the product, not an edge case.' },
  { text: 'Design all four: loading, empty, error, partial.' },
  { text: 'Latency is a design material. Under 100ms feels instant.' },
  { text: 'An undo beats a confirmation dialog.' },
  { text: 'Defaults are decisions you make on someone else’s behalf.' },
  { text: 'Accessibility is architecture, not a coat of paint.' },
  { text: 'If it needs a tooltip to be understood, redesign it.' },
  { text: 'Animation should explain a change, not decorate one.' },

  // ---- Craft and process ----
  { text: 'Good design is as little design as possible.', source: 'Dieter Rams' },
  { text: 'Less, but better.', source: 'Dieter Rams' },
  { text: 'Form ever follows function.', source: 'Louis Sullivan' },
  { text: 'The details are not the details. They make the design.', source: 'Charles Eames' },
  { text: 'Above all else, show the data.', source: 'Edward Tufte' },
  { text: 'Subtract until it breaks, then put one thing back.' },
  { text: 'Show the work before it is finished. Feedback is cheaper early.' },
  { text: 'Kill your best idea if the brief does not need it.' },
  { text: 'Say the constraint out loud. It is usually the brief.' },
  { text: 'If you cannot explain the decision, it is a preference.' },
  { text: 'Ship it, then measure it. Taste is a hypothesis.' },
]

/** Longest a tip may be. The rail gives it one line and will not wrap. */
export const MAX_TIP_LENGTH = 72
