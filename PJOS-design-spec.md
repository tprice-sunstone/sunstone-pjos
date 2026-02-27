# PJOS UI/UX Design Specification v2.0
## February 2026 — Implementation Reference

---

## 1. Design Philosophy

Sunstone PJOS is built for women-owned businesses in the beauty industry: permanent jewelry studios, salons, and boutiques. Three governing principles:

- **Luxury Simplicity** — If it feels crowded, it's wrong. Clean, professional interfaces suitable for boutique environments.
- **Mirror the Physical** — Software matches how the artist actually works at her booth. The conversation flow at the chain display drives the POS interaction flow.
- **Intelligence, Not Noise** — AI-powered features are embedded as actionable cards, not passive text. The system works for her without demanding attention.

Target aesthetic: "calm confidence, luxury simplicity" — warm, sophisticated colors and typography for beauty industry professionals.

---

## 2. Subscription Tier Model

**All features available on all tiers.** Tiers differentiate by pricing, scale, and AI usage — not locked features.

| | Starter (Free) | Pro ($129/mo) | Business ($279/mo) |
|---|---|---|---|
| Platform Fee | 3% on every sale | 1.5% on every sale | 0% |
| Team Members | 1 (owner only) | Up to 3 | Unlimited |
| Sunny AI Chat | 5 chats/month | Unlimited | Unlimited |
| Features | All included | All included | All included |
| Sunstone Placements | Prominent on dashboard | Subtle, notification-based | Minimal |
| Trial | — | 60-day free Pro trial | — |

**Sunstone Product Placements:** No third-party ads. Native Sunstone product cards on dashboard ("New rose gold satellite chain just dropped" with image + "Order from Sunstone" button). Starter = persistent card. Paid = notification-based.

**AI Cost Strategy:** Dashboard cards = single cached API call per 24hrs (cheap, free for all). Sunny chat = $0.01–$0.03 per conversation (gated at 5/month on Starter). Sunny suggests upgrades when economically relevant.

---

## 3. Visual Design System

### 3.1 Theme Architecture

9 preset themes, each defining accent color, backgrounds, text colors, borders, and typography pairings. Applied via CSS custom properties (design tokens).

**Light Themes (5):**
| Theme | Accent | Background | Typography | Personality |
|---|---|---|---|---|
| Rose Gold & Ivory | #B76E79 | Warm cream (#FFFBF7) | Playfair Display + DM Sans | Warm, Sunstone-aligned, feminine luxury |
| Soft Blush & Cloud | #D4847C | Near-white (#FEFCFB) | Libre Baskerville + Karla | Flodesk-inspired, ultra-clean, airy |
| Warm Slate & Bronze | #9A7B5B | Warm gray (#F5F3F0) | Source Serif 4 + Plus Jakarta Sans | Modern neutral, sophisticated restraint |
| Sage & Linen | #6B8068 | Warm cream (#F7F5F0) | Libre Baskerville + Karla | Soft botanical, wellness-inspired |
| French Blue & Ivory | #6E85A3 | Cool white (#FAFBFD) | Playfair Display + DM Sans | Classic, soft, Parisian boutique |

**Dark Themes (4):**
| Theme | Accent | Background | Typography | Personality |
|---|---|---|---|---|
| Midnight & Gold | #D4A853 | Deep charcoal (#0F1419) | Cormorant Garamond + Outfit | Rich dark mode, warm gold — VIP lounge energy |
| Deep Plum & Champagne | #C9A96E | Deep plum (#1A1020) | Bodoni Moda + Manrope | Bold jewel-tone, editorial luxury |
| Forest & Gold | #C5A55A | Deep emerald (#0D1A14) | Cormorant Garamond + Outfit | Botanical luxury, spa energy |
| Deep Ocean & Pearl | #B8C4D4 | Near-black navy (#0A0E18) | Bodoni Moda + Manrope | Moody navy, silver-pearl — moonlight on dark water |

No custom accent override — each theme is a complete, curated identity. Artists pick the theme that matches their brand.

---

## 4. Navigation Architecture

### 4.1 Phone Layout

Bottom tab bar with 5 items + Sunny pill in top bar.

| Tab | Destination | Notes |
|---|---|---|
| Home | Smart Dashboard | Context-aware cards, default landing |
| Calendar | Events List | Mini month strip at top, not full calendar |
| POS (center) | Point of Sale | Raised center button with accent highlight |
| Clients | Client List + CRM | Unified stream with smart suggestions |
| More | Half-sheet menu | Slides up from bottom (Apple share-sheet style) |

**More Menu (Half-Sheet):** 4 items as flat list:
- Inventory
- Reports
- Settings
- Support

**Sunny AI Pill:** Persistent in top bar. Tapping opens chat drawer. Available on all screens.

### 4.2 Tablet / Desktop Layout

Sidebar navigation with all sections visible (no More menu needed). Collapses to icons on narrow tablets.

### 4.3 Event Mode POS

Full-screen takeover, no navigation chrome. Back button returns to Events. One-tap toggle to full-screen QR code.

---

## 5. Home — Smart Dashboard

### 5.1 Intelligence Layer

Old text-based "Your Business Insights" panel is **retired**. Intelligence embedded directly into smart dashboard cards. Same data pipeline, actionable output instead of passive text. Sunny chat remains for deeper conversational questions.

### 5.2 Dashboard Card Types

| Card | When It Appears | Content | Action |
|---|---|---|---|
| Next Event | Event within 7 days | Name, date, location, inventory readiness % | Tap to view details |
| Revenue Snapshot | Always | Today/week/month, comparison to prior | Tap for reports |
| Suggested Outreach | Clients due for contact | Specific names + reasons | One-tap message |
| Inventory Alert | Stock below threshold | Visual progress bars for critical chains | Tap to manage |
| Networking Nudge | No events in 14 days | "Slow week? One thing to do today" | Actionable tip |
| Recent Messages | Workflows running | Delivery/open stats | Tap for Messages |
| Sunstone Product | Starter: always. Paid: periodic | Product highlight with image | Order from Sunstone |

---

## 6. Calendar — Events List

Events List, not full interactive calendar. Mini month strip at top shows dots for event days = "how busy is my month" overview. Fast-start guidance handled by Sunny and dashboard nudges, NOT calendar tasks.

**Event Inventory Curation:** When setting up an event, artist limits which products are available in POS. POS auto-detects inventory size and switches between Quick-Tap Mode (≤12) and Progressive Filter Mode (12+).

---

## 7. Point of Sale

### 7.1 Product Selection — Two Modes

#### Progressive Filter Mode (12+ chain products)
Store Mode or large event inventories. Everything on one continuous screen, no page transitions.

- **Chains / Add-ons toggle** at top switches product categories
- **Material tabs** (GF, SS, Rose Gold) filter chain grid instantly
- Tap chain → **product type row** appears (Bracelet, Anklet, Necklace, Ring) with prices
- Tap product type → **if per-inch pricing:** inch adjuster with +/– and Add button
- **If flat-rate pricing:** item goes straight to cart (no inch input)
- Cart always visible on right panel

> **Flat-rate single bracelet = 3 taps:** Material → Chain → Bracelet → in cart.

#### Smart Quick-Tap Mode (≤12 chain products)
Auto-activates for small event inventories. All chains visible at once.

- ALL event chains as cards in a grid (material dot indicator on each)
- Tap chain → product type row → same flow
- System auto-detects: small = quick-tap, large = progressive filter
- Indicator: "Quick mode • 6 chains loaded for this event"

#### Add-ons (Connectors, Charms, Custom)
Accessed via Chains/Add-ons toggle. Same filter pattern:
- Type filters: All, Connectors, Charms
- Material filters: All, GF, SS, Rose Gold
- One-tap adds to cart
- Custom Item: "Name your price"

### 7.2 Cart Panel
- Always visible on right (tablet/desktop); floating button on mobile
- Item name, detail, price, remove button
- Running subtotal, tax, total
- Checkout button activates when items in cart

### 7.3 Checkout Flow (4 Steps)

**Step 1: Customer-Facing Tip Screen**
- Artist taps Checkout, hands tablet to customer
- Clean branded view — no POS clutter, no product pricing visible
- "Thank you!" + order summary + tip buttons (No Tip, 10%, 15%, 20%, 25%)
- Total updates live; customer taps "Continue" showing final total
- "Please return the tablet to your artist"

**Step 2: Artist Payment Screen**
- Order summary with tip included (left side)
- Queue customer badge: name + "Receipt info ready"
- Payment method grid: Tap to Pay, Card Reader, Cash, Venmo (right side)
- "Complete Sale" button with total, activates on payment selection

**Step 3: Jump Ring Confirmation**
- Centered modal after sale completes
- "Sale Complete!" + total + payment method
- Large +/– counter with quick presets (1, 2, 3, 4, 6)
- Inventory auto-deducted on confirm

**Step 4: Receipt Screen**
- Queue/waiver customer: email + phone pre-filled, one-tap Send buttons
- Walk-up: optional empty fields
- "New Sale" or "Skip Receipt"

### 7.4 Tap Count Summary

| Scenario | Taps to Cart | Full Sale |
|---|---|---|
| Single bracelet, flat-rate, small event | 2–3 | 6–7 |
| Single bracelet, flat-rate, large inventory | 3–4 | 7–8 |
| Single bracelet, per-inch | 4–5 | 8–9 |
| Bracelet + connector | 5–7 | 9–11 |
| Paying for 3 friends | 9–15 | 13–19 |

---

## 8. Clients — CRM

CRM is inside the Clients tab, not separate. CRM actions are about people, so they live with the people.

### 8.1 Client List (Landing)
- "Needs Your Attention" section at top with AI suggestions + one-tap Act button
- Horizontal tag filter chips
- Search bar
- Full client list: avatar, name, tags, total spent, suggestion dot
- Broadcast button + Add button in header

### 8.2 Client Profile (Tap to Open)
- Avatar, name, tags, phone
- Quick actions: Text, Email, Tag, Waiver
- Stats: total spent, pieces, last visit
- AI Suggested Action card
- Visit history timeline (date, event, items, total)

### 8.3 Tag System
10-color palette, 6 default tags + custom tags supported.

**Auto-applied by system:**
- New Client (blue) — first visit
- Repeat Client (taupe) — second+ visit
- [Event Name] (copper) — auto-tagged when signing waiver at an event

**Manual, artist-applied:**
- VIP (gold) — artist's high-value clients
- Girls Night (rose) — group/party bookings
- Referral Source (sage) — clients who refer others

Custom tags: artist can create unlimited additional tags from the 10-color palette.

### 8.4 Broadcast Page
Full page, 3 sub-tabs:
- **New Broadcast:** Select audience by tag, choose template or custom, SMS or email, preview, send
- **Activity:** Active workflows with status, recent sent with delivery/open stats, monthly count
- **Templates:** Create/manage reusable templates (3 SMS, 3 email defaults + custom). No-emoji policy.

---

## 9. Settings

Grouped sections (not one long scroll):

| Section | Contents | Notes |
|---|---|---|
| My Business | Name, address, logo, theme picker | 9 preset themes |
| Payments | Square/Stripe connections, fee handling | |
| Plan & Billing | Tier, trial status, usage, upgrade flow | |
| Tax & Receipts | Tax rate, receipt customization | |
| Waiver | Waiver text (read-only default), edit lock | "Are you sure?" confirmation before editing |
| Team | Members, invites, roles | Tier limits enforced |

Inventory settings live on the Inventory page, not in Settings.

---

## 10. Queue System

No dedicated tab. Lives inside POS:

- **Event Mode:** Mini queue strip between header and product grid. Now Serving / Up Next / Waiting. "Start Sale" pre-fills from waiver. Real-time Supabase. Auto-advances.
- **Store Mode:** Waiver check-in strip. Customer scans QR → signs waiver → appears as "Checked In."
- Walk-up sales always work. Queue enhances but never blocks.

---

## 11. AI Features

- **Smart Dashboard Cards:** Single cached API call/24hrs. Context-aware, actionable. Free for all tiers.
- **Sunny Chat:** Conversational assistant via pill button. 1,457-line knowledge base. 5/month Starter, unlimited paid. Empathetic, professional, answers only what's asked.
- **Suggested Outreach:** AI identifies clients needing contact (days since visit, birthdays, referrals). Surfaces on dashboard + Clients tab.

---

## 12. Responsive Behavior

| Breakpoint | Navigation | POS Layout | Dashboard |
|---|---|---|---|
| Phone (<768px) | Bottom tabs + Sunny pill | Full-screen, floating cart | Single column |
| Tablet (768–1024px) | Collapsible sidebar | Split: products + cart | 2-column |
| Desktop (>1024px) | Full sidebar with labels | Split: products + cart | 3-column |
| Event Mode (any) | No nav — full-screen POS | Products + cart | N/A |

---

## 13. Decision Log

| Decision | Chosen | Rationale |
|---|---|---|
| Feature gating | All features free | Dashboard IS the product; stripped version hurts first impression |
| AI insights | Embedded cards | Actionable > passive text |
| Navigation | Classic 5-tab + Sunny pill | Dead simple, one tap per section |
| Calendar | Events list + month strip | Full calendar becomes failing to-do list |
| CRM placement | Inside Clients tab | CRM is about people |
| Clients layout | Unified stream + profile-first | Smart suggestions pull in; profiles give depth |
| Queue placement | Inside POS/Events | Queue is contextual to selling |
| Settings | Grouped sections | Avoids junk drawer |
| POS selection | Progressive filter + quick-tap | Same taps, feels like one action. Auto-switches |
| Selection order | Material → Chain → Product | Matches booth reality |
| Inch adjuster | Conditional on pricing model | Flat-rate skips entirely |
| Tip interaction | Customer-facing screen | Eliminates awkward conversation |
| Jump ring timing | After sale completes | Natural pause during customer admiration |
| Templates location | Inside Broadcast (3rd sub-tab) | Contextually relevant to sending |