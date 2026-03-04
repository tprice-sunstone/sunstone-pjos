# Sunstone PJOS

Multi-tenant SaaS platform for permanent jewelry artists.
Next.js 15 (App Router), TypeScript, Supabase, Tailwind CSS, Vercel.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Build for production (ALWAYS run before pushing)
- `npx supabase gen types typescript --project-id <id> > src/types/supabase.ts` — Regenerate DB types

## Architecture

- `/src/app/` — Next.js App Router pages and API routes
- `/src/components/ui/` — Reusable design system components (Button, Card, Input, etc.)
- `/src/components/` — Feature components (MentorChat, CartPanel, AdminAIChat, etc.)
- `/src/lib/` — Utilities, Supabase clients, subscription logic, permissions
- `/src/hooks/` — React hooks (use-tenant, use-cart)
- `/src/types/` — TypeScript type definitions

## Critical Rules

- NEVER change the Supabase client imports — they are correct as-is
- NEVER remove the Sunstone logo fix in the settings page
- NEVER remove the dollar sign fix in financial displays
- NEVER use font-mono anywhere in the app
- ALWAYS use the existing component library from @/components/ui/
- Touch targets must be 48px minimum — this is a tablet POS
- Design: Light mode luxury, "calm confidence" aesthetic
- When editing a file, preserve ALL existing functionality — only add/change what's needed

## Design System

- Fonts: Inter (sans), Fraunces (display), JetBrains Mono (mono)
- Colors: CSS custom properties (--surface-base, --accent-500, etc.)
- See DESIGN_SYSTEM.md for full reference

## Multi-Tenant

- All data is tenant-scoped via tenant_id
- Row-Level Security (RLS) on all tables
- createClient() for browser, createServerSupabase() for server, createServiceRoleClient() to bypass RLS
- useTenant() hook provides tenant context in React components

## Known Fixes to Preserve

- Settings page: Sunstone supplier logo display fix
- Financial reports: Revenue = subtotal + tax + tip (not total which includes fees)
- Cart: platform_fee_percent read from tenant record
- Subscription: trial_ends_at check for expired trials → defaults to starter