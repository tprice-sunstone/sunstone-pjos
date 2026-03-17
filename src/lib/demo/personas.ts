// src/lib/demo/personas.ts
// Persona definitions for the tradeshow demo system

export type PersonaKey = 'newbie' | 'mid' | 'pro';

export interface DemoPersona {
  key: PersonaKey;
  name: string;
  businessName: string;
  badge: string;
  accent: string;
  stats: string;
  description: string;
  explore: string;
  tenantIdEnvKey: string;
}

export const PERSONAS: Record<PersonaKey, DemoPersona> = {
  newbie: {
    key: 'newbie',
    name: "Luna's Jewelry",
    businessName: "Luna's Permanent Jewelry",
    badge: 'Just Starting Out',
    accent: 'emerald',
    stats: '28 clients \u00b7 $3,200 in sales \u00b7 3 months in \u00b7 Pro Trial',
    description:
      'Luna just started her permanent jewelry business. She has a small inventory of chains and has done a handful of events. Explore what getting started looks like.',
    explore:
      'Simple POS checkout, client list, upcoming events, basic reports',
    tenantIdEnvKey: 'NEXT_PUBLIC_DEMO_NEWBIE_TENANT_ID',
  },
  mid: {
    key: 'mid',
    name: 'Spark Studio',
    businessName: 'Spark Permanent Jewelry Studio',
    badge: 'Growing Fast',
    accent: 'violet',
    stats: '95 clients \u00b7 $22,400 in sales \u00b7 8 months in \u00b7 Pro Plan',
    description:
      'Spark has been in business for 8 months and is hitting her stride. She uses gift cards, warranties, and has a loyal client base. See how the platform grows with you.',
    explore:
      'Gift cards, warranties, CRM broadcasts, party bookings, rich reports',
    tenantIdEnvKey: 'NEXT_PUBLIC_DEMO_MID_TENANT_ID',
  },
  pro: {
    key: 'pro',
    name: 'Golden Thread Co',
    businessName: 'Golden Thread Permanent Jewelry Co',
    badge: 'Power User',
    accent: 'amber',
    stats: '215 clients \u00b7 $78,200 in sales \u00b7 2 years in \u00b7 Business Plan',
    description:
      'Golden Thread is a full-time permanent jewelry business with two years of history. Multiple team members, pricing tiers, and a packed event calendar. This is the dream.',
    explore:
      'Pricing tiers, team management, advanced reports, 2-year growth trends',
    tenantIdEnvKey: 'NEXT_PUBLIC_DEMO_PRO_TENANT_ID',
  },
};

/** Returns the persona key for a given tenant ID, or null if not a demo tenant */
export function getPersonaKey(tenantId: string): PersonaKey | null {
  if (typeof window !== 'undefined') {
    // Client-side: check NEXT_PUBLIC_ env vars
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_NEWBIE_TENANT_ID) return 'newbie';
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_MID_TENANT_ID) return 'mid';
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_PRO_TENANT_ID) return 'pro';
  } else {
    // Server-side: same env vars
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_NEWBIE_TENANT_ID) return 'newbie';
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_MID_TENANT_ID) return 'mid';
    if (tenantId === process.env.NEXT_PUBLIC_DEMO_PRO_TENANT_ID) return 'pro';
  }
  return null;
}

/** Check if a tenant ID is one of the demo accounts */
export function isDemoTenant(tenantId: string): boolean {
  return getPersonaKey(tenantId) !== null;
}
