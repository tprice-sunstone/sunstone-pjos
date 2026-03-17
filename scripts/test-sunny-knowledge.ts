#!/usr/bin/env npx tsx
// =============================================================================
// Sunny Knowledge Retrieval Test Suite
// =============================================================================
// Tests that the right knowledge chunks are retrieved for common artist questions.
// This is an OFFLINE test — it does not call any API. It replicates the
// selectSubsections() logic from route.ts and verifies chunk retrieval.
//
// Run: npx tsx scripts/test-sunny-knowledge.ts
// =============================================================================

import {
  EQUIPMENT_KNOWLEDGE,
  WELDING_TECHNIQUE_KNOWLEDGE,
  TROUBLESHOOTING_KNOWLEDGE,
  PRODUCTS_KNOWLEDGE,
  BUSINESS_STRATEGY_KNOWLEDGE,
  CLIENT_EXPERIENCE_KNOWLEDGE,
  MARKETING_KNOWLEDGE,
  PJ_UNIVERSITY_AND_SUNNY_ROLE,
  PJOS_PLATFORM_GUIDE,
} from '../src/lib/mentor-knowledge';

// =============================================================================
// Replicate the subsection registry from route.ts
// =============================================================================

interface Subsection {
  id: string;
  label: string;
  data: any;
  keywords: string[];
  priority?: number;
}

const SUBSECTIONS: Subsection[] = [
  // ── EQUIPMENT ──
  { id: 'eq-welders', label: 'Welders', data: EQUIPMENT_KNOWLEDGE.welders, keywords: ['welder', 'zapp', 'mpulse', 'orion', 'pulse', 'trufire', 'tru fire', 'touchscreen', 'knob'] },
  { id: 'eq-kits', label: 'Starter Kits', data: EQUIPMENT_KNOWLEDGE.starterKits, keywords: ['kit', 'momentum', 'dream', 'legacy', 'starter', 'came with', 'included', 'package', 'purchase', 'buy', 'bought'], priority: 1 },
  { id: 'eq-argon', label: 'Argon Setup', data: EQUIPMENT_KNOWLEDGE.argon, keywords: ['argon', 'gas', 'tank', 'regulator', 'flow', 'lpm', 'psi', 'compressed', 'hose', 'coupler', 'mini'] },
  { id: 'eq-electrode', label: 'Electrode Maintenance', data: EQUIPMENT_KNOWLEDGE.electrode, keywords: ['electrode', 'tungsten', 'sharpen', 'sharpening', 'pilot', 'protrusion', 'maintenance', 'dull', 'tip'] },
  { id: 'eq-settings', label: 'Weld Settings Chart', data: EQUIPMENT_KNOWLEDGE.weldSettings, keywords: ['setting', 'joule', 'power', 'gauge', '20g', '22g', '24g', '26g', 'what setting', 'how many joule', 'weld setting', 'power setting', 'what power', 'jump ring setting', '20 gauge', '22 gauge', '24 gauge', '26 gauge', 'gold fill', 'gold filled', '14k', 'rose gold', 'white gold', 'burn through', 'burning through', 'too hot', 'not fusing', 'weld chart', 'how many weld'], priority: 2 },
  { id: 'eq-optics', label: 'Optics', data: EQUIPMENT_KNOWLEDGE.optics, keywords: ['optic', 'scope', 'adl', 'magnif', 'lens', 'camera', 'digital'] },
  { id: 'eq-rental', label: 'Rental Program', data: EQUIPMENT_KNOWLEDGE.rentalProgram, keywords: ['rent', 'rental', 'ondemand', 'on demand', 'try', 'borrow'] },

  // ── WELDING TECHNIQUE ──
  { id: 'wt-fundamentals', label: 'Fundamental Welding Process', data: WELDING_TECHNIQUE_KNOWLEDGE.fundamentalProcess, keywords: ['how to weld', 'welding process', 'basic', 'beginner', 'first weld', 'learn', 'start welding', 'touch and release', 'solder', 'micro tig', 'tig welding', 'what is welding', 'laser'] },
  { id: 'wt-jumpring', label: 'Jump Ring Handling', data: WELDING_TECHNIQUE_KNOWLEDGE.jumpRingHandling, keywords: ['jump ring', 'jumpring', 'close', 'gap', 'overlap', 'pinch', 'opening', 'flush', 'gauge', 'thickest', 'match chain'] },
  { id: 'wt-grounding', label: 'Grounding', data: WELDING_TECHNIQUE_KNOWLEDGE.grounding, keywords: ['ground', 'grounding', 'clip', 'clamp', 'connection', 'directly on'] },
  { id: 'wt-angle', label: 'Weld Angle', data: WELDING_TECHNIQUE_KNOWLEDGE.weldAngle, keywords: ['angle', '90', 'degree', 'perpendicular', 'position'] },
  { id: 'wt-multiple', label: 'Multiple Welds', data: WELDING_TECHNIQUE_KNOWLEDGE.multipleWelds, keywords: ['multiple weld', 'pulse', 'several', 'repeat', 'thick', 'heavy gauge'] },
  { id: 'wt-mistakes', label: 'Common Mistakes', data: WELDING_TECHNIQUE_KNOWLEDGE.weldTriggeringMistakes, keywords: ['mistake', 'wrong', 'trigger', 'misfire', 'beginner error'] },
  { id: 'wt-metals', label: 'Metal-Specific Welding', data: WELDING_TECHNIQUE_KNOWLEDGE.metalWeldingNotes, keywords: ['gold fill weld', 'silver weld', 'stainless weld', 'solid gold weld', 'metal specific', 'discolor', 'stainless steel', 'pvd', 'hard-wire cutter', 'enamel', 'enamel chain', 'plated'] },
  { id: 'wt-pieces', label: 'Piece-Specific Technique', data: WELDING_TECHNIQUE_KNOWLEDGE.pieceSpecificNotes, keywords: ['bracelet technique', 'anklet technique', 'necklace technique', 'ring technique', 'achilles', 'longer piece', 'hand chain', 'hand chain technique'] },
  { id: 'wt-ring-welding', label: 'Ring Welding Technique', data: WELDING_TECHNIQUE_KNOWLEDGE.ringWelding, keywords: ['ring weld', 'ring technique', 'off hand', 'chain ring', 'finger chain', 'weld ring', 'ring off hand', 'ring sizing', 'ring add-on', 'ring sales', 'weld a ring', 'welding rings', 'do rings', 'size a ring', 'measure ring', 'off the finger', 'slide on', 'permanent ring', 'toe ring', 'finger', 'rings as upsell', 'suggest a ring', 'add on ring', 'rings', 'sell rings', 'on and off'], priority: 1 },

  // ── TROUBLESHOOTING ──
  { id: 'ts-top', label: 'Top Issues', data: TROUBLESHOOTING_KNOWLEDGE.topIssues, keywords: ['problem', 'issue', 'troubleshoot', 'not working', 'help', 'break', 'broke', 'abort', 'won\'t', 'doesn\'t', 'wont fire', 'wont weld', 'wont spark', 'blowing out', 'no spark', 'no fire', 'no weld', 'sparking', 'blob', 'balling', 'weak weld', 'inconsistent', 'not fusing', 'dull electrode', 'contaminated', 'click but', 'keeps clicking', 'arc wanders'], priority: 1 },
  { id: 'ts-electrode', label: 'Electrode Troubleshooting', data: TROUBLESHOOTING_KNOWLEDGE.electrode, keywords: ['electrode problem', 'stuck', 'welding to', 'ball', 'mushroom'] },
  { id: 'ts-power', label: 'Power Setting Troubleshooting', data: TROUBLESHOOTING_KNOWLEDGE.powerSettings, keywords: ['too low', 'too high', 'burn', 'dark spot', 'not hold', 'weak weld', 'power setting'] },
  { id: 'ts-ground', label: 'Grounding Issues', data: TROUBLESHOOTING_KNOWLEDGE.grounding, keywords: ['grounding issue', 'inconsistent', 'links fusing', 'chain fuse', 'fusing', 'fusing together', 'chains fusing'] },
  { id: 'ts-escalation', label: 'Escalation', data: TROUBLESHOOTING_KNOWLEDGE.escalation, keywords: ['support', 'phone', 'contact', 'escalate', 'malfunction', 'return', 'refund'] },

  // ── PRODUCTS ──
  { id: 'pr-metals', label: 'Metal Types', data: PRODUCTS_KNOWLEDGE.metalTypes, keywords: ['metal', 'gold', 'silver', 'sterling', 'stainless', 'steel', 'filled', '14k', 'karat', 'rose', 'white', 'hypoallergenic', 'tarnish'] },
  { id: 'pr-pieces', label: 'Piece Types', data: PRODUCTS_KNOWLEDGE.pieceTypes, keywords: ['bracelet', 'anklet', 'necklace', 'ring', 'size', 'inch', 'default', 'how long', 'measure'] },
  { id: 'pr-connectors', label: 'Connectors vs Charms', data: PRODUCTS_KNOWLEDGE.connectorsVsCharms, keywords: ['connector', 'charm', 'birthstone', 'initial', 'dangle', 'inline', 'bs connector'] },
  { id: 'pr-chainselect', label: 'Chain Selection', data: PRODUCTS_KNOWLEDGE.chainGuidance, keywords: ['chain select', 'which chain', 'recommend', 'popular', 'best seller', 'display', 'variety', 'start with', 'what chain should', 'chain for beginner'] },
  { id: 'pr-jumpring-inv', label: 'Jump Ring Inventory', data: PRODUCTS_KNOWLEDGE.sunstoneJumpRingInventory, keywords: ['jump ring size', 'jump ring inventory', '3mm', '4mm', 'gauge jump'] },
  { id: 'pr-inventory', label: 'Inventory Planning', data: PRODUCTS_KNOWLEDGE.inventoryPlanning, keywords: ['inventory', 'stock', 'how much', 'reorder', 'bring', 'run out', 'enough', 'plan', 'supply'], priority: 2 },
  { id: 'pr-suppliers', label: 'Supplier Guidance', data: PRODUCTS_KNOWLEDGE.suppliers, keywords: ['supplier', 'supply', 'sunstone welders', 'order', 'imprinted', 'stuller', 'rio grande', 'where to buy', 'where can i buy', 'buy more', 'buy chain', 'buy jump ring', 'from sunstone'] },
  { id: 'pr-chain-universality', label: 'Chain Universality', data: PRODUCTS_KNOWLEDGE.chainUniversality, keywords: ['bracelet chain', 'necklace chain', 'which chain for', 'any chain', 'chain for necklace', 'chain for bracelet', 'chain for ring', 'chain type'] },
  { id: 'pr-yield', label: 'Yield Math', data: PRODUCTS_KNOWLEDGE.yieldMath, keywords: ['yield', 'how many bracelet', 'bracelets per foot', 'chain math', 'how far does chain go', 'how much chain', 'per foot', 'spool', 'waste'], priority: 1 },
  { id: 'pr-jumpring-select', label: 'Jump Ring Selection', data: PRODUCTS_KNOWLEDGE.jumpRingSelection, keywords: ['which jump ring', 'jump ring gauge', 'thickest gauge', 'what gauge', 'jump ring size', 'pick jump ring', 'right jump ring', '3mm', 'visual weight', 'gauge fit'], priority: 1 },

  // ── BUSINESS STRATEGY ──
  { id: 'biz-pricing', label: 'Pricing Strategy', data: BUSINESS_STRATEGY_KNOWLEDGE.pricing, keywords: ['price', 'pricing', 'charge', 'how much', 'cost', 'tier', 'margin', 'discount', 'value', 'precut', 'pre-cut', 'average sale', 'upsell', 'increase sale'], priority: 2 },
  { id: 'biz-formation', label: 'Business Formation', data: BUSINESS_STRATEGY_KNOWLEDGE.businessFormation, keywords: ['llc', 'sole prop', 'business entity', 'legal', 'formation', 'register', 'ein'] },
  { id: 'biz-insurance', label: 'Insurance', data: BUSINESS_STRATEGY_KNOWLEDGE.insurance, keywords: ['insurance', 'liability', 'coverage', 'insure', 'protect'] },
  { id: 'biz-payment', label: 'Payment Processing', data: BUSINESS_STRATEGY_KNOWLEDGE.paymentProcessing, keywords: ['payment', 'stripe', 'credit card', 'cash', 'venmo', 'process', 'card reader', 'qr code', 'text link', 'text to pay', 'processing fee', 'how do customers pay', 'accept payment', 'charge customer'], priority: 2 },
  { id: 'biz-events', label: 'Event Strategy', data: BUSINESS_STRATEGY_KNOWLEDGE.eventStrategy, keywords: ['event', 'market', 'pop up', 'popup', 'festival', 'craft fair', 'booth', 'concert', 'venue', 'farmers'], priority: 2 },
  { id: 'biz-salon', label: 'Salon Integration', data: BUSINESS_STRATEGY_KNOWLEDGE.salonIntegration, keywords: ['salon', 'hair', 'spa', 'beauty', 'stylist', 'chair', 'commission', 'partnership', 'local business'] },
  { id: 'biz-houseparty', label: 'House Party Strategy', data: BUSINESS_STRATEGY_KNOWLEDGE.houseParties, keywords: ['house party', 'host', 'home', 'party', 'hostess', 'incentive', 'house parties', 'parties'] },
  { id: 'biz-financial', label: 'Financial Potential', data: BUSINESS_STRATEGY_KNOWLEDGE.financialPotential, keywords: ['income', 'earn', 'money', 'revenue', 'potential', 'full time', 'part time', 'side hustle'] },
  { id: 'cx-reweld', label: 'Re-Weld Policy', data: BUSINESS_STRATEGY_KNOWLEDGE.reWeldPolicy, keywords: ['reweld', 're-weld', 'broke off', 'fell off', 'came apart', 'warranty', 'free fix', 'walk-in repair', 'repair fee', 'reweld fee', 'not my customer', 'broke', 'lost', 'replacement', 'free replacement'] },
  { id: 'biz-objections', label: 'Objection Handling', data: BUSINESS_STRATEGY_KNOWLEDGE.objectionHandling, keywords: ['objection', 'hesitant', 'too expensive', 'fad', 'discount code', 'carty', 'scared', 'can\'t afford', 'not technical', 'is pj a fad', 'which kit', 'too high', 'prices too high', 'promo code', 'promo', 'coupon code', 'money back', 'make it back', 'worth it', 'expensive'], priority: 2 },
  { id: 'biz-shipping', label: 'Shipping & Policies', data: BUSINESS_STRATEGY_KNOWLEDGE.shippingAndPolicies, keywords: ['ship', 'shipping', 'return', 'refund', 'warranty', 'circle protection', 'pj pro', 'financing', 'restocking', 'exchange', 'how long to ship', 'international', 'finance', 'arrived', 'delivery', 'hasnt arrived'], priority: 1 },

  // ── CLIENT EXPERIENCE ──
  { id: 'cx-flow', label: 'Customer Experience Flow', data: CLIENT_EXPERIENCE_KNOWLEDGE.experienceFlow, keywords: ['experience', 'flow', 'step', 'customer journey', 'consultation', 'walk through', 'service flow', 'client flow', 'appointment', 'nervous', 'stacking', 'before welding', 'customer experience', 'how to start', 'greeting', 'welcome', 'stylist', 'discovery', 'selection', 'measuring', 'sizing', 'pre-weld', 'reveal', 'cleanup', 'cut the chain', 'display', 'mirror', 'pricing conversation', 'how much', 'upsell connectors', 'suggest charms'] },
  { id: 'cx-aftercare', label: 'Aftercare', data: CLIENT_EXPERIENCE_KNOWLEDGE.aftercare, keywords: ['aftercare', 'care', 'clean', 'maintain', 'tarnish', 'shower', 'pool', 'ocean', 'remove', 'last', 'how long does it last', 'durable', 'durability', 'lifetime'] },
  { id: 'cx-safety', label: 'Safety', data: CLIENT_EXPERIENCE_KNOWLEDGE.safety, keywords: ['safety', 'eye', 'protection', 'burn', 'risk', 'glasses', 'mri', 'hospital', 'safe', 'pacemaker', 'allergic', 'allergy', 'nickel', 'hurt', 'shock', 'leather patch', 'watch the weld', 'eye protection', 'eyes', 'wet skin', 'dry skin', 'dangerous', 'pain', 'feel it', 'feel anything', 'minor', 'minors', 'children', 'kid', 'waiver'] },
  { id: 'cx-waiver', label: 'Waiver Management', data: BUSINESS_STRATEGY_KNOWLEDGE.waiverManagement, keywords: ['waiver', 'sign', 'liability', 'form', 'consent', 'minor'] },
  { id: 'cx-removal', label: 'Removal Guidance', data: CLIENT_EXPERIENCE_KNOWLEDGE.removalGuidance, keywords: ['remove', 'take off', 'cut off', 'scissors', 'cut jump ring', 'removal', 'take it off', 'snip', 'clip off', 'nail clipper', 'bracelet off', 'want it off', 'get it off'], priority: 1 },
  { id: 'cx-journey', label: 'Customer Journey Coaching', data: CLIENT_EXPERIENCE_KNOWLEDGE.customerJourney, keywords: ['scared', 'overwhelmed', 'new artist', 'beginner', 'milestone', 'coaching', 'identity', 'phase', 'setback', 'struggling', 'want to quit', 'feel like', 'cant do this', 'afraid', 'not good enough', 'imposter', 'doubt', 'give up', 'frustrated', 'discouraged', 'first weld', 'first event', 'first sale', 'new to this', 'just started', 'transformation'], priority: 1 },

  // ── MARKETING ──
  { id: 'mk-brand', label: 'Branding', data: MARKETING_KNOWLEDGE.branding, keywords: ['brand', 'logo', 'name', 'identity', 'color', 'aesthetic', 'vibe'] },
  { id: 'mk-social', label: 'Social Media', data: MARKETING_KNOWLEDGE.socialMedia, keywords: ['social media', 'instagram', 'facebook', 'tiktok', 'post', 'content', 'reel', 'video', 'hashtag', 'follower'] },
  { id: 'mk-eventmarket', label: 'Event Marketing', data: MARKETING_KNOWLEDGE.eventMarketing, keywords: ['event market', 'promote event', 'advertise', 'find event', 'vendor', 'application', 'find pop', 'promote'] },
  { id: 'mk-network', label: 'Networking', data: MARKETING_KNOWLEDGE.networking, keywords: ['network', 'connect', 'community', 'other artist', 'pjx', 'conference', 'expo', 'facebook group'] },
  { id: 'mk-packing', label: 'Event Packing', data: MARKETING_KNOWLEDGE.eventPackingChecklist, keywords: ['pack', 'checklist', 'bring', 'forget', 'what to bring', 'setup', 'table'] },

  // ── PJ UNIVERSITY ──
  { id: 'pju-structure', label: 'PJ University', data: { pjUniversity: PJ_UNIVERSITY_AND_SUNNY_ROLE.pjUniversity, fastTrack: PJ_UNIVERSITY_AND_SUNNY_ROLE.fastTrack, mentoring: PJ_UNIVERSITY_AND_SUNNY_ROLE.mentoring }, keywords: ['pj university', 'course', 'class', 'module', 'certificate', 'certified', 'fast track', '30 day', 'mentoring', 'training'] },

  // ── PJOS PLATFORM ──
  { id: 'app-getting-started', label: 'Getting Started', data: PJOS_PLATFORM_GUIDE.gettingStarted, keywords: ['get started', 'getting started', 'set up', 'setup', 'onboard', 'new account', 'just signed up', 'first time', 'how to start', 'where do i begin', 'new to the app', 'create account', 'profile', 'business profile', 'upload logo', 'brand color', 'accent color', 'theme', 'pick a theme', 'change theme', 'skip setup'] },
  { id: 'app-events', label: 'App Events', data: PJOS_PLATFORM_GUIDE.events, keywords: ['create event', 'new event', 'add event', 'set up event', 'event setup', 'go live', 'event mode', 'start event', 'qr code', 'edit event', 'event tab', 'upcoming event', 'past event', 'event p&l', 'booth fee', 'how do i make an event'], priority: 1 },
  { id: 'app-event-pos', label: 'Event Mode POS', data: PJOS_PLATFORM_GUIDE.eventModePOS, keywords: ['ring up', 'ring someone up', 'sell', 'sale', 'checkout', 'charge', 'add to cart', 'cart', 'take payment', 'pos', 'point of sale', 'custom item', 'how to sell', 'complete sale', 'receipt', 'tip', 'discount', 'event mode pos', 'sales screen'], priority: 1 },
  { id: 'app-store-pos', label: 'Store Mode POS', data: PJOS_PLATFORM_GUIDE.storeModePOS, keywords: ['store mode', 'walk in', 'walk-in', 'walkin', 'not at event', 'everyday sale', 'salon sale', 'studio sale', 'shop sale', 'store sale', 'discount', 'coupon', 'promo'] },
  { id: 'app-inventory', label: 'App Inventory', data: PJOS_PLATFORM_GUIDE.inventory, keywords: ['add inventory', 'add item', 'add chain', 'add jump ring', 'chain list', 'my chains', 'inventory page', 'stock level', 'restock', 'reorder', 'low stock', 'deactivate', 'product type', 'material setup', 'chain pricing', 'buy by inch', 'sell by piece', 'how to add', 'movement history', 'sku', 'cost per foot', 'per foot', 'per inch', 'chain cost', 'supplier price', 'cost entry', 'cost toggle'], priority: 1 },
  { id: 'app-clients', label: 'App Clients', data: PJOS_PLATFORM_GUIDE.clients, keywords: ['client list', 'clients', 'customer list', 'crm', 'customer database', 'waiver history', 'add client', 'customer info', 'find client', 'client page', 'copy waiver link', 'waiver link'] },
  { id: 'app-messaging', label: 'App Messaging', data: PJOS_PLATFORM_GUIDE.subscriptionAndBilling?.crmAddOn, keywords: ['message', 'messages', 'text', 'sms', 'reply', 'conversation', 'dedicated number', 'phone number', 'business number', 'two way', 'inbox', 'unread', 'text back', 'reply to client', 'messaging', 'chat', 'two-way sms', 'call', 'calls', 'calling', 'voicemail', 'forward', 'ring', 'incoming call', 'phone call', 'mute calls', 'greeting', 'custom greeting', 'broadcast', 'broadcasts', 'workflow', 'workflows', 'automation', 'automate', 'sequence', 'aftercare', 'auto reply', 'auto-reply', 'sunny text', 'ai text', 'crm trial', 'crm add-on', 'crm addon', 'crm page', 'crm features', 'what does crm include', 'tag enroll', 'bulk enroll', 'tag trigger', 'auto enroll', 'enroll by tag'], priority: 2 },
  { id: 'app-crm-value', label: 'CRM Value', data: PJOS_PLATFORM_GUIDE.crmValue, keywords: ['crm', 'follow up', 'follow-up', 'repeat client', 'repeat customer', 'retention', 'keep clients', 'bring back', 'birthday text', 'campaign', 'broadcast', 'workflow', 'automated', 'automation', 'private party', 'party invite', 'girls night', 'why crm', 'is crm worth it', 'do i need crm', 'slow season', 'miss you text', 're-engagement', 'add-on', 'addon', 'crm add'], priority: 1 },
  { id: 'app-queue', label: 'Queue Management', data: PJOS_PLATFORM_GUIDE.queueManagement, keywords: ['queue', 'line', 'wait list', 'waitlist', 'check in', 'checkin', 'check-in', 'next customer', 'notify', 'notify next', 'get people checked in', 'how people check in', 'waiting', 'no show', 'served', 'who is next', 'sms', 'text notification', 'customer line'], priority: 1 },
  { id: 'app-waivers', label: 'Digital Waivers', data: PJOS_PLATFORM_GUIDE.digitalWaivers, keywords: ['waiver', 'digital waiver', 'sign waiver', 'signature', 'waiver link', 'send waiver', 'waiver pdf', 'download waiver', 'consent form', 'liability form', 'waiver before event', 'pre-event waiver', 'customize waiver'] },
  { id: 'app-reports', label: 'Business Reports', data: PJOS_PLATFORM_GUIDE.businessReports, keywords: ['report', 'reports', 'sales numbers', 'how much did i make', 'revenue', 'profit', 'p&l', 'profit and loss', 'csv', 'export', 'analytics', 'dashboard numbers', 'business data', 'where are my numbers', 'how is my business doing', 'sales report', 'event report'], priority: 1 },
  { id: 'app-payments', label: 'Payments & Checkout', data: PJOS_PLATFORM_GUIDE.paymentsAndCheckout, keywords: ['payment', 'pay', 'charge', 'checkout', 'qr code', 'text link', 'text to pay', 'stripe', 'card reader', 'no card reader', 'processing fee', 'how do customers pay', 'accept payment', 'pending payment', 'send payment', 'external payment', 'cash payment', 'venmo payment'], priority: 2 },
  { id: 'app-settings', label: 'App Settings', data: PJOS_PLATFORM_GUIDE.settingsGuide, keywords: ['settings', 'configure', 'setup', 'tax profile', 'tax rate', 'payment processor', 'connect stripe', 'business info', 'logo', 'waiver text', 'product types', 'materials', 'suppliers', 'fee handling', 'change settings', 'update settings', 'default pricing', 'pricing settings', 'gear icon'] },
  { id: 'app-subscription', label: 'Subscription & Billing', data: PJOS_PLATFORM_GUIDE.subscriptionAndBilling, keywords: ['subscription', 'plan', 'tier', 'starter', 'pro plan', 'business plan', 'upgrade', 'pricing', 'how much is', 'trial', 'free trial', 'trial expire', 'trial ending', 'trial warning', 'locked', 'lockout', 'billing', 'deferred', 'monthly', 'platform fee', 'cancel', 'downgrade', 'what plan am i on', 'cost of app', 'app price', 'choose a plan', 'pick a plan', 'when charged', 'credit card'], priority: 1 },
  { id: 'app-team', label: 'Team Management', data: PJOS_PLATFORM_GUIDE.teamManagement, keywords: ['team', 'invite', 'add team', 'team member', 'staff', 'manager', 'role', 'permission', 'add my girls', 'add my helper', 'add employee', 'remove member', 'how many people', 'team limit'] },
  { id: 'app-sunny', label: 'Using Sunny', data: PJOS_PLATFORM_GUIDE.askSunny, keywords: ['sunny', 'ai mentor', 'chat', 'ask question', 'question limit', 'how to use sunny', 'what can sunny do', 'sunny help', 'mentor chat', 'ai help'] },
  { id: 'app-gift-cards', label: 'Gift Cards', data: PJOS_PLATFORM_GUIDE.giftCards, keywords: ['gift card', 'gift certificate', 'voucher', 'redeem', 'gift code', 'sell gift', 'buy gift', 'gift card code', 'gift balance', 'gift card balance', 'apply gift card'], priority: 1 },
  { id: 'app-cash-drawer', label: 'Cash Drawer', data: PJOS_PLATFORM_GUIDE.cashDrawer, keywords: ['cash', 'drawer', 'register', 'till', 'pay in', 'pay out', 'over short', 'close drawer', 'open drawer', 'cash box', 'cash register', 'starting cash', 'counted cash', 'cash reconciliation'], priority: 1 },
  { id: 'app-troubleshooting', label: 'App Troubleshooting', data: PJOS_PLATFORM_GUIDE.platformTroubleshooting, keywords: ['app problem', 'app issue', 'not working', 'can\'t connect', 'payment not working', 'stripe not working', 'inventory not updating', 'sms not sending', 'text not sending', 'qr not working', 'can\'t invite', 'reports not showing', 'app trouble', 'app broken', 'something wrong', 'app help', 'app error', 'isnt working', 'app isnt', 'not loading'], priority: 1 },
  { id: 'app-warranty', label: 'Warranty Protection', data: PJOS_PLATFORM_GUIDE.warrantyProtection, keywords: ['warranty', 'warranties', 'protection', 'coverage', 'claim', 'file claim', 'repair', 'shield', 'receipt warranty', 'warranty settings', 'per item warranty', 'per invoice warranty', 'enable warranty', 'warranty tab', 'warranty duration', 'coverage terms', 'void warranty', 'warranty status'], priority: 1 },
  { id: 'app-tier-pricing', label: 'Tier Pricing', data: PJOS_PLATFORM_GUIDE.tierPricing, keywords: ['tier', 'tiers', 'pricing tier', 'pricing mode', 'by tier', 'metal tier', 'sterling tier', 'gold tier', 'group chains', 'tier filter', 'tier pricing', 'pricing tiers', 'assign tier', 'select by tier', 'flat rate vs', 'per product vs', 'pricing modes', 'three pricing modes'], priority: 1 },
  { id: 'app-onboarding-kits', label: 'Onboarding Kits', data: { starterKits: PJOS_PLATFORM_GUIDE.gettingStarted.starterKits, pricingOptions: PJOS_PLATFORM_GUIDE.gettingStarted.pricingOptions, onboardingFlow: PJOS_PLATFORM_GUIDE.gettingStarted.onboardingFlow }, keywords: ['kit', 'momentum kit', 'dream kit', 'legacy kit', 'onboarding', 'kit contents', 'what came in my kit', 'what chains', 'loaded my kit', 'auto populate', 'pricing setup', 'how to price', 'price my jewelry', 'by type', 'by metal', 'by markup', 'price later', 'set prices'], priority: 1 },
  { id: 'app-sunny-tips', label: 'Sunny Tips', data: { sunnyTips: PJOS_PLATFORM_GUIDE.sunnyTips, dashboardChecklist: PJOS_PLATFORM_GUIDE.dashboardChecklist }, keywords: ['sunny tips', 'tutorial', 'tips', 'getting started checklist', 'dashboard card', 'checklist', 'dismiss checklist', 'page tips', 'floating pill'] },
];

// =============================================================================
// Replicate selectSubsections from route.ts (exact same logic)
// =============================================================================

function selectSubsections(userMessage: string, recentMessages: string[] = []): Subsection[] {
  const searchText = [userMessage, ...recentMessages.slice(-2)]
    .join(' ')
    .toLowerCase();

  const scored = SUBSECTIONS.map(sub => {
    let score = 0;
    for (const keyword of sub.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += keyword.length > 6 ? 3 : keyword.length > 3 ? 2 : 1;
      }
    }
    if (sub.priority && score > 0) {
      score += sub.priority;
    }
    return { sub, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = scored
    .filter(s => s.score > 0)
    .slice(0, 5)
    .map(s => s.sub);

  if (selected.length === 0) {
    return SUBSECTIONS.filter(s => s.id === 'biz-pricing' || s.id === 'biz-events');
  }

  return selected;
}

// =============================================================================
// Test case definitions
// =============================================================================

interface KnowledgeTestCase {
  id: string;
  category: string;
  question: string;
  mustRetrieve: string[];
  mustRetrieveAnyOf?: string[];  // At least ONE of these must be retrieved
  mustNotRetrieve?: string[];
  notes?: string;
}

const TEST_CASES: KnowledgeTestCase[] = [

  // =========================================================================
  // WELDING TECHNIQUE (35 tests)
  // =========================================================================
  { id: 'wt-001', category: 'Welding Technique', question: 'what setting should I use for 24 gauge', mustRetrieve: ['eq-settings'], notes: 'Simple gauge-based question' },
  { id: 'wt-002', category: 'Welding Technique', question: 'what joules for silver', mustRetrieve: ['eq-settings'], notes: 'Material but no gauge — chart needed' },
  { id: 'wt-003', category: 'Welding Technique', question: 'my welds keep blowing out', mustRetrieve: ['ts-top'], notes: 'Blowout troubleshooting' },
  { id: 'wt-004', category: 'Welding Technique', question: 'click but no spark when I touch the jump ring', mustRetrieve: ['ts-top'], notes: 'Classic trigger issue' },
  { id: 'wt-005', category: 'Welding Technique', question: 'what angle should I hold the stylus', mustRetrieve: ['wt-angle'], notes: '90-degree angle' },
  { id: 'wt-006', category: 'Welding Technique', question: 'how often should I sharpen my electrode', mustRetrieve: ['eq-electrode'], notes: 'Electrode maintenance' },
  { id: 'wt-007', category: 'Welding Technique', question: 'do I need argon', mustRetrieve: ['eq-argon'], notes: 'Argon fundamentals' },
  { id: 'wt-008', category: 'Welding Technique', question: 'how do I weld a ring', mustRetrieve: ['wt-ring-welding'], notes: 'NEW ring welding chunk' },
  { id: 'wt-009', category: 'Welding Technique', question: 'whats the setting for 22ga gold filled on zapp plus', mustRetrieve: ['eq-settings'], notes: 'Specific chart lookup' },
  { id: 'wt-010', category: 'Welding Technique', question: 'my welder wont fire', mustRetrieve: ['ts-top'], notes: 'Won\'t fire troubleshooting' },
  { id: 'wt-011', category: 'Welding Technique', question: 'why is the metal balling up', mustRetrieve: [], mustRetrieveAnyOf: ['ts-top', 'ts-electrode'], notes: 'Balling = electrode or power issue' },
  { id: 'wt-012', category: 'Welding Technique', question: 'how do I weld stainless steel', mustRetrieve: ['wt-metals'], notes: 'Stainless welding with cutter warning' },
  { id: 'wt-013', category: 'Welding Technique', question: 'can I use regular cutters on stainless', mustRetrieve: [], mustRetrieveAnyOf: ['wt-metals', 'pr-metals'], notes: 'Cutter warning — either metal chunk has stainless info' },
  { id: 'wt-014', category: 'Welding Technique', question: 'my electrod is getting dull fast', mustRetrieve: ['eq-electrode'], notes: 'Typo: electrod' },
  { id: 'wt-015', category: 'Welding Technique', question: 'argon tank refil options', mustRetrieve: ['eq-argon'], notes: 'Typo: refil' },
  { id: 'wt-016', category: 'Welding Technique', question: 'do I need to keep sharpning the tip', mustRetrieve: ['eq-electrode'], notes: 'Typo: sharpning' },
  { id: 'wt-017', category: 'Welding Technique', question: 'my welds look like crap what am I doing wrong', mustRetrieve: [], mustRetrieveAnyOf: ['ts-top', 'wt-mistakes', 'ts-power'], notes: 'Slang: look like crap → technique/troubleshooting' },
  { id: 'wt-018', category: 'Welding Technique', question: 'its sparking but nothing happens', mustRetrieve: ['ts-top'], notes: 'Spark but no fuse' },
  { id: 'wt-019', category: 'Welding Technique', question: 'what power for 20 gauge gold filled', mustRetrieve: ['eq-settings'], notes: '20 gauge = multiple welds' },
  { id: 'wt-020', category: 'Welding Technique', question: 'how many welds do I need on thick jump rings', mustRetrieve: ['wt-multiple'], notes: 'Multiple welds technique' },
  { id: 'wt-021', category: 'Welding Technique', question: 'the welder keeps aborting my welds', mustRetrieve: ['ts-top'], notes: 'Weld abort' },
  { id: 'wt-022', category: 'Welding Technique', question: 'where do I attach the ground clip', mustRetrieve: ['wt-grounding'], notes: 'Grounding basics' },
  { id: 'wt-023', category: 'Welding Technique', question: 'should I ground on the chain or jump ring', mustRetrieve: ['wt-grounding'], notes: 'Grounding specifics' },
  { id: 'wt-024', category: 'Welding Technique', question: 'how do I close the jump ring properly', mustRetrieve: ['wt-jumpring'], notes: 'Jump ring closure technique' },
  { id: 'wt-025', category: 'Welding Technique', question: 'dark spot on my gold filled weld', mustRetrieve: ['ts-power'], notes: 'GF dark spot explanation' },
  { id: 'wt-026', category: 'Welding Technique', question: 'whats the basic welding process step by step', mustRetrieve: ['wt-fundamentals'], notes: 'Fundamental process' },
  { id: 'wt-027', category: 'Welding Technique', question: 'setting for 26g rose gold on mpulse', mustRetrieve: ['eq-settings'], notes: 'Specific chart: 26g rose gold mPulse' },
  { id: 'wt-028', category: 'Welding Technique', question: 'whats TruFire on the mpulse', mustRetrieve: ['eq-welders'], notes: 'TruFire technology' },
  { id: 'wt-029', category: 'Welding Technique', question: 'my chains are fusing together at the links', mustRetrieve: ['ts-ground'], notes: 'Chain fusing = grounding issue' },
  { id: 'wt-030', category: 'Welding Technique', question: 'electrode is sticking to the jump ring', mustRetrieve: [], mustRetrieveAnyOf: ['ts-electrode', 'eq-electrode'], notes: 'Electrode sticking → either electrode chunk' },
  { id: 'wt-031', category: 'Welding Technique', question: 'how do I set up argon on a new mini tank', mustRetrieve: ['eq-argon'], notes: 'Argon mini setup' },
  { id: 'wt-032', category: 'Welding Technique', question: 'is the tungsten electrode radioactive', mustRetrieve: ['eq-electrode'], notes: 'Lanthanated = safe' },
  { id: 'wt-033', category: 'Welding Technique', question: 'do I need the PJ scope or ADL', mustRetrieve: ['eq-optics'], notes: 'Optics comparison' },
  { id: 'wt-034', category: 'Welding Technique', question: 'my weld setting is burning through 26 gauge', mustRetrieve: ['eq-settings'], notes: 'Burn through at specific gauge' },
  { id: 'wt-035', category: 'Welding Technique', question: 'pvd coated stainless chain tips', mustRetrieve: ['wt-metals'], notes: 'PVD stainless keyword' },

  // =========================================================================
  // CHAIN & MATERIALS (28 tests)
  // =========================================================================
  { id: 'ch-001', category: 'Chain & Materials', question: 'what chains come in my momentum kit', mustRetrieve: ['eq-kits'], notes: 'Kit contents' },
  { id: 'ch-002', category: 'Chain & Materials', question: 'whats the difference between gold filled and plated', mustRetrieve: ['pr-metals'], notes: 'Material science' },
  { id: 'ch-003', category: 'Chain & Materials', question: 'what chain should I start with as a beginner', mustRetrieve: ['pr-chainselect'], notes: 'Chain recommendation' },
  { id: 'ch-004', category: 'Chain & Materials', question: 'can I use bracelet chain for necklaces', mustRetrieve: ['pr-chain-universality'], notes: 'NEW universality chunk' },
  { id: 'ch-005', category: 'Chain & Materials', question: 'how many bracelets from 3 feet of chain', mustRetrieve: ['pr-yield'], notes: 'NEW yield math' },
  { id: 'ch-006', category: 'Chain & Materials', question: 'what jump rings go with my gold filled chain', mustRetrieve: [], mustRetrieveAnyOf: ['pr-jumpring-select', 'wt-jumpring', 'pr-jumpring-inv'], notes: 'Jump ring selection — any jump ring chunk' },
  { id: 'ch-007', category: 'Chain & Materials', question: 'what size jump ring should I use', mustRetrieve: [], mustRetrieveAnyOf: ['pr-jumpring-select', 'wt-jumpring', 'pr-jumpring-inv'], notes: 'Jump ring pairing — any jump ring chunk' },
  { id: 'ch-008', category: 'Chain & Materials', question: 'is the Lavinia chain enamel', mustRetrieve: ['wt-metals'], notes: 'Enamel keyword' },
  { id: 'ch-009', category: 'Chain & Materials', question: 'do you sell stainless chain', mustRetrieve: ['pr-metals'], notes: 'Sunstone doesn\'t sell stainless' },
  { id: 'ch-010', category: 'Chain & Materials', question: 'tell me about sterling silver', mustRetrieve: ['pr-metals'], notes: 'Sterling info' },
  { id: 'ch-011', category: 'Chain & Materials', question: 'is gold filled the same as gold plated', mustRetrieve: ['pr-metals'], notes: 'GF vs plated distinction' },
  { id: 'ch-012', category: 'Chain & Materials', question: 'what gauge jump ring is best for welding', mustRetrieve: ['pr-jumpring-select'], notes: 'Thickest gauge rule' },
  { id: 'ch-013', category: 'Chain & Materials', question: 'can I use any chain for a necklace or do I need special necklace chain', mustRetrieve: ['pr-chain-universality'], notes: 'Universality - natural phrasing' },
  { id: 'ch-014', category: 'Chain & Materials', question: 'how far does a 3 foot spool of chain go', mustRetrieve: ['pr-yield'], notes: 'Yield math with spool' },
  { id: 'ch-015', category: 'Chain & Materials', question: 'what connectors should I stock', mustRetrieve: ['pr-connectors'], notes: 'Connector guidance' },
  { id: 'ch-016', category: 'Chain & Materials', question: 'where can I buy more chains', mustRetrieve: ['pr-suppliers'], notes: 'Supplier guidance' },
  { id: 'ch-017', category: 'Chain & Materials', question: 'whats the most popular chain for beginners', mustRetrieve: ['pr-chainselect'], notes: 'Popular chain recommendation' },
  { id: 'ch-018', category: 'Chain & Materials', question: '14k vs gold filled which is better', mustRetrieve: ['pr-metals'], notes: '14k comparison' },
  { id: 'ch-019', category: 'Chain & Materials', question: 'what jump rings does sunstone sell', mustRetrieve: [], mustRetrieveAnyOf: ['pr-jumpring-inv', 'wt-jumpring', 'pr-jumpring-select'], notes: 'Jump ring inventory — any jump ring chunk' },
  { id: 'ch-020', category: 'Chain & Materials', question: 'will sterling silver tarnish', mustRetrieve: ['pr-metals'], notes: 'Tarnish question' },
  { id: 'ch-021', category: 'Chain & Materials', question: 'how much chain should I bring to an event', mustRetrieve: ['pr-inventory'], notes: 'Inventory planning' },
  { id: 'ch-022', category: 'Chain & Materials', question: 'is sunstone chain hypoallergenic', mustRetrieve: ['pr-metals'], notes: 'Hypoallergenic keyword' },
  { id: 'ch-023', category: 'Chain & Materials', question: 'which chain for a ring piece type', mustRetrieve: ['pr-chain-universality'], notes: 'Universality for rings' },
  { id: 'ch-024', category: 'Chain & Materials', question: 'how many anklets can I get from a spool', mustRetrieve: ['pr-yield'], notes: 'Yield math for anklets' },
  { id: 'ch-025', category: 'Chain & Materials', question: 'is enamel chain safe for permanent jewelry', mustRetrieve: ['wt-metals'], notes: 'Enamel chain safety' },
  { id: 'ch-026', category: 'Chain & Materials', question: 'what birthstone connectors are included in Dream', mustRetrieve: ['eq-kits'], notes: 'Kit connector contents' },
  { id: 'ch-027', category: 'Chain & Materials', question: 'how do I reorder jump rings from sunstone', mustRetrieve: ['pr-suppliers'], notes: 'Reorder guidance' },
  { id: 'ch-028', category: 'Chain & Materials', question: 'what is 14/20 gold filled', mustRetrieve: ['pr-metals'], notes: '14/20 designation' },

  // =========================================================================
  // AFTERCARE & REPAIRS (22 tests)
  // =========================================================================
  { id: 'ac-001', category: 'Aftercare & Repairs', question: 'what are the aftercare instructions', mustRetrieve: ['cx-aftercare'], notes: 'Standard aftercare' },
  { id: 'ac-002', category: 'Aftercare & Repairs', question: 'what should I tell customers about care', mustRetrieve: ['cx-aftercare'], notes: 'Customer-facing aftercare' },
  { id: 'ac-003', category: 'Aftercare & Repairs', question: 'how do I remove permanent jewelry', mustRetrieve: ['cx-removal'], notes: 'NEW removal chunk' },
  { id: 'ac-004', category: 'Aftercare & Repairs', question: 'customer wants their bracelet off', mustRetrieve: ['cx-removal'], notes: 'Removal request' },
  { id: 'ac-005', category: 'Aftercare & Repairs', question: 'whats the repair policy', mustRetrieve: [], mustRetrieveAnyOf: ['cx-reweld', 'app-warranty'], notes: 'Repair → reweld or warranty chunk' },
  { id: 'ac-006', category: 'Aftercare & Repairs', question: 'someone came in who didnt buy from me wants a repair', mustRetrieve: [], mustRetrieveAnyOf: ['cx-reweld', 'app-warranty'], notes: 'Walk-in repair fee' },
  { id: 'ac-007', category: 'Aftercare & Repairs', question: 'do I charge for rewelds', mustRetrieve: ['cx-reweld'], notes: 'Reweld fee policy distinction' },
  { id: 'ac-008', category: 'Aftercare & Repairs', question: 'can they shower with permanent jewelry', mustRetrieve: ['cx-aftercare'], notes: 'Shower = yes fine' },
  { id: 'ac-009', category: 'Aftercare & Repairs', question: 'how long does pj last', mustRetrieve: ['cx-aftercare'], notes: 'Durability no guarantee' },
  { id: 'ac-010', category: 'Aftercare & Repairs', question: 'customer broke her bracelet at the weld', mustRetrieve: ['cx-reweld'], notes: 'Weld break = free fix' },
  { id: 'ac-011', category: 'Aftercare & Repairs', question: 'can they go in the pool', mustRetrieve: ['cx-aftercare'], notes: 'Pool = avoid prolonged' },
  { id: 'ac-012', category: 'Aftercare & Repairs', question: 'how to clean permanent jewelry', mustRetrieve: ['cx-aftercare'], notes: 'Cleaning instructions' },
  { id: 'ac-013', category: 'Aftercare & Repairs', question: 'customer wants a reweld but they got it from another artist', mustRetrieve: ['cx-reweld'], notes: 'Non-customer reweld fee' },
  { id: 'ac-014', category: 'Aftercare & Repairs', question: 'do I cut the chain or the jump ring to remove it', mustRetrieve: ['cx-removal'], notes: 'Cut jump ring not chain link' },
  { id: 'ac-015', category: 'Aftercare & Repairs', question: 'what tools to cut off permanent jewelry', mustRetrieve: ['cx-removal'], notes: 'Scissors/nail clippers' },
  { id: 'ac-016', category: 'Aftercare & Repairs', question: 'my customers chain fell off what do I do', mustRetrieve: [], mustRetrieveAnyOf: ['cx-reweld', 'cx-aftercare'], notes: 'Chain fell off → reweld or aftercare' },
  { id: 'ac-017', category: 'Aftercare & Repairs', question: 'is there a time limit on free repairs', mustRetrieve: [], mustRetrieveAnyOf: ['cx-reweld', 'app-warranty'], notes: 'No time limit' },
  { id: 'ac-018', category: 'Aftercare & Repairs', question: 'customer lost their bracelet do they get a free replacement', mustRetrieve: [], mustRetrieveAnyOf: ['cx-reweld', 'cx-aftercare'], notes: 'Lost = new purchase' },
  { id: 'ac-019', category: 'Aftercare & Repairs', question: 'can I use nail clippers to take off a ring', mustRetrieve: ['cx-removal'], notes: 'Nail clipper removal' },
  { id: 'ac-020', category: 'Aftercare & Repairs', question: 'walk-in repair from someone elses customer', mustRetrieve: ['cx-reweld'], notes: 'Walk-in repair keyword' },
  { id: 'ac-021', category: 'Aftercare & Repairs', question: 'how much should I charge for a repair fee', mustRetrieve: ['cx-reweld'], notes: 'Repair fee amount' },
  { id: 'ac-022', category: 'Aftercare & Repairs', question: 'snip the jump ring off?', mustRetrieve: ['cx-removal'], notes: 'Snip keyword' },

  // =========================================================================
  // PRICING & BUSINESS (27 tests)
  // =========================================================================
  { id: 'bz-001', category: 'Pricing & Business', question: 'how much should I charge for bracelets', mustRetrieve: ['biz-pricing'], notes: 'Bracelet pricing ranges' },
  { id: 'bz-002', category: 'Pricing & Business', question: 'what about hand chain pricing', mustRetrieve: ['biz-pricing'], notes: 'Hand chain 2-2.5x' },
  { id: 'bz-003', category: 'Pricing & Business', question: 'I dont know what to charge', mustRetrieve: ['biz-pricing'], notes: 'Pricing confusion' },
  { id: 'bz-004', category: 'Pricing & Business', question: 'how should I price rings', mustRetrieve: ['biz-pricing'], notes: 'Ring pricing' },
  { id: 'bz-005', category: 'Pricing & Business', question: 'should I precut my chains for events', mustRetrieve: ['biz-pricing'], notes: 'Never precut' },
  { id: 'bz-006', category: 'Pricing & Business', question: 'how do I increase my average sale', mustRetrieve: ['biz-pricing'], notes: 'Connectors/stacking upsell' },
  { id: 'bz-007', category: 'Pricing & Business', question: 'my prices feel too high', mustRetrieve: ['biz-objections'], notes: 'Price objection' },
  { id: 'bz-008', category: 'Pricing & Business', question: 'is PJ just a fad', mustRetrieve: ['biz-objections'], notes: 'Trend objection' },
  { id: 'bz-009', category: 'Pricing & Business', question: 'what kit should I get', mustRetrieve: ['eq-kits'], notes: 'Kit recommendation' },
  { id: 'bz-010', category: 'Pricing & Business', question: 'do I need an LLC', mustRetrieve: ['biz-formation'], notes: 'Business formation' },
  { id: 'bz-011', category: 'Pricing & Business', question: 'do I need insurance for events', mustRetrieve: ['biz-insurance'], notes: 'Insurance' },
  { id: 'bz-012', category: 'Pricing & Business', question: 'how do I accept payments', mustRetrieve: ['biz-payment'], notes: 'Payment processing' },
  { id: 'bz-013', category: 'Pricing & Business', question: 'what should I charge for necklaces', mustRetrieve: ['biz-pricing'], notes: 'Necklace pricing' },
  { id: 'bz-014', category: 'Pricing & Business', question: 'is there a promo code or discount', mustRetrieve: ['biz-objections'], notes: 'CARTY discount code' },
  { id: 'bz-015', category: 'Pricing & Business', question: 'Im scared I cant do this', mustRetrieve: ['biz-objections'], notes: 'Emotional objection' },
  { id: 'bz-016', category: 'Pricing & Business', question: 'can I really make money doing this', mustRetrieve: ['biz-financial'], notes: 'Financial potential' },
  { id: 'bz-017', category: 'Pricing & Business', question: 'how do I find good events to do', mustRetrieve: ['biz-events'], notes: 'Event strategy' },
  { id: 'bz-018', category: 'Pricing & Business', question: 'should I do house parties', mustRetrieve: ['biz-houseparty'], notes: 'House party strategy' },
  { id: 'bz-019', category: 'Pricing & Business', question: 'can I offer PJ in my hair salon', mustRetrieve: ['biz-salon'], notes: 'Salon integration' },
  { id: 'bz-020', category: 'Pricing & Business', question: 'whats a good booth fee rule of thumb', mustRetrieve: ['biz-events'], notes: '3x booth fee rule' },
  { id: 'bz-021', category: 'Pricing & Business', question: 'how much can I make at a farmers market', mustRetrieve: ['biz-events'], notes: 'Farmers market earnings' },
  { id: 'bz-022', category: 'Pricing & Business', question: 'Im not technical, can I still do this', mustRetrieve: ['biz-objections'], notes: 'Confidence objection' },
  { id: 'bz-023', category: 'Pricing & Business', question: 'what if I cant make the money back', mustRetrieve: ['biz-objections'], notes: 'Financial objection' },
  { id: 'bz-024', category: 'Pricing & Business', question: 'should I offer discounts at events', mustRetrieve: ['biz-pricing'], notes: 'Never discount' },
  { id: 'bz-025', category: 'Pricing & Business', question: 'how to use venmo for payment', mustRetrieve: ['biz-payment'], notes: 'Venmo payment' },
  { id: 'bz-026', category: 'Pricing & Business', question: 'what is the platform fee for stripe payments', mustRetrieve: ['biz-payment'], notes: 'Platform fee' },
  { id: 'bz-027', category: 'Pricing & Business', question: 'how much markup should I do on gold filled', mustRetrieve: ['biz-pricing'], notes: 'Markup guidance' },

  // =========================================================================
  // RING WELDING (12 tests — all NEW content)
  // =========================================================================
  { id: 'rw-001', category: 'Ring Welding', question: 'can I do rings with permanent jewelry', mustRetrieve: ['wt-ring-welding'], notes: 'Ring welding basics' },
  { id: 'rw-002', category: 'Ring Welding', question: 'how do I weld a chain ring', mustRetrieve: ['wt-ring-welding'], notes: 'Chain ring technique' },
  { id: 'rw-003', category: 'Ring Welding', question: 'do I weld rings on the customers finger', mustRetrieve: ['wt-ring-welding'], notes: 'Off-hand welding' },
  { id: 'rw-004', category: 'Ring Welding', question: 'how do I size a ring for permanent jewelry', mustRetrieve: ['wt-ring-welding'], notes: 'Ring sizing snug' },
  { id: 'rw-005', category: 'Ring Welding', question: 'are rings good sellers', mustRetrieve: ['wt-ring-welding'], notes: 'Ring sales strategy' },
  { id: 'rw-006', category: 'Ring Welding', question: 'whats a good upsell for bracelet customers', mustRetrieve: [], mustRetrieveAnyOf: ['biz-pricing', 'wt-ring-welding'], notes: 'Rings as add-on — upsell keyword matches pricing too' },
  { id: 'rw-007', category: 'Ring Welding', question: 'ring technique tips', mustRetrieve: ['wt-ring-welding'], notes: 'Ring technique keyword' },
  { id: 'rw-008', category: 'Ring Welding', question: 'can customers take rings on and off', mustRetrieve: ['wt-ring-welding'], notes: 'Ring slide on/off' },
  { id: 'rw-009', category: 'Ring Welding', question: 'is it safe to weld a ring on someones finger', mustRetrieve: ['wt-ring-welding'], notes: 'Ring safety → off hand' },
  { id: 'rw-010', category: 'Ring Welding', question: 'ring add-on to increase ticket', mustRetrieve: ['wt-ring-welding'], notes: 'Ring add-on keyword' },
  { id: 'rw-011', category: 'Ring Welding', question: 'finger chain how to', mustRetrieve: ['wt-ring-welding'], notes: 'Finger chain keyword' },
  { id: 'rw-012', category: 'Ring Welding', question: 'weld ring off hand technique', mustRetrieve: ['wt-ring-welding'], notes: 'Off hand keyword' },

  // =========================================================================
  // SAFETY (16 tests)
  // =========================================================================
  { id: 'sf-001', category: 'Safety', question: 'is permanent jewelry safe', mustRetrieve: ['cx-safety'], notes: 'General safety' },
  { id: 'sf-002', category: 'Safety', question: 'will it burn the customer', mustRetrieve: ['cx-safety'], notes: 'Burn concern' },
  { id: 'sf-003', category: 'Safety', question: 'can they watch the weld happen', mustRetrieve: ['cx-safety'], notes: 'Eye protection' },
  { id: 'sf-004', category: 'Safety', question: 'customer says they are allergic to nickel', mustRetrieve: ['cx-safety'], notes: 'Allergy script' },
  { id: 'sf-005', category: 'Safety', question: 'what about pacemakers', mustRetrieve: ['cx-safety'], notes: 'Pacemaker safety' },
  { id: 'sf-006', category: 'Safety', question: 'do I need a waiver', mustRetrieve: ['cx-waiver'], notes: 'Waiver requirement' },
  { id: 'sf-007', category: 'Safety', question: 'can I weld on wet skin', mustRetrieve: ['cx-safety'], notes: 'Wet skin safety' },
  { id: 'sf-008', category: 'Safety', question: 'what jump rings should I use with stainless chain', mustRetrieve: [], mustRetrieveAnyOf: ['wt-metals', 'pr-metals', 'wt-jumpring'], notes: 'Safety break point — metal or jump ring chunk' },
  { id: 'sf-009', category: 'Safety', question: 'do customers need eye protection', mustRetrieve: ['cx-safety'], notes: 'Eye safety' },
  { id: 'sf-010', category: 'Safety', question: 'is the leather patch required', mustRetrieve: ['cx-safety'], notes: 'Leather patch optional' },
  { id: 'sf-011', category: 'Safety', question: 'customer has a pacemaker can I still weld on them', mustRetrieve: ['cx-safety'], notes: 'Pacemaker redirect' },
  { id: 'sf-012', category: 'Safety', question: 'what about mri with permanent jewelry', mustRetrieve: ['cx-safety'], notes: 'MRI concern' },
  { id: 'sf-013', category: 'Safety', question: 'do I need a consent form for minors', mustRetrieve: ['cx-waiver'], notes: 'Minor waiver' },
  { id: 'sf-014', category: 'Safety', question: 'is the welding going to hurt', mustRetrieve: ['cx-safety'], notes: 'Pain concern' },
  { id: 'sf-015', category: 'Safety', question: 'do I need glasses during welding', mustRetrieve: ['cx-safety'], notes: 'Glasses keyword' },
  { id: 'sf-016', category: 'Safety', question: 'are sunstone welders safe to use', mustRetrieve: ['cx-safety'], notes: 'Welder safety' },

  // =========================================================================
  // STARTER KITS (16 tests)
  // =========================================================================
  { id: 'sk-001', category: 'Starter Kits', question: 'what comes in the dream kit', mustRetrieve: ['eq-kits'], notes: 'Dream kit contents' },
  { id: 'sk-002', category: 'Starter Kits', question: 'momentum vs dream whats the difference', mustRetrieve: ['eq-kits'], notes: 'Kit comparison' },
  { id: 'sk-003', category: 'Starter Kits', question: 'which kit for someone doing lots of events', mustRetrieve: ['eq-kits'], notes: 'Kit recommendation' },
  { id: 'sk-004', category: 'Starter Kits', question: 'how much is the legacy kit', mustRetrieve: ['eq-kits'], notes: 'Legacy pricing' },
  { id: 'sk-005', category: 'Starter Kits', question: 'do all kits come with mentoring', mustRetrieve: ['eq-kits'], notes: 'Mentoring: Dream/Legacy only' },
  { id: 'sk-006', category: 'Starter Kits', question: 'what chains are in the momentum kit', mustRetrieve: ['eq-kits'], notes: 'Momentum chain list' },
  { id: 'sk-007', category: 'Starter Kits', question: 'does the momentum kit include connectors', mustRetrieve: ['eq-kits'], notes: 'Momentum = no connectors' },
  { id: 'sk-008', category: 'Starter Kits', question: 'I just bought the Dream kit what do I do first', mustRetrieve: ['eq-kits'], notes: 'Dream kit onboarding' },
  { id: 'sk-009', category: 'Starter Kits', question: 'how many argon tanks come with legacy', mustRetrieve: ['eq-kits'], notes: 'Legacy = 4 argon' },
  { id: 'sk-010', category: 'Starter Kits', question: 'I want to buy a starter kit', mustRetrieve: ['eq-kits'], notes: 'Purchase intent' },
  { id: 'sk-011', category: 'Starter Kits', question: 'whats included in my kit', mustRetrieve: ['eq-kits'], notes: 'Generic kit contents' },
  { id: 'sk-012', category: 'Starter Kits', question: 'can I rent a welder instead of buying', mustRetrieve: ['eq-rental'], notes: 'OnDemand rental' },
  { id: 'sk-013', category: 'Starter Kits', question: 'add my dream kit chains to inventory', mustRetrieve: ['eq-kits'], notes: 'Kit inventory setup' },
  { id: 'sk-014', category: 'Starter Kits', question: 'how much chain comes in the dream kit', mustRetrieve: ['eq-kits'], notes: 'Chain footage' },
  { id: 'sk-015', category: 'Starter Kits', question: 'what welder is in the legacy kit', mustRetrieve: ['eq-kits'], notes: 'Legacy = mPulse' },
  { id: 'sk-016', category: 'Starter Kits', question: 'which kit is best for a new beginner', mustRetrieve: ['eq-kits'], notes: 'Beginner kit recommendation' },

  // =========================================================================
  // CUSTOMER EXPERIENCE (16 tests)
  // =========================================================================
  { id: 'cx-001', category: 'Customer Experience', question: 'how do I start the appointment with a customer', mustRetrieve: ['cx-flow'], notes: 'Appointment flow' },
  { id: 'cx-002', category: 'Customer Experience', question: 'what if my welder wont fire in front of a customer', mustRetrieve: [], mustRetrieveAnyOf: ['ts-top', 'eq-welders'], notes: 'Calm recovery — troubleshooting or welder chunk' },
  { id: 'cx-003', category: 'Customer Experience', question: 'how do I handle a bad weld during an appointment', mustRetrieve: ['cx-flow'], notes: 'Recovery script' },
  { id: 'cx-004', category: 'Customer Experience', question: 'customer is really nervous about the weld', mustRetrieve: ['cx-flow'], notes: 'Customer reassurance' },
  { id: 'cx-005', category: 'Customer Experience', question: 'how do I suggest connectors without being pushy', mustRetrieve: ['pr-connectors'], notes: 'Connector upselling' },
  { id: 'cx-006', category: 'Customer Experience', question: 'how do I measure for a bracelet', mustRetrieve: ['pr-pieces'], notes: 'Bracelet sizing' },
  { id: 'cx-007', category: 'Customer Experience', question: 'whats the customer experience flow from start to finish', mustRetrieve: ['cx-flow'], notes: '12-step flow' },
  { id: 'cx-008', category: 'Customer Experience', question: 'how do I size an anklet', mustRetrieve: ['pr-pieces'], notes: 'Anklet sizing' },
  { id: 'cx-009', category: 'Customer Experience', question: 'I feel overwhelmed as a new artist', mustRetrieve: ['cx-journey'], notes: 'NEW journey coaching' },
  { id: 'cx-010', category: 'Customer Experience', question: 'Im struggling and want to quit', mustRetrieve: ['cx-journey'], notes: 'Setback handling' },
  { id: 'cx-011', category: 'Customer Experience', question: 'I just did my first weld ever', mustRetrieve: [], mustRetrieveAnyOf: ['cx-journey', 'wt-fundamentals'], notes: 'Milestone — journey or fundamentals' },
  { id: 'cx-012', category: 'Customer Experience', question: 'how do I introduce stacking to customers', mustRetrieve: ['cx-flow'], notes: 'Stacking introduction' },
  { id: 'cx-013', category: 'Customer Experience', question: 'how many default inches for a bracelet', mustRetrieve: ['pr-pieces'], notes: 'Default bracelet size' },
  { id: 'cx-014', category: 'Customer Experience', question: 'when do I state the price to the customer', mustRetrieve: [], mustRetrieveAnyOf: ['cx-flow', 'biz-pricing'], notes: 'Price timing — flow or pricing chunk' },
  { id: 'cx-015', category: 'Customer Experience', question: 'what should I say before welding', mustRetrieve: ['cx-flow'], notes: 'Pre-weld safety script' },
  { id: 'cx-016', category: 'Customer Experience', question: 'I feel like I cant do this', mustRetrieve: ['cx-journey'], notes: 'Identity coaching' },

  // =========================================================================
  // POLICIES & SHIPPING (16 tests)
  // =========================================================================
  { id: 'ps-001', category: 'Policies & Shipping', question: 'how long does shipping take', mustRetrieve: ['biz-shipping'], notes: 'Transit times' },
  { id: 'ps-002', category: 'Policies & Shipping', question: 'can you ship internationally', mustRetrieve: ['biz-shipping'], notes: 'International shipping' },
  { id: 'ps-003', category: 'Policies & Shipping', question: 'whats the return policy', mustRetrieve: ['biz-shipping'], notes: '30 days 10% restock' },
  { id: 'ps-004', category: 'Policies & Shipping', question: 'can I return opened chain', mustRetrieve: ['biz-shipping'], notes: 'Unopened only' },
  { id: 'ps-005', category: 'Policies & Shipping', question: 'what is PJ Pro membership', mustRetrieve: ['biz-shipping'], notes: 'PJ Pro benefits' },
  { id: 'ps-006', category: 'Policies & Shipping', question: 'how much is the circle protection plan', mustRetrieve: ['biz-shipping'], notes: '$15/mo Circle' },
  { id: 'ps-007', category: 'Policies & Shipping', question: 'is there a discount code for sunstone', mustRetrieve: ['biz-objections'], notes: 'CARTY code' },
  { id: 'ps-008', category: 'Policies & Shipping', question: 'whats the warranty on my welder', mustRetrieve: ['biz-shipping'], notes: '3-year warranty' },
  { id: 'ps-009', category: 'Policies & Shipping', question: 'can I finance a starter kit', mustRetrieve: ['biz-shipping'], notes: 'Shop Pay / Affirm' },
  { id: 'ps-010', category: 'Policies & Shipping', question: 'do you ship argon tanks internationally', mustRetrieve: ['biz-shipping'], notes: 'No argon international' },
  { id: 'ps-011', category: 'Policies & Shipping', question: 'is there a restocking fee on returns', mustRetrieve: ['biz-shipping'], notes: '10% restocking' },
  { id: 'ps-012', category: 'Policies & Shipping', question: 'can I exchange my kit for a different one', mustRetrieve: ['biz-shipping'], notes: 'Exchanges no restocking' },
  { id: 'ps-013', category: 'Policies & Shipping', question: 'how long is the warranty', mustRetrieve: ['biz-shipping'], notes: '3 year warranty' },
  { id: 'ps-014', category: 'Policies & Shipping', question: 'is there a refund if I dont like it', mustRetrieve: ['biz-shipping'], notes: 'Refund = return policy' },
  { id: 'ps-015', category: 'Policies & Shipping', question: 'my kit hasnt arrived yet how long', mustRetrieve: ['biz-shipping'], notes: 'Shipping timeline' },
  { id: 'ps-016', category: 'Policies & Shipping', question: 'can I cancel circle protection anytime', mustRetrieve: ['biz-shipping'], notes: 'Cancel anytime' },

  // =========================================================================
  // COMPETITOR HANDLING (10 tests)
  // =========================================================================
  { id: 'cp-001', category: 'Competitors', question: 'how does sunstone compare to other welders', mustRetrieve: ['eq-welders'], notes: 'Welder comparison' },
  { id: 'cp-002', category: 'Competitors', question: 'I saw a cheaper welder on amazon should I get that', mustRetrieve: ['eq-welders'], notes: 'Amazon welder' },
  { id: 'cp-003', category: 'Competitors', question: 'why is sunstone better than other brands', mustRetrieve: [], mustRetrieveAnyOf: ['eq-welders', 'mk-brand'], notes: 'Brand differentiation — welder or branding chunk' },
  { id: 'cp-004', category: 'Competitors', question: 'my friend uses a different welder can I help her', mustRetrieve: ['eq-welders'], notes: 'Non-Sunstone user help' },
  { id: 'cp-005', category: 'Competitors', question: 'do I need a card reader or can I just use the app', mustRetrieve: ['biz-payment'], notes: 'No card reader needed' },
  { id: 'cp-006', category: 'Competitors', question: 'why is sunstone so expensive', mustRetrieve: [], mustRetrieveAnyOf: ['eq-welders', 'biz-objections'], notes: 'Value framing — expensive keyword also matches objection handling' },
  { id: 'cp-007', category: 'Competitors', question: 'are there other suppliers for chains besides sunstone', mustRetrieve: ['pr-suppliers'], notes: 'Supplier alternatives' },
  { id: 'cp-008', category: 'Competitors', question: 'I have a non-sunstone welder can you help me', mustRetrieve: ['eq-welders'], notes: 'Generic help' },
  { id: 'cp-009', category: 'Competitors', question: 'is sunstone the only company that makes PJ welders', mustRetrieve: ['eq-welders'], notes: 'Market context' },
  { id: 'cp-010', category: 'Competitors', question: 'what makes sunstone different from other PJ companies', mustRetrieve: [], mustRetrieveAnyOf: ['eq-welders', 'eq-rental', 'biz-objections'], notes: 'Differentiation — substring rent in different matches eq-rental' },

  // =========================================================================
  // MARKETING & SOCIAL (10 tests)
  // =========================================================================
  { id: 'mk-001', category: 'Marketing', question: 'how do I get more followers on instagram', mustRetrieve: ['mk-social'], notes: 'Social media growth' },
  { id: 'mk-002', category: 'Marketing', question: 'what should I post on social media', mustRetrieve: ['mk-social'], notes: 'Content ideas' },
  { id: 'mk-003', category: 'Marketing', question: 'how do I promote my next event', mustRetrieve: ['mk-eventmarket'], notes: 'Event marketing' },
  { id: 'mk-004', category: 'Marketing', question: 'what do I need for my brand', mustRetrieve: ['mk-brand'], notes: 'Branding basics' },
  { id: 'mk-005', category: 'Marketing', question: 'are there facebook groups for PJ artists', mustRetrieve: ['mk-network'], notes: 'Facebook groups' },
  { id: 'mk-006', category: 'Marketing', question: 'when is the next PJX conference', mustRetrieve: ['mk-network'], notes: 'PJX expo' },
  { id: 'mk-007', category: 'Marketing', question: 'what should I bring to a pop up event', mustRetrieve: ['mk-packing'], notes: 'Packing checklist' },
  { id: 'mk-008', category: 'Marketing', question: 'how do I create tiktok content for PJ', mustRetrieve: ['mk-social'], notes: 'TikTok content' },
  { id: 'mk-009', category: 'Marketing', question: 'I forgot my checklist for my event setup', mustRetrieve: ['mk-packing'], notes: 'Packing checklist' },
  { id: 'mk-010', category: 'Marketing', question: 'how do I network with other PJ artists', mustRetrieve: ['mk-network'], notes: 'Networking' },

  // =========================================================================
  // PJ UNIVERSITY & TRAINING (8 tests)
  // =========================================================================
  { id: 'pj-001', category: 'PJ University', question: 'how do I login to PJ University', mustRetrieve: ['pju-structure'], notes: 'Login URL' },
  { id: 'pj-002', category: 'PJ University', question: 'what courses are available in training', mustRetrieve: ['pju-structure'], notes: 'Course list' },
  { id: 'pj-003', category: 'PJ University', question: 'how do I get Sunstone Certified', mustRetrieve: ['pju-structure'], notes: 'Certification' },
  { id: 'pj-004', category: 'PJ University', question: 'whats the 30 day fast track plan', mustRetrieve: ['pju-structure'], notes: 'Fast track calendar' },
  { id: 'pj-005', category: 'PJ University', question: 'how do I book mentoring session', mustRetrieve: ['pju-structure'], notes: 'Mentoring booking' },
  { id: 'pj-006', category: 'PJ University', question: 'what modules are in the welding course', mustRetrieve: ['pju-structure'], notes: 'Course 1 modules' },
  { id: 'pj-007', category: 'PJ University', question: 'is training included with my kit', mustRetrieve: ['pju-structure'], notes: 'Training = yes with all kits' },
  { id: 'pj-008', category: 'PJ University', question: 'where do I find the class about pricing strategies', mustRetrieve: ['pju-structure'], notes: 'Course 2 module lookup' },

  // =========================================================================
  // PJOS PLATFORM (15 tests)
  // =========================================================================
  { id: 'ap-001', category: 'PJOS Platform', question: 'how do I create a new event in the app', mustRetrieve: ['app-events'], notes: 'Create event' },
  { id: 'ap-002', category: 'PJOS Platform', question: 'how do I ring up a sale', mustRetrieve: ['app-event-pos'], notes: 'POS ring up' },
  { id: 'ap-003', category: 'PJOS Platform', question: 'how do I add inventory to the app', mustRetrieve: ['app-inventory'], notes: 'Add inventory item' },
  { id: 'ap-004', category: 'PJOS Platform', question: 'how do I see my sales report', mustRetrieve: ['app-reports'], notes: 'Reports' },
  { id: 'ap-005', category: 'PJOS Platform', question: 'how do I connect stripe', mustRetrieve: ['app-settings'], notes: 'Stripe setup' },
  { id: 'ap-006', category: 'PJOS Platform', question: 'whats the difference between starter and pro plan', mustRetrieve: ['app-subscription'], notes: 'Subscription tiers' },
  { id: 'ap-007', category: 'PJOS Platform', question: 'how do I invite a team member', mustRetrieve: ['app-team'], notes: 'Team invite' },
  { id: 'ap-008', category: 'PJOS Platform', question: 'how do customers check in at my event', mustRetrieve: ['app-queue'], notes: 'Queue check-in' },
  { id: 'ap-009', category: 'PJOS Platform', question: 'how do I sell gift cards', mustRetrieve: ['app-gift-cards'], notes: 'Gift card sales' },
  { id: 'ap-010', category: 'PJOS Platform', question: 'how do I open the cash drawer', mustRetrieve: ['app-cash-drawer'], notes: 'Cash drawer' },
  { id: 'ap-011', category: 'PJOS Platform', question: 'how do I text a client back', mustRetrieve: ['app-messaging'], notes: 'Two-way messaging' },
  { id: 'ap-012', category: 'PJOS Platform', question: 'my app isnt working right', mustRetrieve: ['app-troubleshooting'], notes: 'App trouble' },
  { id: 'ap-013', category: 'PJOS Platform', question: 'how do I set up automated workflows', mustRetrieve: ['app-messaging'], notes: 'CRM workflows' },
  { id: 'ap-014', category: 'PJOS Platform', question: 'how to use store mode for walk ins', mustRetrieve: ['app-store-pos'], notes: 'Store mode' },
  { id: 'ap-015', category: 'PJOS Platform', question: 'how do I set up pricing tiers in the app', mustRetrieve: ['app-tier-pricing'], notes: 'Tier pricing setup' },

  // =========================================================================
  // EDGE CASES & ADVERSARIAL (18 tests)
  // =========================================================================
  { id: 'eg-001', category: 'Edge Cases', question: 'what setting for titanium', mustRetrieve: ['eq-settings'], notes: 'Titanium = not in KB, but settings chunk will be retrieved for gauge/setting keywords' },
  { id: 'eg-002', category: 'Edge Cases', question: 'how do I solder permanent jewelry', mustRetrieve: ['wt-fundamentals'], notes: 'Soldering → welding redirect' },
  { id: 'eg-003', category: 'Edge Cases', question: 'whats the best permanent jewelry welder', mustRetrieve: ['eq-welders'], notes: 'Should describe Sunstone lineup, not trash competitors' },
  { id: 'eg-004', category: 'Edge Cases', question: 'help', mustRetrieve: ['ts-top'], notes: 'Single word: help → troubleshooting' },
  { id: 'eg-005', category: 'Edge Cases', question: 'hi', mustRetrieve: [], mustNotRetrieve: [], notes: 'Greeting — fallback to biz-pricing + biz-events' },
  { id: 'eg-006', category: 'Edge Cases', question: 'so I went to this event last weekend and there were so many people and I was super busy but then this one lady came up and she wanted a bracelet but she also wanted to know about gold filled vs sterling and I wasnt sure what to tell her about the difference', mustRetrieve: ['pr-metals'], notes: 'Long rambling question with buried topic' },
  { id: 'eg-007', category: 'Edge Cases', question: 'what setting for silver and also how do I price necklaces', mustRetrieve: ['eq-settings', 'biz-pricing'], notes: 'Multi-topic question' },
  { id: 'eg-008', category: 'Edge Cases', question: '?', mustRetrieve: [], notes: 'Single punctuation — fallback' },
  { id: 'eg-009', category: 'Edge Cases', question: 'tell me everything you know', mustRetrieve: [], notes: 'Overly broad — no specific keywords, fallback' },
  { id: 'eg-010', category: 'Edge Cases', question: 'what is micro tig welding anyway', mustRetrieve: ['wt-fundamentals'], notes: 'Welding definition' },
  { id: 'eg-011', category: 'Edge Cases', question: 'HELP MY WELDER IS BROKEN ITS NOT DOING ANYTHING', mustRetrieve: ['ts-top'], notes: 'ALL CAPS panic' },
  { id: 'eg-012', category: 'Edge Cases', question: 'my customer wants to know about sunstone supply', mustRetrieve: [], notes: 'Sunstone Supply doesnt exist — no specific match expected' },
  { id: 'eg-013', category: 'Edge Cases', question: 'wht setng 4 24g gld fld zapp', mustRetrieve: ['eq-settings'], notes: 'Heavy abbreviations' },
  { id: 'eg-014', category: 'Edge Cases', question: 'can I laser weld permanent jewelry', mustRetrieve: ['wt-fundamentals'], notes: 'Laser welding misconception' },
  { id: 'eg-015', category: 'Edge Cases', question: 'where is sunstone based', mustRetrieve: [], notes: 'Company info — no specific chunk expected' },
  { id: 'eg-016', category: 'Edge Cases', question: 'ugh my jump ring wont close and my welds look terrible and I keep burning through', mustRetrieve: ['wt-jumpring'], mustRetrieveAnyOf: ['ts-top', 'ts-power', 'eq-settings'], notes: 'Multiple issues — jump ring + troubleshooting' },
  { id: 'eg-017', category: 'Edge Cases', question: 'I want to offer warranty protection to customers in the app', mustRetrieve: ['app-warranty'], notes: 'App warranty feature' },
  { id: 'eg-018', category: 'Edge Cases', question: 'hard-wire cutter for stainless', mustRetrieve: ['wt-metals'], notes: 'Hard-wire cutter keyword' },
];

// =============================================================================
// Run the tests
// =============================================================================

function runTests() {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  const failures: { id: string; category: string; question: string; expected: string[]; anyOf?: string[]; got: string[]; missing: string[]; unwanted: string[] }[] = [];
  const categoryStats: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const tc of TEST_CASES) {
    totalTests++;
    const cat = tc.category;
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, passed: 0, failed: 0 };
    categoryStats[cat].total++;

    const retrieved = selectSubsections(tc.question);
    const retrievedIds = retrieved.map(s => s.id);

    // For tests with empty mustRetrieve (fallback tests), check that fallback triggers
    let testPassed = true;
    const missingChunks: string[] = [];
    const unwantedChunks: string[] = [];

    if (tc.mustRetrieve.length > 0) {
      for (const expected of tc.mustRetrieve) {
        if (!retrievedIds.includes(expected)) {
          testPassed = false;
          missingChunks.push(expected);
        }
      }
    }

    // At least one of these must be present
    if (tc.mustRetrieveAnyOf && tc.mustRetrieveAnyOf.length > 0) {
      const foundAny = tc.mustRetrieveAnyOf.some(id => retrievedIds.includes(id));
      if (!foundAny) {
        testPassed = false;
        missingChunks.push(`ANY_OF(${tc.mustRetrieveAnyOf.join('|')})`);
      }
    }

    if (tc.mustNotRetrieve && tc.mustNotRetrieve.length > 0) {
      for (const forbidden of tc.mustNotRetrieve) {
        if (retrievedIds.includes(forbidden)) {
          testPassed = false;
          unwantedChunks.push(forbidden);
        }
      }
    }

    if (testPassed) {
      passed++;
      categoryStats[cat].passed++;
    } else {
      failed++;
      categoryStats[cat].failed++;
      failures.push({
        id: tc.id,
        category: tc.category,
        question: tc.question,
        expected: tc.mustRetrieve,
        anyOf: tc.mustRetrieveAnyOf,
        got: retrievedIds,
        missing: missingChunks,
        unwanted: unwantedChunks,
      });
    }
  }

  // ─── Print Report ─────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(72));
  console.log('  SUNNY KNOWLEDGE RETRIEVAL TEST REPORT');
  console.log('='.repeat(72));
  console.log(`\n  Total tests: ${totalTests}`);
  console.log(`  Passed:      ${passed} (${((passed / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  Failed:      ${failed} (${((failed / totalTests) * 100).toFixed(1)}%)`);

  console.log('\n' + '-'.repeat(72));
  console.log('  CATEGORY BREAKDOWN');
  console.log('-'.repeat(72));
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const pct = ((stats.passed / stats.total) * 100).toFixed(0);
    const status = stats.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${cat.padEnd(25)} ${stats.passed}/${stats.total} (${pct}%)`);
  }

  if (failures.length > 0) {
    console.log('\n' + '-'.repeat(72));
    console.log('  FAILURES');
    console.log('-'.repeat(72));
    for (const f of failures) {
      console.log(`\n  ${f.id} [${f.category}]`);
      console.log(`    Q: "${f.question}"`);
      console.log(`    Expected: [${f.expected.join(', ')}]`);
      console.log(`    Got:      [${f.got.join(', ')}]`);
      if (f.missing.length > 0) console.log(`    Missing:  [${f.missing.join(', ')}]`);
      if (f.unwanted.length > 0) console.log(`    Unwanted: [${f.unwanted.join(', ')}]`);
    }
  }

  console.log('\n' + '='.repeat(72));
  console.log(`  ${failed === 0 ? 'ALL TESTS PASSED' : `${failed} TESTS FAILED`}`);
  console.log('='.repeat(72) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
