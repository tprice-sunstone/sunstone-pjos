// =============================================================================
// SUNSTONE PJOS — Sunny AI Mentor Knowledge Base
// =============================================================================
// This file contains the structured knowledge that powers "Sunny," the AI mentor
// embedded in the Sunstone Permanent Jewelry Operating System (PJOS).
//
// Compiled from 45+ official Sunstone documents, training materials, and
// founder interviews. This is the single source of truth for Sunny's responses.
//
// Last updated: 2026-02-24
// =============================================================================

// =============================================================================
// SECTION 1: EQUIPMENT & SETTINGS
// =============================================================================
export const EQUIPMENT_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Welders
  // ---------------------------------------------------------------------------
  welders: {
    zapp: {
      name: 'Zapp',
      type: 'Entry-level micro TIG welder',
      interface: 'Knob controls',
      includedInKit: 'Momentum ($2,399)',
      notes: [
        'Good starter welder for artists entering the industry.',
        'Uses lowest/max power settings for many 20g and 26g jump rings rather than precise joule values.',
        'Does not include 1:1 mentoring in the Momentum kit.',
      ],
    },
    zappPlus2: {
      name: 'Zapp Plus 2',
      type: 'Mid-tier micro TIG welder',
      interface: 'Touchscreen controls',
      includedInKit: 'Dream ($3,199 — HERO kit)',
      notes: [
        'Touchscreen interface for easier adjustment.',
        'Most popular welder — included in the recommended Dream kit.',
        'Precise joule settings across all gauges and metals.',
        'Available for rental through Sunstone OnDemand program.',
      ],
    },
    mPulse: {
      name: 'Orion mPulse 2.0',
      type: 'Premium micro TIG welder',
      interface: 'Touchscreen controls with TruFire technology',
      includedInKit: 'Legacy ($4,999 — BEST kit)',
      truFire: {
        description:
          'TruFire initiates the arc while the electrode is still retracting from the piece, rather than waiting until retraction is complete. This millisecond difference creates a low-voltage pre-arc that maintains connection, making welds more consistent and harder to accidentally abort.',
        sunnyGuidance:
          'Do NOT explain TruFire mechanics unprompted. Artists who switch from another welder to the mPulse will notice more consistent welds naturally. If asked directly, you can explain it helps maintain the connection during the weld cycle for more reliable results.',
      },
      notes: [
        'Generally runs at lower joule settings than Zapp and Zapp Plus across all metals.',
        'Premium option for artists who want the best consistency.',
        'Available for rental through Sunstone OnDemand program.',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Starter Kits
  // ---------------------------------------------------------------------------
  starterKits: {
    momentum: {
      name: 'Momentum',
      price: '$2,399',
      welder: 'Zapp',
      pjUniversity: true,
      oneOnOneMentoring: false,
      argonMinis: 2,
      regulator: 1,
      pjToolKit: true,
      jumpRings: { silver: 25, goldFilled: 25 },
      bsConnectors: false,
      displayCase: false,
      chainTotal: '21ft (7 chains × 3ft each)',
      chains: ['Chloe', 'Olivia', 'Marlee', 'Lavina', 'Ella', 'Paisley', 'Maria'],
    },
    dream: {
      name: 'Dream',
      price: '$3,199',
      designation: 'HERO kit — most recommended',
      welder: 'Zapp Plus 2',
      pjUniversity: true,
      oneOnOneMentoring: true,
      argonMinis: 2,
      regulator: 1,
      pjToolKit: true,
      jumpRings: { silver: 50, goldFilled: 50 },
      bsConnectors: true,
      displayCase: true,
      chainTotal: '27ft (9 chains × 3ft each)',
      chains: ['Chloe', 'Olivia', 'Marlee', 'Lavina', 'Ella', 'Paisley', 'Maria', 'Alessia', 'Benedetta'],
    },
    legacy: {
      name: 'Legacy',
      price: '$4,999',
      designation: 'BEST kit — premium option',
      welder: 'Orion mPulse 2.0',
      pjUniversity: true,
      oneOnOneMentoring: true,
      argonMinis: 4,
      regulator: 1,
      pjToolKit: true,
      jumpRings: { silver: 100, goldFilled: 100 },
      bsConnectors: true,
      displayCase: true,
      chainTotal: '45ft (15 chains × 3ft each)',
      chains: [
        'Chloe', 'Olivia', 'Marlee', 'Lavina', 'Ella', 'Paisley', 'Maria',
        'Alessia', 'Benedetta', 'Charlie', 'Lucy', 'Grace', 'Bryce', 'Hannah', 'Ruby',
      ],
    },
    salesCallTipOrder: [
      'Welder (what it does, why it matters)',
      'Mentoring (Dream/Legacy include 1:1 access)',
      'Argon minis (how many included)',
      'Chain footage (variety to get started)',
      'BS connectors + display case (Dream/Legacy)',
      'Jump rings (quantity included)',
    ],
  },

  // ---------------------------------------------------------------------------
  // Argon Setup
  // ---------------------------------------------------------------------------
  argon: {
    gasType: 'Pure argon only — NEVER use 75/25 MIG mix',
    flowRate: {
      lpm: '3–5 LPM (liters per minute) for flow regulators',
      psi: '5–7 PSI for pressure regulators',
      principle:
        'You want a soft breath of argon to envelope the weld area and gently push oxygen out of the way. Too strong creates a vortex that sucks oxygen back in, defeating the purpose.',
    },
    regulatorNote:
      'Sunstone has shipped several different regulator versions over time. Settings vary slightly — the principle (soft breath) is what matters.',
    sourcing: ['Sunstone Supply', 'Local welding supply stores'],
    commonSetupAnxiety: {
      issue: 'New artists are often scared of compressed gas — they have seen tanks explode in movies.',
      sunnyApproach: [
        'Explain what "inert gas" means — argon is non-flammable, non-reactive, and completely safe to have in any environment.',
        'It is literally just a heavier-than-air gas that sits around the weld and keeps oxygen away.',
        'Walk them through: attach regulator to tank, connect hose, set flow rate.',
        'Explain quick-connect coupler: push in the outer plastic ring and hold while pulling the hose out.',
        'Reassure them — this is the same gas used in medical and food industries.',
      ],
    },
    argonAndWeldQuality:
      'Without argon: sharpen electrode every 5–8 welds. With argon: sharpen every 20–30 welds. Argon dramatically extends electrode life and improves weld appearance.',
  },

  // ---------------------------------------------------------------------------
  // Electrode Maintenance
  // ---------------------------------------------------------------------------
  electrode: {
    type: 'Tungsten electrode',
    lifespan: '~5,000 welds per electrode',
    sharpening: {
      tool: 'Sunstone Pilot sharpener (included in PJ tool kit)',
      withoutArgon: 'Sharpen every 5–8 welds',
      withArgon: 'Sharpen every 20–30 welds',
      protrusion: '3–4mm using the engraved notch on the stylus as a guide',
      eventTip: 'Sharpen both sides of the electrode before events so you can flip it mid-event without stopping to sharpen.',
    },
    maintenanceNote:
      'Electrode sharpening is the primary maintenance task. The welder itself just uses electricity — plug it in and go. No other regular maintenance required.',
  },

  // ---------------------------------------------------------------------------
  // Weld Settings Chart (Joules by gauge, metal, and welder)
  // ---------------------------------------------------------------------------
  weldSettings: {
    note: 'These are starting-point recommendations. Always start low and increase. "Multiple Welds" means pulse 2–3 times from different angles to ensure penetration — used when already at or near max power for that combination.',
    chartUrl: 'Also available on the Sunstone website for reference.',
    gauge20: {
      goldFilled14_20Yellow: { zapp: 'MAX POWER (multiple welds)', zappPlus: '12 (multiple welds)', mPulse: 8 },
      goldFilled14_20Rose:   { zapp: 'MAX POWER (multiple welds)', zappPlus: '15 (multiple welds)', mPulse: 9 },
      gold14kYellow:         { zapp: '8 (multiple welds)',         zappPlus: '8 (multiple welds)',  mPulse: 7 },
      gold14kRose:           { zapp: '8 (multiple welds)',         zappPlus: '12 (multiple welds)', mPulse: 7.5 },
      gold14kWhite:          { zapp: 'MAX POWER (multiple welds)', zappPlus: '10 (multiple welds)', mPulse: 6.5 },
      silver:                { zapp: 'MAX POWER (multiple welds)', zappPlus: '11 (multiple welds)', mPulse: 7 },
    },
    gauge22: {
      silver:                { zapp: '7 (multiple welds)', zappPlus: 7,              mPulse: 6.5 },
      goldFilled14_20Yellow: { zapp: '8–MAX (multiple welds)', zappPlus: '8–10 (multiple welds)', mPulse: 7 },
      goldFilled14_20Rose:   { zapp: '8–MAX (multiple welds)', zappPlus: '9–10 (multiple welds)', mPulse: 8 },
      gold14kYellow:         { zapp: 7,                    zappPlus: 7,              mPulse: 5 },
      gold14kRose:           { zapp: 7,                    zappPlus: 7,              mPulse: 6 },
      gold14kWhite:          { zapp: 7,                    zappPlus: 6,              mPulse: 5.5 },
    },
    gauge24: {
      goldFilled14_20Yellow: { zapp: 5, zappPlus: 5, mPulse: 4.5 },
      goldFilled14_20Rose:   { zapp: 5, zappPlus: 7, mPulse: 5.5 },
      silver:                { zapp: 5, zappPlus: 5, mPulse: 5 },
      gold14kRose:           { zapp: '8 (multiple welds)', zappPlus: 7, mPulse: 6 },
      gold14kWhite:          { zapp: 4, zappPlus: 4, mPulse: 4 },
      gold14kYellow:         { zapp: 5, zappPlus: 5, mPulse: 4 },
    },
    gauge26: {
      goldFilled14_20Yellow: { zapp: 'LOWEST POWER', zappPlus: 4,  mPulse: 3 },
      goldFilled14_20Rose:   { zapp: 'LOWEST POWER', zappPlus: 4,  mPulse: 3.5 },
      silver:                { zapp: 'LOWEST POWER', zappPlus: 3,  mPulse: 2.5 },
      gold14kWhite:          { zapp: 'LOWEST POWER', zappPlus: 3,  mPulse: 3 },
      gold14kYellow:         { zapp: 'LOWEST POWER', zappPlus: 2,  mPulse: 2 },
      gold14kRose:           { zapp: 'LOWEST POWER', zappPlus: 4,  mPulse: 2.5 },
    },
    quickRuleOfThumb: {
      note: 'For quick guidance when exact chart lookup is not needed:',
      gauge26: '~3 joules',
      gauge24: '~5 joules',
      gauge22: '~7 joules',
      always: 'Start low and increase. It is always better to underweld and add power than to overweld.',
    },
  },

  // ---------------------------------------------------------------------------
  // Optics / Magnification
  // ---------------------------------------------------------------------------
  optics: {
    pjScope: {
      name: 'PJ Scope',
      type: 'Magnifying scope attachment',
      note: 'Attaches to the stylus for magnified view of the weld area.',
    },
    adl: {
      name: 'ADL (Advanced Digital Lens)',
      type: 'Digital camera attachment',
      note: 'Provides a digital magnified view on a screen. Some artists prefer this for better visibility and to show customers the weld process.',
    },
    guidance:
      'Both are optional. Many experienced artists weld without magnification. Beginners may find optics helpful while learning. ADL is great for customer engagement — they can watch on screen.',
  },

  // ---------------------------------------------------------------------------
  // Sunstone OnDemand Rental Program
  // ---------------------------------------------------------------------------
  rentalProgram: {
    tagline: 'Try It. Love It. Own It.',
    purpose: 'Rent welders for events or try-before-buy. Rental fees apply toward Circle Program purchase within 30 days.',
    options: ['3-day minimum rental', 'Zapp Plus 2 or Orion mPulse available'],
    charges: {
      rentalFee: 'Per order confirmation',
      shipping: '$80 flat-rate round trip',
      damageWaiver: '$79 (optional, can opt out)',
      securityDeposit: '$300 refundable (returned 3–5 days after inspection)',
    },
    included: ['Selected welder', 'PJ kit', 'Prepaid return label', 'Phone/email support'],
    optional: ['Consumables kit', 'Sunstone Certified welder for events'],
    useCase:
      'Perfect for artists who want to bring multiple welders to a large event to multiply their output and justify higher booth fees. Also great for try-before-you-buy.',
  },
};

// =============================================================================
// SECTION 2: WELDING TECHNIQUE
// =============================================================================
export const WELDING_TECHNIQUE_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Fundamental Welding Process
  // ---------------------------------------------------------------------------
  fundamentalProcess: {
    steps: [
      'Power on the welder and select welding mode.',
      'Open argon flow (3–5 LPM or 5–7 PSI).',
      'Attach grounding clip directly to the jump ring (NOT the chain).',
      'Position the jump ring on the chain — ensure the gap is fully closed with ends touching.',
      'Place leather patch between the weld area and the customer\'s skin (for customer comfort).',
      'Touch the electrode to the jump ring seam at a 90° angle.',
      'HOLD STEADY — do not move after touching. The weld will fire.',
      'After the weld completes, retract the electrode smoothly.',
      'Clean the weld area with the fiberglass brush.',
      'Check the weld visually — it should be smooth and fully closed.',
      'Cut excess chain only AFTER confirming sizing and completing the weld.',
    ],
    criticalReminder:
      'The sequence is: size → weld → cut. Never cut before welding. This protects against sizing errors.',
  },

  // ---------------------------------------------------------------------------
  // Jump Ring Handling
  // ---------------------------------------------------------------------------
  jumpRingHandling: {
    opening: 'TWIST open — never pull apart. Pulling deforms the ring and makes it impossible to close properly.',
    closing:
      'Twist past alignment, then squeeze back so the ends meet with tension at the seam. You should feel slight spring tension when the ends touch — this is what holds them together for a clean weld.',
    criticalImportance:
      'The #1 troubleshooting issue for new artists is the jump ring not being properly closed before welding. If the ends do not touch with tension, the weld will fail or be weak. When artists call with bad results, this is almost always the root cause.',
    sizeGuidance: {
      diameter: '2–4mm jump ring diameter is typical for PJ',
      gauge: '20–26 gauge depending on chain and application',
      id: '3mm inner diameter is the most common',
    },
  },

  // ---------------------------------------------------------------------------
  // Grounding Best Practices
  // ---------------------------------------------------------------------------
  grounding: {
    rule: 'ALWAYS ground directly on the piece being welded (the jump ring).',
    whyNotChain:
      'Chain is made of individual links that touch but are not fused. If you ground on the chain, the electrical current must jump from link to link. This causes inconsistent welds and can even fuse chain links together where you don\'t want them fused.',
    universal: true,
    noExceptions: 'There are no situations where grounding on the chain is preferred.',
  },

  // ---------------------------------------------------------------------------
  // Weld Angle
  // ---------------------------------------------------------------------------
  weldAngle: {
    rule: 'Always weld at a 90° angle to the surface of the jump ring.',
    applies: 'All metals, all gauges, all welders.',
    silverNote:
      'Silver can be slightly more sensitive to angle — poor angles may cause minor splashing. However, at PJ power levels this is rarely an issue. Maintaining 90° angle prevents it entirely.',
  },

  // ---------------------------------------------------------------------------
  // Multiple Welds Technique
  // ---------------------------------------------------------------------------
  multipleWelds: {
    when: 'Used when the chart says "Multiple Welds" — typically when already at or near max power for that gauge/metal/welder combination.',
    technique:
      'Pulse 2–3 times, hitting the joint from slightly different angles each time to ensure full penetration around the seam.',
    judgment: 'Keep going until it looks good. Visual inspection is the final check.',
  },

  // ---------------------------------------------------------------------------
  // Common Weld Triggering Mistakes (Top Beginner Issue)
  // ---------------------------------------------------------------------------
  weldTriggeringMistakes: {
    moveBeforeWeld: {
      problem: 'Artist triggers the weld then moves away before the weld actually fires.',
      symptom: 'They think the welder is broken or not working.',
      fix: 'Touch the electrode to the piece, hold completely still, let the weld fire, THEN retract. There is a brief delay between touch and weld.',
    },
    pushTooDeep: {
      problem: 'Artist continues pushing into the electrode after touching the piece.',
      symptom: 'When the weld fires, the electrode gets stuck in the piece.',
      fix: 'Touch lightly and hold position — do not push deeper. The electrode only needs to make contact, not embed.',
    },
    mPulseAdvantage:
      'The mPulse\'s TruFire technology helps mitigate both issues by initiating the arc during retraction, making welds harder to accidentally abort.',
  },

  // ---------------------------------------------------------------------------
  // Metal-Specific Welding Notes
  // ---------------------------------------------------------------------------
  metalWeldingNotes: {
    solidGold: {
      note: 'Best welding results. Premium material, hypoallergenic. Use solid gold jump rings for the cleanest weld appearance on any chain. Even when using non-gold chains, solid gold jump rings give the best weld results.',
      types: ['14K Yellow Gold', '14K Rose Gold', '14K White Gold'],
    },
    goldFilled: {
      note: 'Gold-filled has a 5% layer of 14K gold over a brass core. When welded, the entire material melts together, exposing the brass/gold mix at the weld point. This creates a slightly different color spot at the weld — it will not match the surrounding gold color perfectly.',
      cleanUp: 'Use the fiberglass brush to clean blackened soot from the weld area. The color difference remains but is very small and usually requires close inspection to notice.',
      industryContext:
        'GF is very widely used in the PJ industry because it is much more affordable than solid gold. Sunstone now sells GF jump rings. Solid 14K jump rings still produce the best cosmetic result, but GF jump rings are completely acceptable and commonly used.',
      designation: '14/20 means 14K gold, 1/20th of total weight is the gold layer.',
    },
    sterling_silver: {
      note: 'Affordable entry point. Behaves similarly to other metals at PJ power levels. Can be slightly more sensitive to weld angle — maintain 90° to prevent minor splashing. Tarnishes over time with normal wear.',
      splashing: 'Possible with poor angle but rarely an issue at PJ power levels. Always maintain 90° angle.',
    },
    stainless_steel: {
      note: 'Very durable. Good for practice. ALWAYS use silver jump rings on stainless steel chains.',
      safetyBreakpoint:
        'Stainless steel is much stronger than the jewelry metals typically used for PJ. If a stainless piece gets caught on something, the chain could injure the wearer before it breaks. A silver jump ring creates a deliberate weak point that will break first, protecting the wearer.',
    },
    enamel: {
      note: 'Chips easily during welding. Display enamel chains to attract customers but set expectations. Not ideal for permanent wear if welded directly.',
    },
    goldPlated: {
      note: 'AVOID for permanent jewelry. The plating is too thin and will wear off quickly. Not suitable for PJ.',
    },
  },

  // ---------------------------------------------------------------------------
  // Piece-Specific Technique Notes
  // ---------------------------------------------------------------------------
  pieceSpecificNotes: {
    bracelets: {
      sizing: 'Default 7 inches. Use the one-finger rule as a guide — one finger should fit between the chain and the wrist. Check with customer before cutting.',
      jointPlacement: 'Place the jump ring/joint on the underside of the wrist for aesthetics and photos.',
    },
    anklets: {
      sizing: 'Default 9 inches. Fit tighter than bracelets — account for Achilles tendon stretch. The ankle changes shape when flexed.',
      note: 'May stretch slightly over time with normal wear.',
    },
    necklaces: {
      sizing: 'Default 15 inches. Often sold by the inch for longer lengths.',
      technique: 'Reference PJ Mastery Series module: "Crafting Necklaces".',
    },
    rings: {
      sizing: 'Default 2.5 inches. Weld the ring OFF the finger, then slide on.',
      technique: 'Reference PJ Mastery Series module: "Rings & Hand Chains".',
    },
    handChains: {
      sizing: 'Default 14 inches.',
      jumpRings: 'Hand chains use 2 jump rings. All other piece types use 1.',
      technique: 'Reference PJ Mastery Series module: "Rings & Hand Chains".',
    },
  },
};

// =============================================================================
// SECTION 3: TROUBLESHOOTING
// =============================================================================
export const TROUBLESHOOTING_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Top Issues (Ranked by Frequency)
  // ---------------------------------------------------------------------------
  topIssues: [
    {
      rank: 1,
      issue: 'Jump ring not closed properly before welding',
      symptoms: ['Weak welds', 'Welds that break immediately', 'Inconsistent results', 'Visible gap after welding'],
      diagnosis:
        'This is the #1 cause of poor welds. When artists call with bad results, this is almost always what is happening even if they don\'t realize it.',
      fix: [
        'Twist the jump ring open (never pull).',
        'Twist past alignment, then squeeze back so ends meet with spring tension.',
        'The ends must be touching with slight inward pressure before welding.',
        'If the jump ring is mangled or won\'t form a circle, grab a fresh one.',
      ],
    },
    {
      rank: 2,
      issue: 'Argon tank setup confusion / anxiety',
      symptoms: ['Afraid to set up the tank', 'Not using argon at all', 'Incorrect flow rate'],
      diagnosis: 'New artists are often scared of compressed gas from movies. They need education and reassurance.',
      fix: [
        'Explain that argon is an INERT gas — non-flammable, non-reactive, completely safe anywhere.',
        'Walk through setup: attach regulator to tank, connect hose to welder.',
        'Set flow to 3–5 LPM (flow) or 5–7 PSI (pressure).',
        'Explain the quick-connect coupler: push outer plastic ring in while pulling hose out.',
        'Reassure them — argon is used in medical and food industries.',
      ],
    },
    {
      rank: 3,
      issue: 'Weld triggering technique — moving too early or pushing too deep',
      symptoms: [
        'Artist thinks welder is broken (moved before weld fired)',
        'Electrode gets stuck in the piece (pushed too deep)',
        'Inconsistent results',
      ],
      diagnosis: 'Two opposite mistakes with the same root cause: not holding steady after touching.',
      fix: [
        'Touch the electrode to the piece LIGHTLY.',
        'Hold completely still — do not move away or push deeper.',
        'Wait for the weld to fire (brief delay).',
        'After the weld completes, retract smoothly.',
        'The mPulse\'s TruFire technology helps with this by initiating the arc during retraction.',
      ],
    },
    {
      rank: 4,
      issue: 'Tiered pricing confusion',
      symptoms: ['Don\'t know what to charge', 'Racing to the bottom on price', 'All chains same price'],
      diagnosis: 'Artists need help understanding cost-based pricing AND creating marketable tiers.',
      fix: 'See BUSINESS_STRATEGY_KNOWLEDGE.pricing for detailed guidance.',
    },
  ],

  // ---------------------------------------------------------------------------
  // Electrode Troubleshooting
  // ---------------------------------------------------------------------------
  electrode: {
    sticking: {
      problem: 'Electrode sticks to the piece during welding.',
      causes: ['Unsteady hand after touch — maintain position', 'Angle not at 90°', 'Electrode needs sharpening'],
      fix: 'Hold steady after touching, maintain 90° angle, sharpen the electrode.',
    },
    weldAborts: {
      problem: 'Weld triggers but aborts / does not complete.',
      causes: ['Inconsistent distance during weld cycle', 'Moved during the weld', 'Poor grounding connection'],
      fix: 'Maintain consistent position throughout the weld cycle. Check grounding clip is directly on the jump ring.',
    },
  },

  // ---------------------------------------------------------------------------
  // Power Setting Troubleshooting
  // ---------------------------------------------------------------------------
  powerSettings: {
    tooLow: {
      symptoms: ['Weld doesn\'t hold', 'Jump ring comes apart easily', 'No visible weld mark'],
      fix: 'Increase power by 0.5–1 joule and try again. Always start low and increase.',
    },
    tooHigh: {
      symptoms: ['Burn-through on the jump ring', 'Excessive discoloration', 'Melted or deformed jump ring'],
      fix: 'Decrease power. Start low and increase gradually. Refer to the weld settings chart for starting points.',
    },
    goldFilledDarkSpot: {
      symptom: 'Dark or discolored spot at the weld point on gold-filled pieces.',
      explanation:
        'This is normal and expected. GF has a brass core under the gold layer. Welding melts them together, exposing the mixed metals. Clean soot with the fiberglass brush — the color difference will remain but is very small.',
      isDefect: false,
    },
  },

  // ---------------------------------------------------------------------------
  // Grounding Issues
  // ---------------------------------------------------------------------------
  grounding: {
    symptoms: ['Inconsistent welds', 'Chain links fusing together', 'Weld works sometimes but not others'],
    diagnosis: 'Almost always caused by grounding on the chain instead of directly on the jump ring.',
    fix: 'Move the grounding clip directly onto the jump ring being welded. Current must not have to jump link-to-link.',
  },

  // ---------------------------------------------------------------------------
  // Escalation
  // ---------------------------------------------------------------------------
  escalation: {
    whenToEscalate: [
      'Equipment malfunction (welder not powering on, touchscreen issues, etc.)',
      'Account or software issues',
      'Questions Sunny cannot answer after 2–3 attempts',
      'Frustrated customer who needs human support',
      'Return policy or refund questions',
    ],
    contactInfo: {
      phone: '385-999-5240',
      method: 'Call or text',
      note: 'Sunstone support team can also help Sunny answer questions not covered in the knowledge base.',
    },
  },
};

// =============================================================================
// SECTION 4: PRODUCTS, CHAINS & INVENTORY
// =============================================================================
export const PRODUCTS_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Metal Types (Customer-Facing Knowledge)
  // ---------------------------------------------------------------------------
  metalTypes: {
    solidGold: {
      tiers: ['14K Yellow Gold', '14K Rose Gold', '14K White Gold'],
      customerPitch: 'Premium, hypoallergenic, will never turn your skin green. The gold standard (literally) for permanent jewelry that lasts a lifetime.',
      pricePosition: 'Luxe tier',
      bestFor: 'Customers who want the best quality and are willing to invest. Great for house parties where attendees have budgeted.',
    },
    goldFilled: {
      designation: '14/20 — means 14K gold with 1/20th of total weight as the gold layer',
      customerPitch: 'Beautiful gold finish at a more accessible price point. Durable and long-lasting.',
      pricePosition: 'Mid tier / standard tier',
      bestFor: 'Most customers. Great balance of quality and price. Industry workhorse.',
      colors: ['Yellow', 'Rose'],
    },
    sterlingSilver: {
      customerPitch: 'Classic silver look. Beautiful and affordable.',
      pricePosition: 'Entry tier',
      bestFor: 'Budget-conscious customers, silver-preference customers, younger demographic.',
      careNote: 'May tarnish over time. Clean with polishing cloth or mild jewelry cleaner.',
    },
    stainlessSteel: {
      customerPitch: 'Extremely durable and affordable.',
      pricePosition: 'Entry tier',
      bestFor: 'Practice pieces, budget customers, athletic/active customers who need extra durability.',
      safetyNote: 'ALWAYS use silver jump rings on stainless chains for safety breakpoint.',
    },
    avoid: {
      goldPlated: 'Too thin — plating wears off quickly. Not suitable for permanent jewelry.',
      enamel: 'Chips easily. Okay for display to attract customers but set expectations about durability.',
    },
  },

  // ---------------------------------------------------------------------------
  // Piece Types
  // ---------------------------------------------------------------------------
  pieceTypes: {
    bracelet:  { defaultSize: '7 inches',  jumpRings: 1, popularTier: 'Most popular piece type' },
    anklet:    { defaultSize: '9 inches',  jumpRings: 1, note: 'Fit tighter than bracelets. Account for Achilles stretch.' },
    necklace:  { defaultSize: '15 inches', jumpRings: 1, note: 'Often sold by the inch for longer lengths.' },
    ring:      { defaultSize: '2.5 inches', jumpRings: 1, note: 'Weld OFF the finger, then slide on.' },
    handChain: { defaultSize: '14 inches', jumpRings: 2, note: 'Uses 2 jump rings — the only piece type that does.' },
  },

  // ---------------------------------------------------------------------------
  // Connectors vs. Charms
  // ---------------------------------------------------------------------------
  connectorsVsCharms: {
    connector: {
      definition: 'An inline piece that the chain passes through. Sits flush within the chain line.',
      examples: ['Initial letters', 'Birthstones', 'Small geometric shapes', 'BS connectors (included in Dream/Legacy kits)'],
      sizing: '3–4mm is ideal',
    },
    charm: {
      definition: 'A piece that dangles from the chain.',
      examples: ['Hanging birthstones', 'Small pendants', 'Symbolic charms'],
      sizing: '3–4mm is ideal',
    },
    salesApproach:
      'Introduce connectors/charms AFTER the customer has chosen their chain, as a personalization add-on. This is not a hard sell — it\'s styling guidance.',
    avoidGoldPlated: 'Do not use gold-plated connectors or charms. They will tarnish and disappoint the customer.',
    typicalPrice: '$15–35 per connector/charm',
  },

  // ---------------------------------------------------------------------------
  // Chain Selection Guidance
  // ---------------------------------------------------------------------------
  chainGuidance: {
    widthSweetSpot: {
      range: '1.5–2.5mm chain width',
      context:
        'This is guidance for beginners buying from non-PJ-specific suppliers. Less of an issue now that PJ-specific chains are widely available and clearly marketed. Other sizes work fine.',
    },
    jumpRingMatching: {
      materialRule: 'Match the jump ring material to the chain material (exception: stainless steel chains always get silver jump rings for safety breakpoint).',
      sizeRule: 'Match the jump ring to the chain link size for visual congruency.',
    },
    chainToJumpRingGauge: {
      typical: '22–24 gauge jump rings are the most common for PJ chains.',
      note: 'The weld settings chart covers 20g, 22g, 24g, and 26g across all metals.',
    },
    customerFacing:
      'NEVER show customers chain lengths in inches. They see "a bracelet" or "a necklace" — not "7 inches of chain." Showing measurements invites price negotiations based on material cost.',
  },

  // ---------------------------------------------------------------------------
  // Sunstone Current Jump Ring Inventory
  // ---------------------------------------------------------------------------
  sunstoneJumpRingInventory: {
    lastUpdated: '2026-02-24',
    available: [
      { metal: 'Sterling Silver', gauge: '24g', innerDiameter: '3mm' },
      { metal: '14K Yellow Gold', gauge: '24g', innerDiameter: '3mm' },
      { metal: '14K White Gold', gauge: '24g', innerDiameter: '3mm' },
      { metal: '14/20 Gold Filled', gauge: '22g', innerDiameter: '3mm' },
    ],
    gaps: 'Limited selection currently. For smaller gauges, different sizes, or other metal/gauge combinations, artists may need to source from other suppliers such as Imprinted Supplies.',
    growthNote: 'Sunstone is expanding jump ring inventory — this will be updated as new SKUs are added.',
  },

  // ---------------------------------------------------------------------------
  // Inventory Planning
  // ---------------------------------------------------------------------------
  inventoryPlanning: {
    safetyStockMinimums: {
      chain: '3 feet per chain style',
      jumpRings: '50 per type',
      note: 'These are bare minimums. Event inventory should be calculated separately.',
    },
    eventInventoryFormula: {
      steps: [
        'Estimate total attendees at the event.',
        'Ask the artist how long each service takes for them (varies widely — some do 5 min, others 15 min). Do NOT assume a default.',
        'Calculate max capacity: (event hours × 60) ÷ minutes per piece = max customers.',
        'Calculate base stock needed: max customers × chain length per piece type.',
        'TRIPLE the base stock for stacking purchases and safety margin.',
      ],
      example:
        'Example: A 6-hour market where the artist does 10 min/piece = 36 max customers. If each bracelet uses ~8 inches of chain, base stock = 288 inches (24 feet) per chain type. Triple it = 72 feet. Plus matching jump rings. Always ask the artist their speed first.',
    },
    reorderTiming: 'Track usage patterns. Reorder based on lead time from your supplier and your event frequency. Don\'t wait until you run out.',
    multipleSuppliers: 'Maintain relationships with multiple suppliers for backup. Most artists use a variety of sources — this is expected and normal.',
  },

  // ---------------------------------------------------------------------------
  // Supplier Guidance
  // ---------------------------------------------------------------------------
  suppliers: {
    primary: {
      name: 'Sunstone Supply',
      position: 'ALWAYS recommend Sunstone first for chains, jump rings, and supplies.',
      qualityCertification: 'Sunstone Certified chains — known quality, verified materials. No mystery metals.',
      website: 'Sunstone Permanent Jewelry website',
    },
    others: {
      when: 'Only recommend other suppliers for products Sunstone does not carry.',
      caveat: 'Sunstone cannot guarantee the quality of materials from other suppliers.',
      trustedList: [
        'Imprinted Supplies (good for jump ring variety)',
        'Stones & Findings',
        'Permanent Jewelry Solutions',
        'LINKED PJ Training',
        'Permanent Jewelry Bestie',
        'Stuller, Inc.',
        'Rio Grande / The Bell Group',
        'Micro-Tools',
        // Full list of 45+ suppliers available in the Trusted Suppliers resource document
      ],
      fullListNote:
        'A comprehensive trusted suppliers list with 45+ verified suppliers is available as an Additional Resource in PJ University.',
    },
    evaluation_criteria: [
      'Quality of materials (known composition, not mystery metals)',
      'Availability and stock consistency',
      'Fulfillment speed',
      'Customer service responsiveness',
    ],
  },

  // ---------------------------------------------------------------------------
  // Ready-to-Wear
  // ---------------------------------------------------------------------------
  readyToWear: {
    sunnyStance:
      'Ready-to-wear is NOT part of the Sunstone PJ business model. Sunny does not suggest it. If an artist asks about it, they can certainly add it to their business, but it is outside the scope of what Sunny coaches on.',
  },
};

// =============================================================================
// SECTION 5: BUSINESS STRATEGY
// =============================================================================
export const BUSINESS_STRATEGY_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Pricing Strategy
  // ---------------------------------------------------------------------------
  pricing: {
    philosophy: {
      stance:
        'NEVER recommend discounting. Rise together. The industry is young with plenty of opportunity. Stand out and shine — do not race to the bottom. "You are worth it" messaging.',
      margin:
        'Artists should understand their cost per piece and apply appropriate markup. Typical markups range from 2.5× to 7× depending on market and materials.',
    },
    tieredPricingModel: {
      concept:
        'Create 2–3 tiers that customers can easily understand: a basic/entry tier, a standard tier, and a premium/luxe tier.',
      exampleTiers: {
        basic: {
          materials: 'Sterling silver',
          bracelet: '$55–65',
          anklet: '$65–75',
          appeal: 'Accessible entry point, impulse-buy friendly at markets',
        },
        standard: {
          materials: 'Gold-filled (14/20)',
          bracelet: '$65–80',
          anklet: '$75–90',
          appeal: 'The workhorse tier — most customers land here',
        },
        luxe: {
          materials: 'Solid 14K gold',
          bracelet: '$85–120+',
          anklet: '$95–130+',
          appeal: 'Premium tier for house parties and clients who want the best',
        },
      },
      necklaces: 'Often sold by the inch: $7–10/inch depending on material.',
      connectorsCharms: '$15–35 each',
      reWelds: 'First re-weld free (for life). Additional: ~$5–10 for a new jump ring if needed.',
    },
    costCalculationExample: {
      description: 'Example for a standard gold-filled bracelet:',
      chainCost: '$0.85/inch × 7 inches = $5.95',
      labor: '$10',
      overhead: '$5',
      toolWear: '$1',
      totalCost: '$21.95',
      markup3x: '$65.85 (3× markup)',
      note: 'Adjust markup based on your market, event type, and positioning.',
    },
    eventSpecificPricing: {
      marketsAndPopUps:
        'Have affordable options available for impulse decisions. People at farmers markets are browsing — a $60 silver bracelet is easier to say yes to than a $120 gold one.',
      houseParties:
        'People have planned and budgeted for this. Offer premium solid gold options confidently. $1,000 sales happen more often than you\'d expect at house parties.',
      highEndEvents:
        'Match your pricing to the venue. If you\'re at an upscale event, lean into the luxe tier.',
    },
    priceObjectionHandling: {
      approach: [
        'Lead with quality: "This is gold-filled / solid gold — it will never turn your skin green and will last for years."',
        'Lean on investment: "I\'ve invested in professional equipment and training to make sure this is safe and beautiful for you."',
        'Remind them of the experience: "This isn\'t just jewelry — it\'s a moment and a memory."',
        'The cost of materials matters, but the real value is the expertise, safety, and experience.',
      ],
      sunnyNote:
        'Price objections are usually about perceived value, not actual budget. Help artists understand that confidence in pricing comes from confidence in their product and process.',
    },
  },

  // ---------------------------------------------------------------------------
  // Business Formation
  // ---------------------------------------------------------------------------
  businessFormation: {
    recommended: 'LLC (Limited Liability Company)',
    benefits: ['Personal liability protection', 'Pass-through taxation (no double tax)', 'Professional credibility'],
    steps: [
      'Choose a unique business name (check availability on Namechk)',
      'File Articles of Organization with your state',
      'Pay the filing fee (varies by state)',
      'Create an Operating Agreement',
      'Obtain necessary local licenses and permits',
    ],
    resources: ['LegalZoom', 'Rocket Lawyer', 'Incfile', 'State Secretary of State website', 'SBA (Small Business Administration)'],
    sunnyNote: 'Encourage LLC formation but don\'t panic artists who haven\'t done it yet. Many operate as sole proprietors initially. The important thing is to get started.',
  },

  // ---------------------------------------------------------------------------
  // Insurance
  // ---------------------------------------------------------------------------
  insurance: {
    recommended: true,
    required: false,
    cost: '$500–1,000 per year',
    reality:
      'Many successful artists operate without insurance for years. It\'s good business practice but not a barrier to getting started.',
    eventNote: 'Some events cover you under their policy. Others REQUIRE you to have your own. Always check event requirements before committing to a booth.',
    providers: ['Beauty Queen', 'Vinsa', 'Hartford', 'Thimble', 'Next', 'Hiscox'],
  },

  // ---------------------------------------------------------------------------
  // Payment Processing
  // ---------------------------------------------------------------------------
  paymentProcessing: {
    pos: ['Square', 'Shopify', 'PayPal Here'],
    digitalPayments: ['Venmo', 'Zelle', 'Apple Pay', 'Google Pay'],
    tipping: {
      stance:
        'Enable tipping in your POS. PJ qualifies as a beauty service — customers who tip their hair stylist or nail tech will likely tip you too.',
      note: 'Tipping culture is regional. The PJOS app has tipping enabled by default.',
    },
  },

  // ---------------------------------------------------------------------------
  // Event Strategy
  // ---------------------------------------------------------------------------
  eventStrategy: {
    boothFeeRuleOfThumb:
      'Plan on your revenue being AT LEAST 3× your booth fee, or reconsider the event. A typical farmers market day yields 5–10 customers.',
    capacityCalculation: [
      'How many bracelets can you do per hour? (Ask the artist — speed varies widely)',
      'Multiply by event hours = max customers',
      'Multiply by average sale price = max revenue',
      'Compare to booth fee — is 3× realistic?',
    ],
    multipleWelders:
      'For expensive large events, multiply your output by bringing multiple welders. Pay one booth fee, double or triple your capacity. The Sunstone OnDemand rental program exists for exactly this.',
    eventSelectionWisdom: {
      great: [
        'Events where people are mingling and drinking — they want to enjoy themselves, create memories, and have time to decide.',
        'Events where your target customer\'s SPOUSE is the main attendee (e.g., Trail Hero off-roading event — wives came along and loved having something to do).',
        'Concerts, festivals, fairs where the atmosphere is fun and social.',
        'House parties — preplanned, attendees have budgeted, intimate setting.',
      ],
      risky: [
        'Bridal shows — attendees are sampling and booking vendors for their wedding, not buying right now. $800 booth fee for a few leads you could get yourself.',
      ],
      realWorldExample:
        'A Sunstone coach spent $600 for a 3-day off-roading event (Trail Hero) and made $5,000. The event was "for men" but she knew the wives would come along and want something to do. Think creatively about where your actual customer will be.',
    },
    uniqueVenues:
      'Resorts and souvenir-type locations are great — people on vacation love spending money on memories, and PJ is the best kind of souvenir.',
  },

  // ---------------------------------------------------------------------------
  // Salon Integration
  // ---------------------------------------------------------------------------
  salonIntegration: {
    whySalons: [
      'Clients already trust you / the salon.',
      'Captive audience during wait times (hair dye, lashes drying, etc.).',
      'Impulse buy that feels personal and special.',
      'Minimal space needed — a tray, cart, or corner is enough.',
      'Fast service (5–15 min depending on artist speed) with high profit margins.',
    ],
    arrangementOptions: [
      'Chair/booth rent — already well established in the beauty industry.',
      'Revenue share — negotiate based on who brings the clients.',
      'Hybrid arrangements.',
    ],
    negotiationTip:
      'If the salon is already fully booked with their own clients, they have more leverage in the split. If you\'re marketing and bringing new traffic to them, it\'s more of a partnership.',
    integrationMoments: [
      'While hair dye is processing',
      'Before or after permanent makeup',
      'While lashes dry',
      'To match nail art with jewelry',
    ],
  },

  // ---------------------------------------------------------------------------
  // House Party Strategy
  // ---------------------------------------------------------------------------
  houseParties: {
    hostIncentive: 'Recommend: host gets a free bracelet if 5+ people show up. Adjust based on drive time and logistics.',
    minimumSales: '$500 total sales minimum is a common requirement (can vary).',
    inventoryPlanning: 'Calculate 3 pieces per person (for stacking), add themed/special items.',
    keyAdvantage:
      'Attendees have planned and budgeted to spend money. This is where you offer premium options confidently and where surprise $1,000 sales happen.',
  },

  // ---------------------------------------------------------------------------
  // Financial Potential (Encouraging but Not Guaranteeing)
  // ---------------------------------------------------------------------------
  financialPotential: {
    sunnyGuidance:
      'Share encouraging examples and realistic scenarios. NEVER guarantee specific income. Frame as "many artists report..." or "it\'s realistic to expect..." Always acknowledge that results depend on effort, market, and execution.',
    examples: {
      startupInvestment: 'Starting around $2,400–$5,000 for a complete kit with training.',
      breakEvenExample: '77 bracelets at $65 each covers a $5,000 kit investment. With $30 connectors added, that drops to ~53 pieces.',
      eventEarnings: 'Many artists report earning $600–1,000+ at a single farmers market day.',
      profitPerPiece: 'Material cost for a standard bracelet is roughly $3–6. Selling at $65–85 means excellent margins.',
      growthPath: 'Six-figure income is achievable for artists who treat this as a real business, but it requires consistent effort, marketing, and event/venue strategy.',
    },
    caveats: [
      'Results vary depending on market, effort, and execution.',
      'This is a real business that requires time and effort — not a get-rich-quick scheme.',
      'The potential is real, but so is the work required to reach it.',
    ],
  },

  // ---------------------------------------------------------------------------
  // Re-Weld Policy Recommendation
  // ---------------------------------------------------------------------------
  reWeldPolicy: {
    recommendation: 'Free re-welds for life if the piece broke at the weld and the customer still has it. This is good policy and simple to honor — just guarantee it.',
    ifBrokeAtWeld: 'Re-weld the same jump ring for free. No issue welding the same spot multiple times. If the jump ring is mangled or won\'t close properly, use a fresh one.',
    ifBrokeAtChainLink: 'This means the chain broke, not the weld. Add a new jump ring. Optionally charge ~$5 for the jump ring or do it free — artist preference.',
    ifLostPiece: 'Customer needs to purchase a new piece. Do NOT offer discounts on replacements — this can imply fault and doesn\'t generate goodwill. They lost it; you make them a new one.',
    variousPolicySamples: {
      note: 'PJ University includes sample warranty, tarnish replacement, and lost chain policies that artists can customize for their business. These are templates with different timeframes (14-day, 30-day, 60-day, 6-month variations) — artists should choose what works for them.',
    },
  },

  // ---------------------------------------------------------------------------
  // Scheduling and Queue Management
  // ---------------------------------------------------------------------------
  scheduling: {
    bookingApps: ['Vagaro', 'Mangomint', 'Fresha', 'Salon Biz', 'Acuity Scheduling'],
    queueManagement: ['Waitly', 'Waitwhile', 'Qminder'],
    note: 'The Sunstone PJOS app includes built-in queue management with SMS notifications — artists using PJOS may not need a separate queue app.',
  },

  // ---------------------------------------------------------------------------
  // Waiver Management
  // ---------------------------------------------------------------------------
  waiverManagement: {
    thirdPartyApps: ['Smart Waiver', 'JotForm', 'WaiverForever', 'WaiverFile'],
    pjosBuiltIn: 'The Sunstone PJOS app includes a built-in digital waiver system with signature capture.',
    keyWaiverElements: [
      'Understanding of the welding process (safe and painless)',
      'Acknowledgment of risks (rare allergic reactions, potential burns, stretching/breaking)',
      'Pacemaker disclosure (not approved — ask for a clasp instead)',
      'MRI acknowledgment (can be cut off and re-welded)',
      'Photo/video consent for marketing',
      'No refund policy (custom fit to each individual)',
      'Re-weld policy terms',
      'Age requirement (18+ or parent/guardian signature)',
    ],
  },
};

// =============================================================================
// SECTION 6: CLIENT EXPERIENCE
// =============================================================================
export const CLIENT_EXPERIENCE_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // The Sunstone Customer Experience Flow
  // ---------------------------------------------------------------------------
  experienceFlow: {
    philosophy:
      'People buy the moment, the meaning, and the relationship — not just jewelry. This is experiential retail. The experience IS the product.',
    steps: [
      {
        step: 1,
        name: 'Welcome & Discovery',
        details: 'Warm greeting. Ask open-ended questions to understand what they\'re looking for. Make them feel comfortable and excited.',
      },
      {
        step: 2,
        name: 'Chain Selection',
        details: 'Start with three guiding questions: "Are you a silver or gold person?", "Classic or trendy?", "Dainty or bolder?" Make chains accessible for draping and visualization. For busy events, limit display to 6–12 options to reduce decision fatigue.',
      },
      {
        step: 3,
        name: 'Piece Type',
        details: 'Bracelet, anklet, necklace, ring, or hand chain. Most customers start with a bracelet.',
      },
      {
        step: 4,
        name: 'Stacking Introduction',
        details: 'Introduce stacking during chain selection as STYLING GUIDANCE, not a sales pitch. Three natural windows: (1) After they pick a chain: "Ooh, that one looks great stacked with this one!" (2) If they\'re struggling to choose: "Are you silver or gold? Lots of people stack both!" (3) After first piece is done: "Want to see how a different style looks stacked with it?" Lean into social proof — this demographic (women 18–40 in beauty) responds to "everyone\'s doing this" and trend language.',
      },
      {
        step: 5,
        name: 'Connector/Charm Option',
        details: 'After chain is chosen, offer personalization. "Would you like to add an initial or birthstone?" This is an add-on, not a hard sell.',
      },
      {
        step: 6,
        name: 'Price Confirmation',
        details: 'State the price confidently with no apology. Use tier language. Confirm before measuring. If price objection: quality, investment, and experience — see pricing section.',
      },
      {
        step: 7,
        name: 'Sizing',
        details: 'Use the one-finger rule for bracelets (one finger between chain and wrist). Anklets fit tighter — account for Achilles stretch. Rings are welded off-finger. Always confirm sizing with the customer BEFORE cutting.',
      },
      {
        step: 8,
        name: 'Pre-Weld Safety Moment',
        details: 'Brief safety script: "There will be a small flash — I recommend recording with your phone or looking away for a moment. I\'m going to place this leather patch for extra comfort." Keep it calm and confident, not scary.',
      },
      {
        step: 9,
        name: 'Weld, Clean, Cut, Finish',
        details: 'Weld the jump ring. Clean with fiberglass brush. Verify the weld. THEN cut excess chain. Place the joint under the wrist (for bracelets) so they see a seamless piece. This is nice to do but not critical — especially if there\'s a connector or charm.',
      },
      {
        step: 10,
        name: 'The Reveal',
        details: 'This is the magic moment. Let them see it. Take a photo. Create the memory.',
      },
      {
        step: 11,
        name: 'Aftercare Card',
        details: 'Hand them the aftercare card FIRST. Keep verbal aftercare brief unless they ask questions. The card has everything they need.',
      },
      {
        step: 12,
        name: 'Close',
        details: 'Priority order: (1) Social proof first — "Would you mind leaving us a review? Tag us on Instagram @sunstonepj!" (2) Referrals/parties second — "We do private parties too if you\'re interested!" Don\'t flip this order. Reviews and social tags have compounding value.',
      },
    ],
    recoveryMode: {
      when: 'If something goes wrong during the weld — a misfire, abort, or need to redo.',
      script: '"Give me one second, I\'m going to do a quick reset."',
      tone: 'Calm, confident, no drama. Customers take their emotional cues from you.',
    },
  },

  // ---------------------------------------------------------------------------
  // Aftercare
  // ---------------------------------------------------------------------------
  aftercare: {
    careCard: [
      'Clean with mild jewelry cleaner or polishing cloth.',
      'Avoid harsh chemicals (bleach, acetone, etc.).',
      'Rinse after swimming in chlorinated or saltwater.',
      'Wipe down after applying lotions or sunscreen.',
      'Jewelry should be snug but comfortable.',
      'Anklets may stretch slightly over time — this is normal.',
      'If it breaks or stretches, bring it back for a free re-weld.',
    ],
    aftercareBag: [
      'Care card with business info and a promo discount for next visit',
      'Polishing cloth or lash brush',
      'Optional: Sunshine jewelry cleaner (upsell opportunity)',
    ],
  },

  // ---------------------------------------------------------------------------
  // Safety
  // ---------------------------------------------------------------------------
  safety: {
    eyeSafety: {
      recommendation: 'ALWAYS recommend eye protection.',
      reality: 'A single weld flash will not cause eye damage. However, cumulative UV exposure over time can cause damage.',
      sunnyRule:
        'NEVER say it is "okay" or "fine" to skip eye protection. This is a liability concern for Sunstone. Always recommend it. If pressed, you can say the risk from a single flash is minimal, but do NOT give permission to skip protection.',
      customerOptions: ['Look away during the flash', 'Record the weld with their phone (natural way to avoid looking directly)', 'Wear protective glasses'],
    },
    leatherPatch: {
      purpose: 'Goes between the skin and the weld area. Primarily for customer peace of mind.',
      required: false,
      note: 'The technology is safe — artists can work very close to the weld area without the patch. But it\'s good practice and makes nervous customers feel more comfortable.',
    },
    pacemaker: {
      stance: 'Not approved for use with pacemakers.',
      sunnyRule: 'Only address if asked. Language: "Welding is not approved for people with pacemakers. We recommend consulting your doctor with any questions." Do NOT use fear language like "very dangerous."',
      alternative: 'Offer a clasp closure instead of a welded jump ring.',
    },
    mri: {
      customerConcern: 'Common question — "What if I need an MRI?"',
      answer: 'Most PJ metals are not ferromagnetic, so technically fine. But the ultimate call belongs to the doctor and MRI clinic. Reassure the customer: if they ever need to remove it, they can cut the jump ring with scissors and bring it back for a free re-weld.',
      goal: 'Remove the purchase objection. PJ is NOT a waste if you need an MRI someday.',
    },
    minors: {
      generalRule: 'Get parent/guardian permission for anyone 12 or younger.',
      legalNote: 'Some locations (like California) may have specific laws about selling jewelry to minors. Recommend checking local regulations.',
      waiverRequirement: 'Under 18 requires parent/guardian signature on the waiver.',
    },
    pregnancyAndOtherConditions: {
      concerns: 'None beyond pacemakers. Pregnancy is not a concern. This topic rarely comes up.',
    },
    emergencyProcedures: {
      minorBurn: 'Cool with water, apply burn cream, bandage, document.',
      electrodePoke: 'Clean with antiseptic, bandage.',
      allergicReaction: 'Stop service, remove jewelry, basic first aid, seek medical attention if needed.',
      generalPrinciple: 'Stay calm, handle it professionally, document everything.',
    },
  },
};

// =============================================================================
// SECTION 7: MARKETING
// =============================================================================
export const MARKETING_KNOWLEDGE = {
  // ---------------------------------------------------------------------------
  // Branding Foundations
  // ---------------------------------------------------------------------------
  branding: {
    businessName: {
      tools: ['Shopify Business Name Generator', 'Namechk (check social media availability)'],
      advice: 'Check availability across all social platforms BEFORE committing to a name.',
    },
    usp: {
      framework: 'What makes you special → Why it matters → How it impacts customers',
      advice: 'Communicate benefits, not just features. "Hypoallergenic jewelry that never comes off" is better than "14K gold permanent jewelry."',
    },
    sunstoneCertified: {
      what: 'Certificate of completion from PJ University. Awarded for each course completed.',
      howToUse: [
        'Add to Instagram/social media bio',
        'Include on event signage and displays',
        'Mention in conversations with potential customers',
        'Use as a trust signal — Sunstone is a well-known brand for quality in PJ',
      ],
      messaging: '"Sunstone Certified" communicates that you\'ve been trained by the industry leader and use professional-grade equipment.',
    },
    designTools: ['Canva', 'Adobe Spark', 'Looka', 'LogoAI.com', 'Brandmark.io'],
    printMaterials: ['Vistaprint', 'Moo', 'PrintPlace', 'BannerBuzz', 'Custom Ink', 'Sticker Mule'],
  },

  // ---------------------------------------------------------------------------
  // Social Media
  // ---------------------------------------------------------------------------
  socialMedia: {
    bestPractices: [
      'Post consistently at optimal times for your audience.',
      'Use high-quality visuals — the weld moment is inherently shareable.',
      'Leverage Reels, Stories, and short-form video heavily — the welding moment is CONTENT.',
      'Optimize your bio with location and "Sunstone Certified."',
      'Engage genuinely — follow others, comment on posts, build community.',
      'Collaborate with local influencers and complementary businesses.',
      'Tell your brand story authentically.',
      'Use scheduling tools to stay consistent: Hootsuite, Buffer.',
      'Monitor analytics — track what content performs and do more of it.',
      'Integrate booking apps like Vagaro directly in your bio link.',
    ],
    contentLibrary: {
      what: '300+ images and videos provided to PJ University students.',
      purpose: 'Ready-made social media content to help artists launch their social presence immediately.',
      access: 'PJ University students only. Non-students can purchase access to PJ University.',
    },
    keyInsight:
      'People share the WELDING MOMENT on TikTok and Instagram, not just the finished piece. The process is the content. Encourage artists to capture and share every weld.',
  },

  // ---------------------------------------------------------------------------
  // Event Marketing
  // ---------------------------------------------------------------------------
  eventMarketing: {
    popUps: {
      preparation: [
        'Connect with event organizers early.',
        'Confirm vendor fees, booth rental details, and requirements (insurance?).',
        'Consider venue type (indoor vs outdoor) and adapt.',
        'Professional branded setup: table covers, signage, display lighting.',
        'Use a digital queue system for busy events.',
        'Social media pre-event hype — build anticipation.',
        'Live demos during the event to attract foot traffic.',
        'Collect contact info (email, social) from every customer.',
        'Post-event review — what worked, what to improve.',
      ],
    },
    houseParties: {
      preparation: [
        'Communicate clearly with the host about expectations.',
        'Set minimum guest requirement (recommend 5+ for free host bracelet).',
        'Calculate inventory: 3 pieces per person for stacking potential.',
        'Add special themed items for the occasion.',
        'Provide the host with a digital flyer showing host benefits.',
      ],
      hostIncentives: 'Free bracelet for the host if 5+ guests attend. Adjust based on drive time and logistics.',
    },
    brickAndMortar: {
      strategies: [
        'Storefront and in-store displays.',
        'Google My Business optimization + encourage reviews.',
        'Community events and workshops.',
        'Local advertising: direct mail, local magazines, sponsorships.',
        'Loyalty programs for repeat customers.',
        'Digital displays showing the welding process.',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Networking
  // ---------------------------------------------------------------------------
  networking: {
    groups: [
      'Chamber of Commerce',
      'BNI (Business Network International)',
      'Women entrepreneur groups',
      'LinkedIn / Facebook groups / Instagram hashtags for PJ community',
    ],
    facebookGroups: [
      'Sunstone PJ Community (Sunstone\'s official group)',
      'Original Permanent Jewelry Community',
      'Permanent Jewelry Startup',
      'Permanent Jewelry Newbies',
      'Permanent Jewelry Business Tips',
      'Permanent Jewelry Community + Support',
    ],
    collaborations: [
      'Event sponsoring',
      'Charitable fundraisers (great exposure and community building)',
      'Exclusive boutique nights',
      'Cross-promotion with complementary beauty businesses',
    ],
    pjxConference: {
      what: 'The only conference exclusively for permanent jewelry artists.',
      frequency: 'Annual',
      next: 'June 2026, Las Vegas',
      website: 'www.pjexpo.org',
      value: [
        'Meet suppliers and discover new products.',
        'Network with artists from around the country.',
        'Attend classes on welding, business, and marketing from industry experts.',
        'Get business ideas that are working in other markets.',
        'The connections are the #1 reported benefit by attendees.',
      ],
      sunnyCanShare: true,
    },
  },

  // ---------------------------------------------------------------------------
  // Event Packing Checklist
  // ---------------------------------------------------------------------------
  eventPackingChecklist: {
    mainSetup: [
      'Tables and coverings', 'Chairs', 'Stool for anklets', 'Display signage and backdrops',
      'Tabletop signage (price list, FAQs, social media, how to pay)',
      'Canopy/tent/weights (outdoor)', 'Fan or heater', 'Additional shelves or racks',
      'Power bank, power bars, extension cords',
      'Ring light and phone holder for photos/video', 'Additional lights and extra bulbs',
      'Business cards and holder', 'Care packages for PJ purchases',
      'Clipboard/tablet for waiver forms', 'Mirror', 'Magnifying glass',
      'Product covers (multi-day events)',
    ],
    stockAndWelder: [
      'Welder and power cords', 'Stylus', 'Extra tungsten electrodes', 'Tungsten sharpener',
      'Stylus holder or optics (ADL/Scope)', 'Argon tubing, tank, and regulator',
      'Ground clips or pliers', 'Protective leather patch', 'Fiberglass brush',
      'Chain nose pliers', 'Flush cutters', 'Protective glasses',
      'Tools and accessories bag', 'Armrest/cushion',
      'Jump rings (+ dish)', 'Dish for chain cuttings',
      'Chain display and display chains', 'Chain stock', 'Jump ring stock',
      'Clasp stock (if offered)', 'Charm and connector display + stock',
    ],
    paymentAndPOS: [
      'Cash and cash box/money bag', 'Phone/tablet/laptop with chargers',
      'Credit card reader', 'Printer', 'Portable WiFi stick',
    ],
    extras: [
      'Pens, pencils, markers', 'Extra paper/notebook', 'Stapler',
      'Packing tape', 'Twist ties', 'Calculator', 'Saran wrap (for displays)',
      'Zip lock bags', 'Scissors', 'Zip ties',
      'Wet wipes', 'Hand sanitizer', 'Sunscreen', 'Kleenex',
      'Water', 'Snacks', 'Cooler', 'Extra garbage bags',
    ],
  },
};

// =============================================================================
// SECTION 8: PJ UNIVERSITY & SUNNY'S ROLE
// =============================================================================
export const PJ_UNIVERSITY_AND_SUNNY_ROLE = {
  // ---------------------------------------------------------------------------
  // PJ University Structure
  // ---------------------------------------------------------------------------
  pjUniversity: {
    overview: 'Two courses, ~20 modules each (~40 total classes), with a completion certificate ("Sunstone Certified") for each course.',
    includedWith: 'All starter kits (Momentum, Dream, Legacy) include PJ University access.',
    loginUrl: 'https://permanentjewelry-sunstonewelders.thinkific.com/users/sign_in',
    accessNote: 'Artists receive PJ University login information in their welcome email after purchasing their kit. If they cannot find it, direct them to Sunstone support at 385-999-5240.',
    additionalResources: [
      '300+ images and videos for social media content',
      'Event packing checklist',
      'Facebook support groups list',
      '30-day fast track calendar',
      'Helpful business resources and links',
      'Sample consent form and waiver templates',
      'Sample price list',
      'Trusted suppliers list (45+ suppliers)',
      'Weld settings chart (also on Sunstone website)',
      'Sample tarnish replacement policy',
      'Sample lost chain replacement policy',
      'Photo/video consent form template',
    ],

    course1: {
      name: 'PJ Mastery Series: The Sunstone Method',
      focus: 'Hands-on welding technique and customer experience',
      sections: {
        introductionAndSetup: [
          'Welcome to the Sunstone Method',
          'Zapp Plus 2 - Setup & Overview',
          'mPulse Setup Guide',
          'Zapp Plus Setup Guide',
          'Argon Set Up and Electrode Maintenance',
          'Optics Set Up Guide',
        ],
        understandingMaterials: [
          'Metals Deep Dive',
          'Semi-Precious Metals Deep Dive',
          'Choosing the Right Chain',
        ],
        fundamentalsOfMicroTIGWelding: [
          'Handling Jump Rings',
          'Welding Basics',
          'Safety and Measuring for PJ',
        ],
        advancedPJWeldingTechniques: [
          'Stylus technique and bracelet welding',
          'Rings & Hand Chains',
          'Crafting Necklaces',
          'Anklets - How to do it',
        ],
        customerExperience: [
          'Upselling Charms & Connectors',
          'Troubleshooting',
          'Aftercare',
        ],
        storageAndMarketing: [
          'Storing & Transporting Materials',
          'Being Sunstone Certified',
        ],
      },
      // Flat list for backward compatibility
      modules: [
        'Welcome to the Sunstone Method',
        'Zapp Plus 2 - Setup & Overview',
        'mPulse Setup Guide',
        'Zapp Plus Setup Guide',
        'Argon Set Up and Electrode Maintenance',
        'Optics Set Up Guide',
        'Metals Deep Dive',
        'Semi-Precious Metals Deep Dive',
        'Choosing the Right Chain',
        'Handling Jump Rings',
        'Welding Basics',
        'Safety and Measuring for PJ',
        'Stylus technique and bracelet welding',
        'Rings & Hand Chains',
        'Crafting Necklaces',
        'Anklets - How to do it',
        'Upselling Charms & Connectors',
        'Troubleshooting',
        'Aftercare',
        'Storing & Transporting Materials',
        'Being Sunstone Certified',
      ],
    },

    course2: {
      name: 'Business Foundations for PJ Professionals',
      focus: 'Business building, marketing, and growth strategy',
      sections: {
        introductionToPermanentJewelry: [
          'What is Permanent Jewelry',
          'The Permanent Jewelry Experience',
          'The Different Types of Permanent Jewelry',
          'The Financial Potential of Your Permanent Jewelry Business',
        ],
        productManagement: [
          'Choosing the Right Chains and Jump Rings',
          'Working with Charms, Connectors and Inventory',
        ],
        theCustomerExperience: [
          'Welding Permanent Jewelry: Step by Step',
          'Completing the Customer Experience: Aftercare',
        ],
        businessFoundations: [
          'Choosing a Legal Entity: Sole Proprietor and LLC',
          'Protecting Your Business with Insurance',
          'Managing Finances and Customer Checkout',
        ],
        marketing: [
          'Creating Your Unique Brand',
          'Creating a Logo and Marketing Your Brand',
          'Pricing Strategies for Permanent Jewelry',
          'Diving into Social Media Marketing',
          'How to Plan and Execute a House Party',
          'Maximizing Your Pop-Up Presence',
          'Marketing a Brick & Mortar Location',
          'Growing Your Business Through Networking',
        ],
        nextSteps: [
          'Building Your Permanent Jewelry Empire',
        ],
      },
      // Flat list for backward compatibility
      modules: [
        'What is Permanent Jewelry',
        'The Permanent Jewelry Experience',
        'The Different Types of Permanent Jewelry',
        'The Financial Potential of Your Permanent Jewelry Business',
        'Choosing the Right Chains and Jump Rings',
        'Working with Charms, Connectors and Inventory',
        'Welding Permanent Jewelry: Step by Step',
        'Completing the Customer Experience: Aftercare',
        'Choosing a Legal Entity: Sole Proprietor and LLC',
        'Protecting Your Business with Insurance',
        'Managing Finances and Customer Checkout',
        'Creating Your Unique Brand',
        'Creating a Logo and Marketing Your Brand',
        'Pricing Strategies for Permanent Jewelry',
        'Diving into Social Media Marketing',
        'How to Plan and Execute a House Party',
        'Maximizing Your Pop-Up Presence',
        'Marketing a Brick & Mortar Location',
        'Growing Your Business Through Networking',
        'Building Your Permanent Jewelry Empire',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 1:1 Mentoring
  // ---------------------------------------------------------------------------
  mentoring: {
    includedWith: ['Dream kit ($3,199)', 'Legacy kit ($4,999)'],
    notIncludedWith: ['Momentum kit ($2,399)'],
    duration: '90 days from purchase date',
    what: 'Access to a PJ expert for personalized coaching above and beyond regular Sunstone support.',
    bookingUrl: 'https://outlook.office.com/book/SunstoneSuccessCoach@sunstonewelders.com/?ismsaljsauthenabled',
    bookingNote: 'Dream and Legacy kit owners can book mentoring sessions using the link above. They also received this in their welcome email.',
    sunnyAwareness:
      'Sunny should be aware that Dream/Legacy customers may have received specific advice from their mentor. Don\'t contradict mentoring guidance — if there\'s a conflict, suggest they follow up with their mentor or Sunstone support.',
  },

  // ---------------------------------------------------------------------------
  // 30-Day Fast Track
  // ---------------------------------------------------------------------------
  fastTrack: {
    overview: 'A day-by-day calendar for the first 30 days after purchasing a kit.',
    schedule: {
      day1: 'Register business, secure social media handles, join Sunstone PJ Community on Facebook.',
      week1: 'Set up LLC, obtain liability insurance, organize workspace, set up welding equipment, practice welding with friends and family, experiment with different metals and jump ring sizes. SUNSTONE CHECK-IN.',
      week2: 'Plan and order inventory (chains, jump rings, charms). Order care cards, pricing materials, chain displays. Continue practicing welding techniques. Take photos/videos for content.',
      week3: 'Post first social media content. Create bio and highlight bubbles. Engage online (follow, comment, build community). Plan first pop-up or house party. SUNSTONE CHECK-IN.',
      week4: 'Host first event. Reflect and make notes for improvement. Collect content and reviews. Continue social media engagement. Plan to attend upcoming events (like PJX). Review the month and set goals. Celebrate!',
    },
  },

  // ---------------------------------------------------------------------------
  // Sunny's Personality & Communication Style
  // ---------------------------------------------------------------------------
  sunnyPersonality: {
    coreTone: 'Empathetic mentor with "You can do this!" energy. Warm, encouraging, knowledgeable.',
    adaptive: 'Reads the room. Adjusts tone to match the conversation — celebratory when they\'re winning, supportive when they\'re struggling, direct when they need honest guidance.',
    notRoboticCheerleader: 'Genuine encouragement, not empty positivity. If the suggestion requires more hard work, say so with kindness.',
    withStrugglingArtists: {
      approach: 'Lead with encouragement and empathy. Validate their feelings. Then redirect toward actionable next steps.',
      philosophy: 'This is a real business that requires time and effort. It\'s not get-rich-quick — even though fast success is possible. The opportunity is real, but so is the work.',
      ifTheyWantToQuit: 'Encourage for a bit, but if they\'re serious about returns, refer to Sunstone support. Respect their decision while making sure they know the door is open.',
    },
  },

  // ---------------------------------------------------------------------------
  // Sunny's Knowledge Boundaries
  // ---------------------------------------------------------------------------
  sunnyBoundaries: {
    whenSunnyDoesntKnow: {
      firstResponse: '"Let me check on that for you..."',
      approach: 'Try 2–3 attempts to find or reason through an answer.',
      escalation: 'If the customer is frustrated or Sunny can\'t resolve quickly, refer to Sunstone support: call or text 385-999-5240.',
    },
    competitorWelders: {
      stance: 'Always take the high road. No trash talk.',
      ifAskedDirectly: {
        story: '"Sunstone has been engineering micro welding technology for industries that demand perfection for nearly 20 years. Others entered the PJ space to capitalize on a trend. We were here first and we\'ll be here when they\'re gone."',
        forFeatureComparisons: 'Refer to Sunstone support for detailed competitive comparisons.',
      },
      ifHelpingNonSunstoneUser: 'Help them generically with welding technique. Don\'t refuse assistance, but don\'t troubleshoot competitor hardware specifically.',
    },
    nonSunstoneChains: {
      stance: 'Help freely. Most artists use multiple suppliers — this is expected and normal.',
      caveat: 'Note that Sunstone cannot guarantee the quality of materials from other suppliers.',
    },
    pjUniversityAccess: {
      checkFirst: 'Verify if the user is a PJ University student or purchased training from Sunstone.',
      ifStudent: 'Refer to specific PJ University modules and resources by name.',
      ifNotStudent: 'Mention PJ University exists as a resource. Don\'t hard-sell it.',
    },
    cruiseShips: {
      stance: 'Do not mention cruise ship PJ operations to artists. If asked about unique venues, steer toward resorts and souvenir-type locations.',
      reason: 'Sunstone is working directly with cruise lines — this is not relevant to independent artists.',
    },
    discounting: {
      stance: 'NEVER recommend discounting. Always steer toward value, differentiation, and "you are worth it" messaging.',
    },
  },

  // ---------------------------------------------------------------------------
  // Support Resources
  // ---------------------------------------------------------------------------
  supportResources: {
    sunstoneSupport: {
      phone: '385-999-5240',
      method: 'Call or text',
      for: ['Equipment malfunction', 'Account issues', 'Return policy questions', 'Edge cases beyond Sunny\'s knowledge', 'Competitive comparisons'],
    },
    communityGroups: [
      { name: 'Sunstone PJ Community (Facebook — official)', url: 'https://www.facebook.com/share/g/1G8g5gFmqs/' },
      { name: 'Original Permanent Jewelry Community (Facebook)', url: 'https://www.facebook.com/share/g/1B5na4wges/' },
      'Permanent Jewelry Startup (Facebook)',
      'Permanent Jewelry Newbies (Facebook)',
      'Permanent Jewelry Business Tips (Facebook)',
      'Permanent Jewelry Community + Support (Facebook)',
    ],
    pjxConference: {
      website: 'www.pjexpo.org',
      next: 'June 2026, Las Vegas',
    },
  },
};

// =============================================================================
// COMBINED EXPORT (for easy import in PJOS)
// =============================================================================
export const SUNNY_MENTOR_KNOWLEDGE = {
  equipment: EQUIPMENT_KNOWLEDGE,
  weldingTechnique: WELDING_TECHNIQUE_KNOWLEDGE,
  troubleshooting: TROUBLESHOOTING_KNOWLEDGE,
  products: PRODUCTS_KNOWLEDGE,
  businessStrategy: BUSINESS_STRATEGY_KNOWLEDGE,
  clientExperience: CLIENT_EXPERIENCE_KNOWLEDGE,
  marketing: MARKETING_KNOWLEDGE,
  pjUniversityAndSunnyRole: PJ_UNIVERSITY_AND_SUNNY_ROLE,
};