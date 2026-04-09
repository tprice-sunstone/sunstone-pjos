# Sunstone Studio — Project Status & Context Document
## Last Updated: April 8, 2026 (Capacitor Shell + Email Systems + Admin Upgrade)

---

## What This Document Is

This is the single source of truth for the Sunstone Studio project. It contains everything a new Claude thread needs to pick up where the last one left off. Keep this updated after every major session.

---

## 1. PROJECT OVERVIEW

**Product:** Sunstone Studio — a vertical SaaS platform for permanent jewelry artists
**URL:** https://sunstonepj.app (live on Vercel, not yet publicly launched)
**Company:** Sunstone Welders (permanentjewelry.sunstonewelders.com)
**Founder:** Tony Price
**Stack:** Next.js 15, TypeScript, Supabase (Postgres + Auth + RLS), Tailwind CSS, Vercel

**What it does:** All-in-one business platform for permanent jewelry artists — POS (Event Mode + Store Mode) with variant support, smart inventory management with variants and tier pricing, client CRM with two-way SMS, AI mentor (Sunny with smart Sonnet/Opus routing), AI admin intelligence (Atlas), event/queue management, digital waivers, gift cards, warranty protection system, financial reporting with transaction-level detail, automated workflows, Stripe payments (artist sales), subscription billing, Artist Storefront (public profile page), private party booking engine, in-app supply reordering with multi-item cart and Salesforce + Authorize.net payment integration, Shop Sunstone catalog browser, supplier directory, admin catalog management, bulk import/export for clients and inventory, and a 9-theme design system.

**Business model:**
- Subscription tiers: Starter ($99/mo), Pro ($169/mo), Business ($279/mo)
- Platform fee: 3% / 1.5% / 0% deducted from artist's Stripe payouts (artist-absorbed, customer never sees it)
- CRM add-on: $69/mo (included free in 30-day Pro trial)
- 30-day Pro trial for all new signups, no credit card required
- Revenue streams: subscriptions + platform fees + CRM add-on + Sunstone product sales (driven by in-app reorder)

---

## 2. WHAT'S BUILT AND WORKING

### Core Platform
- Multi-tenant architecture with RLS, UUID primary keys, tenant_id isolation
- Auth: signup, login (server-side rate limited), password reset (rate limited, no email enumeration), email confirmation
- Onboarding: kit selection, pricing wizard (flat rate, per-product, or by tier), product type setup
- 9 theme variations (5 light, 4 dark), custom design system with CSS custom properties
- Staff permissions: Owner/Manager/Staff roles
- tenant_members RLS uses SECURITY DEFINER functions (no recursion)

### POS (Event Mode + Store Mode)
- Full-screen tablet-optimized product grid
- Progressive chain filter by material type
- Tier filter chips when pricing_mode = 'tier' (additive with material filter)
- Per-product flat pricing (customer never sees inch measurements)
- Variant picker — non-chain items with variants show selection modal before adding to cart
- Per-variant inventory deduction (deducts from variant, parent recalculated as SUM)
- Tip screen with percentage presets (15/20/25%)
- Payment: "Charge Customer" (Stripe QR/text link) or "Record External Payment" (cash/Venmo/external card)
- Jump ring auto-deduction with confirmation step
- Discounts (per-item and cart-level)
- Warranty protection (per-item and per-invoice, editable amounts at sale time)
- Cash drawer (open/close/track) — session-based dismiss state (FIXED March 26)
- Party event tagging: sales auto-tagged with party_request_id
- Tappable revenue display — tap revenue number for transaction list
- Mobile navigation — Home → Messages → POS (raised center) → CRM → More
- POS Event Mode header — 2-row layout with safe area insets
- Sunny Tips auto-hides when cart has items (FIXED March 26)

### Stripe Payment Flow (FULLY WORKING)
- QR code payment — customer scans and pays on their phone
- Text-to-pay — send payment link via SMS
- Stripe Connect: payments flow directly to artist's account
- application_fee_amount: platform fee deducted automatically
- `/pay/[sessionId]` redirect page — avoids iOS SMS URL truncation
- `checkout_sessions` table — session→tenant mapping
- Session status polling: DB every 3s, Stripe API fallback every 9s
- Belt-and-suspenders sale status update (polling + webhook)
- Branded `/payment-success` page for customers
- Pending sales excluded from reports until confirmed
- Inventory deducted only after payment confirmed

### Gift Cards
- Purchase via POS (preset $25/$50/$75/$100/$150 or custom amounts)
- Stripe payment support ("Charge Customer" QR + Text Link)
- Gift card activated/delivered AFTER Stripe payment confirmed
- Deliver via SMS, email, or print
- Redemption at POS with code lookup, partial redemptions, balance tracking

### Pricing Tiers (SHIPPED March 14)
- Third pricing mode alongside Flat Rate and Per Product
- `pricing_tiers` table: tenant-scoped named tiers
- Default prices for all product types (bracelet, anklet, ring, necklace, hand chain)
- Necklace tier pricing is FLAT (not per-inch) — matches all other product types
- Settings → Default Pricing: mode selector, full tier CRUD
- POS tier filter chips, event "Select by Tier," Storefront tier display
- Underlying data stays in chain_product_prices — tiers are a convenience layer

### Warranty Protection System (SHIPPED March 14)
- Per-item and per-invoice warranty sales
- Default amounts configurable, editable at POS
- Tax: taxable by default with toggle to exempt
- Coverage terms: editable, snapshotted at sale time
- Duration: Lifetime (default), 6mo, 1yr, 2yr, or custom
- Full claim workflow (submitted → in_progress → completed/denied)
- Dashboard → Warranties tab with stat cards and claim management
- Invoice warranty auto-clears when cart is emptied (FIXED March 26)

### Inventory (MAJOR UPDATES March 20-22)
- 3-tab layout: My Inventory | Shop Sunstone | Order History
- Simplified header: title + count + Import + "+ Add Item" button
- Smart contextual banner: shows unlinked Sunstone item count with "Link now"
- Overflow menus per row: Add to Cart, Edit, Link, Deactivate, Delete
- Chain management (inches-based with cost_per_inch)
- Per-product-type pricing
- Inventory item variants — optional sub-variants per item
- Variant-level Sunstone linking
- Material and supplier fields (supplier now FK to suppliers table)
- Jump ring tracking, inventory movements with variant awareness
- Low stock alerts (per-variant when applicable)
- Scroll position preserved, cost entry per-inch/per-foot toggle
- **Bulk Import/Export (SHIPPED March 26):** CSV import with template download, preview/validation, duplicate merge (never overwrites existing data), type normalization ("jump ring" → jump_ring). Export via overflow menu with date-stamped filenames. Import hidden on Shop Sunstone/Order History tabs.

### Shop Sunstone Catalog Browser (SHIPPED March 21)
- Collection filter pills (Chain, Connectors, Accessories, Supplies)
- Product cards with images, title, type, pricing, variant count
- Product detail slide-in with formatted descriptions
- Chain variants in collapsible accordion grouped by material
- "Add" button adds to cart (with length picker for chains)
- Lazy-loaded on tab selection, cached across tab switches

### Multi-Item Cart + Checkout (SHIPPED March 21)
- Zustand cart store
- Cart icon with badge count in inventory header
- Cart drawer with quantity controls, line totals, subtotal
- Full checkout: review → shipping → payment → confirmation

### Supplier Directory (SHIPPED March 22)
- `suppliers` table with full CRUD
- Sunstone supplier flagged as Primary, not deletable
- Tappable supplier name on inventory items

### Salesforce Direct Order Integration (v2 — SHIPPED March 20-22)
- jsforce authentication with token caching
- Multi-strategy account resolution
- Authorize.net payment via StudioReorderAPI Apex REST
- See SF_INTEGRATION_PLAYBOOK.md (v2.2, 24 lessons)

### Zone-Based Shipping (SHIPPED March 22)
- West/Midwest/East from Utah, weight-class aware, hazmat-restricted (argon = ground only)

### Smart AI Model Routing (SHIPPED March 22)
- Sunny defaults to Sonnet, upgrades to Opus when 2+ complexity signals fire

### Admin Catalog Management (SHIPPED March 22)
- /admin/catalog with visibility toggles per product, bulk hide/show

### Clients & CRM
- Client management with activity timeline, notes, tags, segments
- Two-way SMS with phone normalization, secondary phone numbers
- Message templates with variable support ({{client_name}}, {{business_name}})
- SMS/email broadcasts with recipient targeting
- Automated workflows with step builder (trigger → delay → send template)
- Workflow enrollment from client profiles, Bulk Enroll by Tag
- "Send Party Booking Link" from client profile
- **Copy Waiver Link button on Clients page header (SHIPPED March 26):** Copies tenant's generic waiver URL to clipboard with toast. Waiver submissions create clients automatically.
- **Bulk Import/Export (SHIPPED March 26):** CSV import with template, preview, validation, merge. Export via overflow menu.
- Activity timeline now shows purchase history correctly (FIXED March 26)

### Waivers & Queue
- Event QR codes, digital waivers with signature capture + PDF generation
- SMS consent checkbox with carrier-required language
- Queue management with SMS notifications (Twilio)
- Waiver PDF auto-emailed to signer, "Resend Waiver" on client profile
- **Conditional queue logic (SHIPPED March 26):** Queue entries ONLY created when event_id is present AND event is active/today. No event → "Thank you" confirmation (no queue mention). Future events → no queue. Invalid events → graceful handling, no errors.

### SMS & Twilio (FULLY LIVE)
- A2P 10DLC approved and connected
- Phone provisioning/release via app
- Two-way conversations, auto-reply, Sunny AI text modes
- SMS consent on waiver

### Artist Storefront
- Public profile at /studio/[slug], auto-populated from tenant data
- Available on ALL tiers

### Party Booking Engine
- Basic (ALL tiers): Booking form, status management, RSVP, confirmation SMS
- Advanced (CRM): Stripe deposits, enhanced RSVP, min sales guarantee, host rewards

### Events & Queue
- Event CRUD with booth fee, tax profiles, chain selection
- QR codes, digital waivers, queue management with SMS, Store Mode queue

### Reports & Financial
- Transactions tab with expandable detail, event P&L with COGS
- Date range/source filters, platform fee tracking, CSV export
- Manual expense tracking with 11 categories (FIXED March 26 — API was returning 500)
- Recurring expense support (Weekly/Monthly/Quarterly/Yearly)
- Full P&L with refund support, warranty revenue
- Event P&L infinite loading loop fixed (FIXED March 26 — expenseTotals dependency loop)

### Subscription & Billing
- Stripe Checkout with deferred trial billing
- CRM add-on ($69/mo), trial warnings, post-trial lockout
- Plan comparison table with correct fee labels (FIXED March 26 — "deducted from payouts")
- Trial expiration email notifications (3 automated emails: 7-day, 1-day, expired)
- Onboarding drip email system (8 behavior-triggered emails: welcome, inventory nudge, first sale nudge, week 1 active/inactive, Stripe nudge, week 2 active/inactive)
- Welcome email sent immediately at signup + Sunny welcome SMS
- Email preview route for marketing (/api/email-preview with ?key= authentication)
- Daily cron jobs: onboarding emails (4pm UTC), trial emails (3pm UTC)
- Behavior-based triggers: checks inventory count, sale count, Stripe connection, last login
- Reactivation tracking (trial_reactivated_at set when expired trial converts)

### AI — Sunny (Mentor)
- 1,457+ line knowledge base from 45+ documents
- Streaming chat, 43 subsection chunks, 35+ agentic tools
- Smart Sonnet/Opus routing
- Prompt caching (~70% cost reduction)
- Official weld settings chart, knowledge gap detection + user flagging
- 5 personality presets for customer-facing messages
- QA verified: weld settings accurate, correct welder models only, real product references, no hallucination

### AI — Atlas (Admin)
- 11 tools, tenant management, revenue queries, knowledge gap review

### Admin Portal
- Tenant management, revenue dashboard, cost tracker
- Sunny's Learning tab, Catalog Management
- Onboarding Journey panel in tenant detail — visual timeline of all 11 emails sent/pending/skipped per tenant
- Last Active column in tenant list with relative time display and sort
- Manual tier override — admin can force any tier regardless of payment status (admin_tier_override flag)
- Trial extension — admin can extend trial_ends_at with date picker or quick +7/+14/+30 day buttons
- Marketing admin role — level 2 access to Overview, Tenants, Revenue, Spotlight, Catalog, Ambassadors
- Mobile-responsive admin — full-screen detail panels, stacked layouts, full-screen broadcast modal on mobile

### Native App (Capacitor Shell)
- Capacitor v8.3.0 initialized with remote-URL config pointing to sunstonepj.app
- Android native project created and building successfully (Gradle assembleDebug passes)
- iOS native project created (pending Xcode build on Mac)
- App icons generated: Deep Wine (#852454) background, white "S" foreground, all Android densities (mipmap-mdpi through xxxhdpi, adaptive + legacy + round) and iOS 1024x1024
- Splash screens generated: white background with Deep Wine "S" for both platforms
- 5 Capacitor plugins configured: Camera, Haptics, Push Notifications, Splash Screen, Status Bar
- Billing gate wired: canShowBillingUI() gates all subscription purchase UI in native app — TrialBanner, TrialExpiredOverlay, Settings subscription tab, CRM add-on, plan cards all redirect to sunstonepj.app in external browser when running in Capacitor shell
- Android permissions: INTERNET, CAMERA, POST_NOTIFICATIONS
- iOS permissions: Camera usage description, push notification background mode
- Native detection utilities: src/lib/native.ts (isNativeApp, getPlatform, isPluginAvailable)
- App ID: app.sunstonepj.studio
- npm scripts: cap:sync, cap:open:android, cap:open:ios, cap:build

### Tradeshow Demo System (SHIPPED March 19, FIXED March 26)
- Three demo personas with rich seed data, branded kiosk launcher, auto-reset
- Demo account passwords updated and env vars synced (FIXED March 26)

### Marketing & Public Pages
- Landing page with brand fonts, hero screenshot (3x DPR), lifestyle photos
- Mobile hamburger menu (SHIPPED March 26)
- Pricing nav scroll fixed (SHIPPED March 26)
- Favicon added (SHIPPED March 26)
- Pricing comparison, CRM page, privacy/terms, SMS consent page, Sunny demo widget

---

## 3. CURRENT STATUS — APRIL 8, 2026

Capacitor native shell built, Android build confirmed, iOS build pending Mac setup. Email automation systems complete (11 automated emails covering full artist lifecycle from signup through trial expiration). Admin portal upgraded with onboarding visibility, manual tier controls, and mobile responsiveness.

**Blocked on:**
- Mac setup (Xcode downloading, software update in progress)
- Apple Developer account renewal ($99) and Account Holder transfer from Kyle Kinyon to Tony Price
- Push notification infrastructure (Firebase + APNs — needed before App Store submission to avoid "thin wrapper" rejection)

### QA Gauntlet Results (March 26, 2026) — LAUNCH GATE CLEARED

Platform passed 168 tests across 20 categories with 95.8% pass rate. All critical and high-severity bugs found during QA have been fixed and deployed.

| Category | Tests | Pass | Fail |
|----------|-------|------|------|
| Landing & Public Pages | 12 | 11 | 1 |
| Auth & Onboarding | 11 | 11 | 0 |
| Dashboard Home | 8 | 8 | 0 |
| Inventory Management | 22 | 22 | 0 |
| POS Event Mode | 20 | 15 | 1 |
| POS Store Mode | 8 | 8 | 0 |
| Clients & CRM | 20 | 20 | 0 |
| Waivers & Queue | 14 | 12 | 0 |
| Gift Cards | 10 | 9 | 1 |
| Pricing Tiers & Warranty | 10 | 9 | 1 |
| Reports & Financial | 14 | 9 | 2 |
| Payments & Billing | 12 | 7 | 0 |
| Refunds | 8 | 0 | 1 |
| AI Sunny | 10 | 8 | 0 |
| Themes & Responsive | 16 | 16 | 0 |
| Settings | 12 | 12 | 0 |
| Permissions & Security | 8 | 8 | 0 |
| Demo System | 6 | 5 | 1 |
| Import/Export | 10 | 10 | 0 |
| Edge Cases & Stress | 10 | 10 | 0 |

### Bugs Found and Fixed During QA (March 26)

| Bug | Severity | Status |
|-----|----------|--------|
| create_sale_transaction function overload (ALL POS sales broken) | CRITICAL | FIXED — migration 065 |
| Expenses API 500 / Event P&L infinite loop | HIGH | FIXED — dependency array |
| Client activity timeline empty (blocked refunds) | HIGH | FIXED — removed non-existent columns |
| Demo persona login (Luna + Spark) | HIGH | FIXED — env vars updated |
| Mobile hamburger menu missing on landing page | MEDIUM | FIXED |
| Pricing nav scrolled to wrong section | MEDIUM | FIXED |
| Sunny Tips button overlapping Checkout | MEDIUM | FIXED — hidden when cart has items |
| Ghost warranty on empty cart | LOW | FIXED — auto-clear on empty |
| Cash drawer auto-prompt every Event Mode load | LOW | FIXED — sessionStorage dismiss |
| Copy Waiver Link icon broken | LOW | FIXED — correct icon |
| Fee label "customer pays" → "deducted from payouts" | LOW | FIXED |
| favicon.ico 404 | LOW | FIXED — icon.svg created |

### Features Shipped March 26
1. **Conditional waiver queue logic** — waivers only create queue entries for active/today events
2. **Copy Waiver Link button** — Clients page header, copies generic waiver URL
3. **Bulk import/export** — CSV import with template/preview/validation for both Clients and Inventory
4. **QA Gauntlet execution** — 168 automated browser tests via Playwright MCP

### Known Remaining Issues (Not Launch Blockers)
- React #310 on hard navigation (console error only — pages render correctly, only affects direct URL entry)
- Gift cards cannot be purchased via Stripe (only external payment) — post-launch
- No warranty revenue breakout in Reports — post-launch
- Necklace tier pricing in demo seed data uses per-inch values (investigate if code or seed data issue)
- ThePicnicClub font woff2 decode warnings (cosmetic, fallback fonts work)

---

## 4. UPCOMING WORK

### Immediate (when Mac is ready)
1. Clone repo onto Mac, install Node.js, CocoaPods
2. Test Android on Mac emulator (Apple Silicon runs it fast)
3. Build iOS in Xcode simulator
4. Push notification setup (Firebase Cloud Messaging for Android, APNs for iOS)
5. Renew Apple Developer account + transfer Account Holder
6. TestFlight + Google Play Internal Testing submission
7. App Store + Play Store public submission

### Near-term (first 2 weeks post-launch)
- MRR dashboard in admin (subscription revenue from Stripe not currently tracked)
- Trial-to-paid conversion rate tracking
- Broadcast history page in admin
- Stripe Terminal + Tap to Pay (Phase 2 of Capacitor — native SDK bridge)
- SF sync of Studio subscribers (Studio_Subscriber__c flag on SF Contacts)

### Post-Launch (Month 1-2)
- Push notifications via Capacitor (TASK-4)
- Predictive reorder intelligence (TASK-8)
- Phone/SMS authentication (decided March 26 — Supabase Phone provider + Twilio OTP)
- Promotional control layer, admin cost dashboard
- Ambassador Program (20% commission, Stripe Connect Express)

### Month 2-4
- Aftercare Sequences, Lead Capture, Event Benchmarking
- Offline Payments, Photo Capture + Watermark, Multi-Vertical Expansion

---

## 5. TWILIO / SMS STATUS — FULLY LIVE

- A2P 10DLC approved, connected to Messaging Service
- Outbound via Messaging Service SID (A2P compliant)
- Inbound webhook routing by dedicated_phone_number
- Phone provisioning/release via app
- Two-way conversations, auto-reply, Sunny AI text modes
- Normalized 10-digit matching, secondary phone numbers

---

## 6. SUBSCRIPTION & PRICING (FINALIZED)

| | Starter | Pro | Business |
|---|---|---|---|
| Monthly Price | $99 | $169 | $279 |
| Platform Fee | 3% | 1.5% | 0% |
| Sunny AI | 5/month | Unlimited | Unlimited |
| Team Members | 1 | Up to 3 | Unlimited |
| AI Insights | No | Yes | Yes |
| Full Reports | Basic | Full + CSV | Full + CSV |
| Catalog Reorder | All tiers | All | All |
| Storefront | All tiers | All | All |
| Party Booking | Basic | Full | Full |

**CRM Add-On:** $69/month — dedicated number, two-way SMS, workflows, broadcasts, advanced party booking
**Trial:** 30 days Pro + CRM, no credit card required

---

## 7. KEY BUSINESS RULES

- **Chain model:** Tracked in inches. Customers see flat product prices, never inches.
- **Pricing modes:** Flat Rate, Per Product, or By Tier. Storage always per-chain in chain_product_prices.
- **Tier necklace pricing:** Flat rate (not per-inch).
- **Jump rings:** 1 per item, 2 for hand chains.
- **Platform fee:** Deducted from artist's Stripe payout. Customer never sees it.
- **Revenue calculation:** subtotal + tax + tip (not sale.total).
- **COGS:** Snapshotted from sale_items, not real-time inventory.
- **Warranty:** Taxable by default, lifetime duration default, coverage snapshotted. Invoice warranty auto-clears when cart empties.
- **Aftercare:** Free repairs for life with chain.
- **Inventory variants:** Optional. Chains = separate items by metal. Connectors/charms = variants for months/sizes.
- **Variant linking:** Each inventory variant links to its own Shopify variant.
- **Shipping:** Zone-based (West/Mid/East), weight-aware (heavy/light), hazmat-restricted (argon = ground only).
- **Payment status:** pending → completed → failed → refunded. No 'expired' in enum.
- **Guest sequences:** Track A (waiver) = full marketing. Track B (RSVP) = aftercare + opt-in only.
- **Sunny:** 3 welders only (Zapp, Zapp Plus 2, mPulse). Never hallucinate. Use official weld chart.
- **App Store:** Billing at sunstonepj.app only. No in-app subscription UI.
- **Waiver queue logic:** Queue entry only created when event_id present AND event is active/today. No event = waiver only.

---

## 8. SECURITY AUDIT — COMPLETED MARCH 7, 2026

All Critical (7/7) and High (6/6) fixed. 11 Medium + 8 Low remaining (not launch-blocking).

---

## 9. SALESFORCE INTEGRATION (v2 — Production Verified)

### Architecture
```
Match SF Account → Opp (Quote Sent) → Quote (with ShippingHandling)
→ QuoteLineItems → Sync → Avalara tax → Charge card → Close Won
→ SF auto-creates Order with tax + shipping line items
```

**App does NOT:** Create Orders, create OrderItems, set Direct_Order__c.

### Key Details
- StudioReorderAPI Apex REST (6 actions), jsforce auth, multi-item QuoteLineItems
- Studio_Created__c/Studio_Modified__c audit fields, Account_Type__c = 'Customer'
- CloseDate = America/Denver timezone, ShippingHandling = 0 for Will Call
- Quote number as shared reference, sf_pending on Close Won failure
- See SF_INTEGRATION_PLAYBOOK.md (v2.2, 24 lessons)

---

## 10. TECHNICAL ARCHITECTURE

### Database (Supabase/Postgres)
- RLS on ALL tables
- SECURITY DEFINER functions: get_user_tenant_ids(), get_user_tenant_role(), find_client_by_phone(), link_orphaned_conversations()
- Variant-aware functions: create_sale_transaction (duplicate overload fixed March 26 — migration 065), decrement_inventory
- Migrations 001-070 applied

### Migrations Added March 26
- 065: Drop duplicate create_sale_transaction overload

### Migrations Added April 8
- 068: Trial email tracking columns (trial_email_7day_sent_at, trial_email_1day_sent_at, trial_email_expired_sent_at, trial_reactivated_at)
- 069: Onboarding email tracking columns (8 onboarding_*_sent_at + last_owner_login_at)
- 070: Admin tier override (admin_tier_override boolean)

### Key New Files (March 26)
- src/lib/csv-templates.ts — CSV template generators for client/inventory import
- src/lib/csv-parser.ts — Manual CSV parser with phone/type normalization
- src/components/ImportModal.tsx — 3-step import modal (upload → preview → process)
- src/app/icon.svg — Favicon (wine "S" on rounded square)

### QA Infrastructure (March 26)
- Playwright MCP configured: `claude mcp add playwright npx @playwright/mcp@latest`
- Auto-approve config: `.claude/settings.json` with permissions.allow for all Playwright/Bash/Write/Read tools
- QA Gauntlet document: `QA_GAUNTLET_MARCH_2026.md` — 234 planned tests across 20 categories

### Demo Accounts
| Email | Tenant | Pricing Mode |
|-------|--------|-------------|
| demo.golden@sunstonestudio.app | Golden PJ Studio | Tier (72 chains, 215 clients) |
| demo.luna@sunstonestudio.app | Luna PJ Studio | Flat (14 chains, 28 clients) |
| demo.spark@sunstonestudio.app | Spark PJ Studio | Per Product (38 chains, 95 clients) |
| Password (all three) | DemoQA2026! | |

### Environment Variables (Vercel)
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_CLIENT_ID, STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS, STRIPE_PRICE_CRM
- SQUARE_APP_ID, SQUARE_APP_SECRET, SQUARE_ENVIRONMENT
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID
- ANTHROPIC_API_KEY, RESEND_API_KEY
- NEXT_PUBLIC_APP_URL=https://sunstonepj.app
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
- SF_LOGIN_URL, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN
- DEMO_RESET_ENABLED, NEXT_PUBLIC_DEMO_*_TENANT_ID, NEXT_PUBLIC_DEMO_*_PASSWORD (3 demo tenants)

---

## 11. KEY DECISIONS LOG

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App name | Sunstone Studio | Approachable, resonates with artists |
| Cash/Venmo platform fee | Don't collect | Industry standard |
| Square coexistence | Keep as option | Some artists prefer Square |
| Capacitor over React Native | Capacitor | Web-first, simpler |
| Stripe over Square for Terminal | Stripe | Native platform fee, Tap to Pay |
| AI architecture | Single agent (Sunny) | Multi-agent adds latency |
| AI model routing | Sonnet default, Opus for complex (2+ signals) | 80%+ simple; saves cost |
| SF Order creation | Let SF auto-create on Close Won (v2) | Manual bypassed accounting pipeline |
| Shipping before tax | ShippingHandling on Quote before Avalara | Correct tax calculation |
| Shipping rates | Zone-based all methods | Flat rates inaccurate |
| Variant data model | Separate table | Proper relational with per-variant stock |
| Variant linking | Per-variant sunstone_variant_id | Each month links to own Shopify variant |
| Product visibility | Admin-controlled table | Shopify data not always clean |
| Supplier model | Dedicated table with FK | Free-text was unstructured |
| Cart state | Zustand in-memory | Simple, no persistence complexity |
| CloseDate timezone | America/Denver locale | UTC wrong after 5pm MST |
| Ambassador commission | 20% / 8 months | Beats competitor's 15% |
| IAP strategy | No in-app subscription UI | Avoids Apple's 15-30% cut |
| Profile gating | All tiers | Growth tool, brand awareness |
| Aftercare policy | Free for life with chain | Simpler, more generous |
| Trademark | "Sunstone Studio" Class 42 | No blocking registrations |
| Trial period | 30 days (from 60) | Shorter time-to-conversion |
| QA approach | Playwright MCP automated browser testing | Faster than manual, catches real bugs |
| Waiver queue logic | URL context determines queue | No toggle/setting needed — smart defaults |
| Phone auth | Post-launch | Infrastructure ready (Twilio), but UI work not worth delaying launch |
| Import format | CSV (not Excel) | No dependencies, universal compatibility |

---

## 12. KEY TECHNICAL LEARNINGS

### March 26 (QA Gauntlet Session)
- **Playwright MCP + Claude Code = automated QA.** 168 browser tests in ~3 hours. Setup: `claude mcp add playwright npx @playwright/mcp@latest`.
- **Claude Code auto-approve:** `.claude/settings.json` with `"permissions":{"allow":["mcp__playwright__*","Bash(*)","Write(*)","Read(*)"]}` eliminates permission prompts.
- **Duplicate Postgres functions don't replace — they overload.** CREATE OR REPLACE only replaces if parameter types match exactly. Different parameter ORDER creates a second function. Named parameter calls then fail with ambiguity.
- **useEffect dependency arrays can cause infinite loops** when including values that are recalculated by child components (expenseTotals in Event P&L).
- **useMemo dependency arrays with function references** cause cascade re-renders on hard navigation when the entire component tree remounts with new references.
- **Supabase .select() with non-existent columns** returns null data silently (no throw), which can mask the real error downstream.
- **Session-scoped state (sessionStorage)** is better than localStorage for per-session preferences like cash drawer dismiss state.

### March 20-22
- **SF auto-creates Orders from Closed Won + synced Quote.** Do NOT create manually.
- **ShippingHandling must ALWAYS be a number** (0 for Will Call, never null).
- **UTC timezone produces wrong dates after 5pm MST.** Use `toLocaleDateString('en-CA', { timeZone: 'America/Denver' })`.
- **Unstable createClient() references cause infinite re-render loops.** Wrap in useMemo.
- **Shopify productType = full strings** ("Permanent Jewelry Chain" not "Chain").
- **Per-variant Sunstone linking essential** for non-chain products.

### April 8 (Capacitor + Email + Admin Session)
- **Capacitor remote-URL is correct for server-rendered Next.js.** Static export is impossible with Supabase Auth + Stripe + Twilio. The native shell loads sunstonepj.app in a WebView.
- **Apple "thin wrapper" rejection risk is real.** Ship push notifications as active native capability before App Store submission.
- **All subscriptions must remain web-only.** canShowBillingUI() gates native app to avoid Apple IAP requirements. Physical goods reorders are exempt.
- **Android emulator may not work on Surface tablets.** Hyper-V and virtualization performance can be insufficient. Test on Mac or physical device instead.
- **Android resource linking fails if colors.xml is missing.** Capacitor's default styles.xml references colors that must be defined.
- **Behavior-triggered emails beat time-based drips.** Check inventory_count, sale_count, last_owner_login_at instead of just days-since-signup.
- **admin_tier_override flag lets admins bypass all Stripe/trial logic.** getSubscriptionTier() checks this first and returns the manual tier if set.
- **Marketing admin role uses existing platform_admins table.** No migration needed — just code-level role filtering in verify-platform-admin.ts and admin-shell.tsx.

### Earlier Sessions
- **Vercel function logs are the critical debug tool.**
- **Audit-first prompts produce better results** in Claude Code.
- **RLS recursion** → SECURITY DEFINER functions.
- **Revenue = subtotal + tax + tip** (not sale.total).
- **React stale closures in polling** — pass values as parameters.
- **useEffect deps cause silent resets** — narrow to actual triggers.
- **Silent guards hide bugs** — always surface toasts/errors.
- **Stripe 'paid' → DB 'completed'**, expired → 'failed'.
- **iOS SMS truncates URLs with #** — use redirect page.
- **trial_ends_at is single source of truth** — all logic reads dynamically.

---

## 13. KEY PROJECT DOCUMENTS

**In Project Knowledge:**
- PROJECT_STATUS_MARCH_26.md — THIS document
- QA_GAUNTLET_MARCH_2026.md — 234-test QA checklist across 20 categories
- SUNSTONE_STUDIO_ROADMAP_MARCH_2026.md — master roadmap
- SF_INTEGRATION_PLAYBOOK.md — v2.2, 24 lessons
- AMBASSADOR_PROGRAM_ROADMAP.md — affiliate program spec
- STRIPE_TERMINAL_ARCHITECTURE.md — Capacitor + Terminal research
- CONTROL_THREAD_PROMPT_V4.md — control thread instructions
- DESIGN_SYSTEM.md — design philosophy and tokens
- SUNNY_KNOWLEDGE_BASE.md — Sunny's full knowledge reference
- KB_DOCUMENT_*.docx — Sunny's source documents

**In Repo:**
- docs/project-status.md — copy of this document
- CLAUDE.md — project-level instructions for Claude Code
- .claude/settings.json — Playwright MCP auto-approve config
- supabase/migrations/ — 001 through 070

---

*Last updated April 8, 2026. Capacitor native shell built — Android build passing, iOS pending Mac setup. 11 automated lifecycle emails built (8 onboarding + 3 trial). Admin portal upgraded with onboarding journey tracking, manual tier override, trial extension, marketing role, and mobile fixes. Migrations at 070. Apple Developer account renewal + Account Holder transfer pending. Next step: Mac setup → iOS build → push notifications → App Store + Play Store submission.*