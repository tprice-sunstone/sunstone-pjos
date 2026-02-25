// src/app/api/mentor/route.ts
// POST endpoint for Sunny mentor chat with streaming responses
// ============================================================================
// V4: Tenant data enrichment + anti-hallucination hardening
// - Queries actual inventory items (chain names, quantities, prices)
// - Includes upcoming events, recent client count
// - Active queue status if an event is running
// - Stronger "don't guess" and "don't hallucinate" rules
// - Stricter question discipline (answer and stop)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import {
  EQUIPMENT_KNOWLEDGE,
  WELDING_TECHNIQUE_KNOWLEDGE,
  TROUBLESHOOTING_KNOWLEDGE,
  PRODUCTS_KNOWLEDGE,
  BUSINESS_STRATEGY_KNOWLEDGE,
  CLIENT_EXPERIENCE_KNOWLEDGE,
  MARKETING_KNOWLEDGE,
  PJ_UNIVERSITY_AND_SUNNY_ROLE,
} from '@/lib/mentor-knowledge';

// ============================================================================
// Subsection registry — ~43 small chunks with keyword maps
// ============================================================================

interface Subsection {
  id: string;
  label: string;
  data: any;
  keywords: string[];
  priority?: number;
}

const SUBSECTIONS: Subsection[] = [
  // ── EQUIPMENT ──
  {
    id: 'eq-welders',
    label: 'Welders (Zapp, Zapp Plus 2, mPulse)',
    data: EQUIPMENT_KNOWLEDGE.welders,
    keywords: ['welder', 'zapp', 'mpulse', 'orion', 'pulse', 'trufire', 'tru fire', 'touchscreen', 'knob'],
  },
  {
    id: 'eq-kits',
    label: 'Starter Kits (Momentum, Dream, Legacy)',
    data: EQUIPMENT_KNOWLEDGE.starterKits,
    keywords: ['kit', 'momentum', 'dream', 'legacy', 'starter', 'came with', 'included', 'package', 'purchase', 'buy', 'bought'],
    priority: 1,
  },
  {
    id: 'eq-argon',
    label: 'Argon Setup',
    data: EQUIPMENT_KNOWLEDGE.argon,
    keywords: ['argon', 'gas', 'tank', 'regulator', 'flow', 'lpm', 'psi', 'compressed', 'hose', 'coupler', 'mini'],
  },
  {
    id: 'eq-electrode',
    label: 'Electrode Maintenance',
    data: EQUIPMENT_KNOWLEDGE.electrode,
    keywords: ['electrode', 'tungsten', 'sharpen', 'sharpening', 'pilot', 'protrusion', 'maintenance'],
  },
  {
    id: 'eq-settings',
    label: 'Weld Settings Chart (Joules by gauge/metal/welder)',
    data: EQUIPMENT_KNOWLEDGE.weldSettings,
    keywords: ['setting', 'joule', 'power', 'gauge', '20g', '22g', '24g', '26g', 'what setting', 'how many joule'],
    priority: 2,
  },
  {
    id: 'eq-optics',
    label: 'Optics / Magnification',
    data: EQUIPMENT_KNOWLEDGE.optics,
    keywords: ['optic', 'scope', 'adl', 'magnif', 'lens', 'camera', 'digital'],
  },
  {
    id: 'eq-rental',
    label: 'Sunstone OnDemand Rental Program',
    data: EQUIPMENT_KNOWLEDGE.rentalProgram,
    keywords: ['rent', 'rental', 'ondemand', 'on demand', 'try', 'borrow'],
  },

  // ── WELDING TECHNIQUE ──
  {
    id: 'wt-fundamentals',
    label: 'Fundamental Welding Process',
    data: WELDING_TECHNIQUE_KNOWLEDGE.fundamentalProcess,
    keywords: ['how to weld', 'welding process', 'basic', 'beginner', 'first weld', 'learn', 'start welding', 'touch and release'],
  },
  {
    id: 'wt-jumpring',
    label: 'Jump Ring Handling',
    data: WELDING_TECHNIQUE_KNOWLEDGE.jumpRingHandling,
    keywords: ['jump ring', 'jumpring', 'close', 'gap', 'overlap', 'pinch', 'opening', 'flush'],
  },
  {
    id: 'wt-grounding',
    label: 'Grounding Best Practices',
    data: WELDING_TECHNIQUE_KNOWLEDGE.grounding,
    keywords: ['ground', 'grounding', 'clip', 'clamp', 'connection', 'directly on'],
  },
  {
    id: 'wt-angle',
    label: 'Weld Angle',
    data: WELDING_TECHNIQUE_KNOWLEDGE.weldAngle,
    keywords: ['angle', '90', 'degree', 'perpendicular', 'position'],
  },
  {
    id: 'wt-multiple',
    label: 'Multiple Welds Technique',
    data: WELDING_TECHNIQUE_KNOWLEDGE.multipleWelds,
    keywords: ['multiple weld', 'pulse', 'several', 'repeat', 'thick', 'heavy gauge'],
  },
  {
    id: 'wt-mistakes',
    label: 'Common Weld Triggering Mistakes',
    data: WELDING_TECHNIQUE_KNOWLEDGE.weldTriggeringMistakes,
    keywords: ['mistake', 'wrong', 'trigger', 'misfire', 'beginner error'],
  },
  {
    id: 'wt-metals',
    label: 'Metal-Specific Welding Notes',
    data: WELDING_TECHNIQUE_KNOWLEDGE.metalWeldingNotes,
    keywords: ['gold fill weld', 'silver weld', 'stainless weld', 'solid gold weld', 'metal specific', 'discolor'],
  },
  {
    id: 'wt-pieces',
    label: 'Piece-Specific Technique Notes',
    data: WELDING_TECHNIQUE_KNOWLEDGE.pieceSpecificNotes,
    keywords: ['bracelet technique', 'anklet technique', 'necklace technique', 'ring technique', 'achilles', 'longer piece'],
  },

  // ── TROUBLESHOOTING ──
  {
    id: 'ts-top',
    label: 'Top Troubleshooting Issues',
    data: TROUBLESHOOTING_KNOWLEDGE.topIssues,
    keywords: ['problem', 'issue', 'troubleshoot', 'not working', 'help', 'break', 'broke', 'abort', 'won\'t', 'doesn\'t'],
    priority: 1,
  },
  {
    id: 'ts-electrode',
    label: 'Electrode Troubleshooting',
    data: TROUBLESHOOTING_KNOWLEDGE.electrode,
    keywords: ['electrode problem', 'stuck', 'welding to', 'ball', 'mushroom'],
  },
  {
    id: 'ts-power',
    label: 'Power Setting Troubleshooting',
    data: TROUBLESHOOTING_KNOWLEDGE.powerSettings,
    keywords: ['too low', 'too high', 'burn', 'dark spot', 'not hold', 'weak weld', 'power setting'],
  },
  {
    id: 'ts-ground',
    label: 'Grounding Issues',
    data: TROUBLESHOOTING_KNOWLEDGE.grounding,
    keywords: ['grounding issue', 'inconsistent', 'links fusing', 'chain fuse'],
  },
  {
    id: 'ts-escalation',
    label: 'Escalation to Sunstone Support',
    data: TROUBLESHOOTING_KNOWLEDGE.escalation,
    keywords: ['support', 'phone', 'contact', 'escalate', 'malfunction', 'return', 'refund'],
  },

  // ── PRODUCTS ──
  {
    id: 'pr-metals',
    label: 'Metal Types (gold, silver, stainless)',
    data: PRODUCTS_KNOWLEDGE.metalTypes,
    keywords: ['metal', 'gold', 'silver', 'sterling', 'stainless', 'steel', 'filled', '14k', 'karat', 'rose', 'white', 'hypoallergenic', 'tarnish'],
  },
  {
    id: 'pr-pieces',
    label: 'Piece Types (bracelet, anklet, necklace, ring)',
    data: PRODUCTS_KNOWLEDGE.pieceTypes,
    keywords: ['bracelet', 'anklet', 'necklace', 'ring', 'size', 'inch', 'default', 'how long', 'measure'],
  },
  {
    id: 'pr-connectors',
    label: 'Connectors vs. Charms',
    data: PRODUCTS_KNOWLEDGE.connectorsVsCharms,
    keywords: ['connector', 'charm', 'birthstone', 'initial', 'dangle', 'inline', 'bs connector'],
  },
  {
    id: 'pr-chainselect',
    label: 'Chain Selection Guidance',
    data: PRODUCTS_KNOWLEDGE.chainGuidance,
    keywords: ['chain select', 'which chain', 'recommend', 'popular', 'best seller', 'display', 'variety'],
  },
  {
    id: 'pr-jumpring-inv',
    label: 'Jump Ring Inventory',
    data: PRODUCTS_KNOWLEDGE.sunstoneJumpRingInventory,
    keywords: ['jump ring size', 'jump ring inventory', '3mm', '4mm', 'gauge jump'],
  },
  {
    id: 'pr-inventory',
    label: 'Inventory Planning',
    data: PRODUCTS_KNOWLEDGE.inventoryPlanning,
    keywords: ['inventory', 'stock', 'how much', 'reorder', 'bring', 'run out', 'enough', 'plan', 'supply'],
    priority: 2,
  },
  {
    id: 'pr-suppliers',
    label: 'Supplier Guidance',
    data: PRODUCTS_KNOWLEDGE.suppliers,
    keywords: ['supplier', 'supply', 'sunstone supply', 'order', 'imprinted', 'stuller', 'rio grande', 'where to buy'],
  },

  // ── BUSINESS STRATEGY ──
  {
    id: 'biz-pricing',
    label: 'Pricing Strategy',
    data: BUSINESS_STRATEGY_KNOWLEDGE.pricing,
    keywords: ['price', 'pricing', 'charge', 'how much', 'cost', 'tier', 'margin', 'discount', 'value'],
    priority: 2,
  },
  {
    id: 'biz-formation',
    label: 'Business Formation (LLC, sole prop)',
    data: BUSINESS_STRATEGY_KNOWLEDGE.businessFormation,
    keywords: ['llc', 'sole prop', 'business entity', 'legal', 'formation', 'register', 'ein'],
  },
  {
    id: 'biz-insurance',
    label: 'Insurance',
    data: BUSINESS_STRATEGY_KNOWLEDGE.insurance,
    keywords: ['insurance', 'liability', 'coverage', 'insure', 'protect'],
  },
  {
    id: 'biz-payment',
    label: 'Payment Processing',
    data: BUSINESS_STRATEGY_KNOWLEDGE.paymentProcessing,
    keywords: ['payment', 'square', 'stripe', 'credit card', 'cash', 'venmo', 'process', 'reader'],
  },
  {
    id: 'biz-events',
    label: 'Event Strategy',
    data: BUSINESS_STRATEGY_KNOWLEDGE.eventStrategy,
    keywords: ['event', 'market', 'pop up', 'popup', 'festival', 'craft fair', 'booth', 'concert', 'venue', 'farmers'],
    priority: 2,
  },
  {
    id: 'biz-salon',
    label: 'Salon Integration',
    data: BUSINESS_STRATEGY_KNOWLEDGE.salonIntegration,
    keywords: ['salon', 'hair', 'spa', 'beauty', 'stylist', 'chair', 'commission', 'partnership', 'local business'],
  },
  {
    id: 'biz-houseparty',
    label: 'House Party Strategy',
    data: BUSINESS_STRATEGY_KNOWLEDGE.houseParties,
    keywords: ['house party', 'host', 'home', 'party', 'hostess', 'incentive'],
  },
  {
    id: 'biz-financial',
    label: 'Financial Potential',
    data: BUSINESS_STRATEGY_KNOWLEDGE.financialPotential,
    keywords: ['income', 'earn', 'money', 'revenue', 'potential', 'full time', 'part time', 'side hustle'],
  },

  // ── CLIENT EXPERIENCE ──
  {
    id: 'cx-flow',
    label: '12-Step Customer Experience Flow',
    data: CLIENT_EXPERIENCE_KNOWLEDGE.experienceFlow,
    keywords: ['experience', 'flow', 'step', 'customer journey', 'consultation', 'walk through', 'service flow', 'client flow'],
  },
  {
    id: 'cx-aftercare',
    label: 'Aftercare',
    data: CLIENT_EXPERIENCE_KNOWLEDGE.aftercare,
    keywords: ['aftercare', 'care', 'clean', 'maintain', 'tarnish', 'shower', 'pool', 'ocean', 'remove'],
  },
  {
    id: 'cx-safety',
    label: 'Safety',
    data: CLIENT_EXPERIENCE_KNOWLEDGE.safety,
    keywords: ['safety', 'eye', 'protection', 'burn', 'risk', 'glasses', 'mri', 'hospital'],
  },
  {
    id: 'cx-reweld',
    label: 'Re-Weld Policy',
    data: BUSINESS_STRATEGY_KNOWLEDGE.reWeldPolicy,
    keywords: ['reweld', 're-weld', 'broke off', 'fell off', 'came apart', 'warranty', 'free fix'],
  },
  {
    id: 'cx-waiver',
    label: 'Waiver Management',
    data: BUSINESS_STRATEGY_KNOWLEDGE.waiverManagement,
    keywords: ['waiver', 'sign', 'liability', 'form', 'consent', 'minor'],
  },

  // ── MARKETING ──
  {
    id: 'mk-brand',
    label: 'Branding Foundations',
    data: MARKETING_KNOWLEDGE.branding,
    keywords: ['brand', 'logo', 'name', 'identity', 'color', 'aesthetic', 'vibe'],
  },
  {
    id: 'mk-social',
    label: 'Social Media',
    data: MARKETING_KNOWLEDGE.socialMedia,
    keywords: ['social media', 'instagram', 'facebook', 'tiktok', 'post', 'content', 'reel', 'video', 'hashtag', 'follower'],
  },
  {
    id: 'mk-eventmarket',
    label: 'Event Marketing',
    data: MARKETING_KNOWLEDGE.eventMarketing,
    keywords: ['event market', 'promote event', 'advertise', 'find event', 'vendor', 'application', 'find pop'],
  },
  {
    id: 'mk-network',
    label: 'Networking',
    data: MARKETING_KNOWLEDGE.networking,
    keywords: ['network', 'connect', 'community', 'other artist', 'pjx', 'conference', 'expo', 'facebook group'],
  },
  {
    id: 'mk-packing',
    label: 'Event Packing Checklist',
    data: MARKETING_KNOWLEDGE.eventPackingChecklist,
    keywords: ['pack', 'checklist', 'bring', 'forget', 'what to bring', 'setup', 'table'],
  },

  // ── PJ UNIVERSITY ──
  {
    id: 'pju-structure',
    label: 'PJ University Courses & Fast Track',
    data: {
      pjUniversity: PJ_UNIVERSITY_AND_SUNNY_ROLE.pjUniversity,
      fastTrack: PJ_UNIVERSITY_AND_SUNNY_ROLE.fastTrack,
      mentoring: PJ_UNIVERSITY_AND_SUNNY_ROLE.mentoring,
    },
    keywords: ['pj university', 'course', 'class', 'module', 'certificate', 'certified', 'fast track', '30 day', 'mentoring', 'training'],
  },
];

// ============================================================================
// Select relevant subsections (top 4-5 by keyword score)
// ============================================================================

function selectSubsections(userMessage: string, recentMessages: string[]): Subsection[] {
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

// ============================================================================
// Stringify a subsection's data compactly
// ============================================================================

function stringify(obj: any, depth = 0): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  if (typeof obj === 'string') return `${indent}${obj}`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${indent}${String(obj)}`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '';
    if (typeof obj[0] === 'string' || typeof obj[0] === 'number') {
      return obj.map(item => `${indent}- ${item}`).join('\n');
    }
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return stringify(item, depth);
      }
      return `${indent}- ${item}`;
    }).join('\n');
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_]/g, ' ')
        .replace(/^\s/, '')
        .toUpperCase();

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${indent}${label}: ${value}`);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        lines.push(`${indent}${label}:`);
        value.forEach((v: string) => lines.push(`${indent}  - ${v}`));
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${indent}${label}:`);
        lines.push(stringify(value, depth + 1));
      }
    }
  }

  return lines.filter(Boolean).join('\n');
}

// ============================================================================
// Fetch RICH tenant context (inventory items, clients, events, queue)
// ============================================================================

async function fetchTenantContext(serviceClient: any, tenantId: string) {
  try {
    const [
      tenantRes,
      salesCountRes,
      clientsCountRes,
      eventsCountRes,
      inventoryRes,
      upcomingEventsRes,
      activeQueueRes,
      recentClientsRes,
    ] = await Promise.all([
      // Basic tenant info
      serviceClient
        .from('tenants')
        .select('name, subscription_tier, created_at')
        .eq('id', tenantId)
        .single(),

      // Total completed sales
      serviceClient
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'completed'),

      // Total clients
      serviceClient
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Total events
      serviceClient
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // ACTUAL inventory items (chains, jump rings, charms, connectors)
      serviceClient
        .from('inventory_items')
        .select('name, type, material, quantity_on_hand, sell_price, unit, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('type')
        .order('name'),

      // Upcoming events (next 30 days)
      serviceClient
        .from('events')
        .select('name, location, start_time, end_time, booth_fee')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time')
        .limit(5),

      // Active queue entries (waiting or notified)
      serviceClient
        .from('queue_entries')
        .select('name, status, position')
        .eq('tenant_id', tenantId)
        .in('status', ['waiting', 'notified'])
        .order('position')
        .limit(20),

      // Recent clients (last 10)
      serviceClient
        .from('clients')
        .select('first_name, last_name, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const tenant = tenantRes.data;
    const inventory = inventoryRes.data || [];
    const upcomingEvents = upcomingEventsRes.data || [];
    const activeQueue = activeQueueRes.data || [];
    const recentClients = recentClientsRes.data || [];

    // Format inventory by type
    const chains = inventory.filter((i: any) => i.type === 'chain');
    const jumpRings = inventory.filter((i: any) => i.type === 'jump_ring');
    const charms = inventory.filter((i: any) => i.type === 'charm');
    const connectors = inventory.filter((i: any) => i.type === 'connector');

    const formatItem = (i: any) => {
      const qty = Number(i.quantity_on_hand) || 0;
      const price = Number(i.sell_price) || 0;
      const unit = i.unit === 'ft' ? 'ft' : i.unit === 'each' ? 'ea' : i.unit;
      const mat = i.material ? ` (${i.material})` : '';
      return `${i.name}${mat}: ${qty}${unit} on hand, $${price.toFixed(2)} sell price`;
    };

    const inventoryText = [
      chains.length > 0 ? `Chains (${chains.length}):\n${chains.map(formatItem).join('\n')}` : 'Chains: None in inventory',
      jumpRings.length > 0 ? `Jump Rings (${jumpRings.length}):\n${jumpRings.map(formatItem).join('\n')}` : 'Jump Rings: None in inventory',
      charms.length > 0 ? `Charms (${charms.length}):\n${charms.map(formatItem).join('\n')}` : 'Charms: None in inventory',
      connectors.length > 0 ? `Connectors (${connectors.length}):\n${connectors.map(formatItem).join('\n')}` : 'Connectors: None in inventory',
    ].join('\n');

    const eventsText = upcomingEvents.length > 0
      ? upcomingEvents.map((e: any) => {
          const start = new Date(e.start_time);
          const end = e.end_time ? new Date(e.end_time) : null;
          const dur = end ? `${Math.round((end.getTime() - start.getTime()) / 3600000)}h` : '';
          return `${e.name} - ${e.location || 'TBD'} on ${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${dur} (booth fee: $${e.booth_fee || 0})`;
        }).join('\n')
      : 'No upcoming events scheduled';

    const queueText = activeQueue.length > 0
      ? `${activeQueue.length} people in queue: ${activeQueue.map((q: any) => `${q.name} (${q.status})`).join(', ')}`
      : 'No active queue';

    const clientsText = recentClients.length > 0
      ? `Recent: ${recentClients.map((c: any) => `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed').join(', ')}`
      : 'No clients yet';

    return {
      businessName: tenant?.name || 'Your Business',
      tier: tenant?.subscription_tier || 'free',
      since: tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently',
      sales: salesCountRes.count || 0,
      clientCount: clientsCountRes.count || 0,
      eventCount: eventsCountRes.count || 0,
      inventoryText,
      eventsText,
      queueText,
      clientsText,
    };
  } catch (error) {
    console.error('[Mentor] Error fetching tenant context:', error);
    return {
      businessName: 'Your Business',
      tier: 'free',
      since: 'recently',
      sales: 0,
      clientCount: 0,
      eventCount: 0,
      inventoryText: 'Unable to load inventory',
      eventsText: 'Unable to load events',
      queueText: 'Unable to load queue',
      clientsText: 'Unable to load clients',
    };
  }
}

// ============================================================================
// POST handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Tenant
    const serviceClient = await createServiceRoleClient();
    const { data: membership } = await serviceClient
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const tenantId = membership?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // 3. Parse
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: 'user' | 'assistant'; content: string }> };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // 4. Select relevant knowledge subsections
    const latestUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content);
    const subsections = selectSubsections(latestUserMsg, recentUserMsgs);

    const knowledgeText = subsections
      .map(s => `[${s.label}]\n${stringify(s.data)}`)
      .join('\n\n');

    // 5. Fetch RICH tenant context + approved additions
    const [biz, additionsRes] = await Promise.all([
      fetchTenantContext(serviceClient, tenantId),
      serviceClient.from('mentor_knowledge_additions').select('question, answer').eq('is_active', true),
    ]);

    const additions = (additionsRes.data || []);
    const additionsText = additions.length > 0
      ? `\n\n[Additional Learned Knowledge]\n${additions.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n')}`
      : '';

    // 6. System prompt — BEHAVIOR FIRST, knowledge second
    const systemPrompt = `You are Sunny, the AI mentor for Sunstone Permanent Jewelry, inside the PJOS app.

ABSOLUTE RULES (violating these is a critical failure):
1. ONLY state facts that appear in your KNOWLEDGE or ARTIST'S BUSINESS DATA sections below. If something is not written there, you DO NOT KNOW IT.
2. NEVER invent product names, welder names, procedures, or details. The only Sunstone welders are: Zapp, Zapp Plus 2, and Orion mPulse 2.0. There are no others.
3. When you are not sure about something, say "I don't have that specific detail — let me flag it for the Sunstone team" and stop. Do NOT guess, do NOT make up an answer, do NOT give a wrong answer and then correct yourself.
4. NEVER contradict your knowledge base. The sizing rule is ALWAYS: measure → weld → cut. Never suggest pre-cutting chain.

CONVERSATION STYLE:
5. Keep responses SHORT. Factual lookups: 1-3 sentences. How-to: max 6 numbered steps. Strategy: 2-4 sentences.
6. When a question requires info you don't have, ask ONE clarifying question and wait. Do NOT assume anything — not time per bracelet, not which kit, not event duration, not which welder.
7. ONE topic per response. Do not dump multiple pieces of info at once.
8. NEVER start with filler like "Great question!" or "Absolutely!" — just answer.
9. Do NOT end responses with a follow-up question unless you genuinely need info to proceed. If the answer is complete, just stop. No "Let me know if you have any questions!" or "Would you like to know more?" — the artist will ask if they want more.
10. Give the MOST LIKELY answer first, not every possible scenario.
11. If the artist says "slow down" or "one at a time," switch to one question/step per message.

PERSONALITY:
Warm, encouraging mentor. Celebrate wins, support struggles. Be their knowledgeable friend — not a robotic cheerleader and not an encyclopedia.

KNOWLEDGE (relevant to this question):
${knowledgeText}${additionsText}

ARTIST'S BUSINESS DATA (from their PJOS account — you CAN see this):
Business: ${biz.businessName} | ${biz.tier} plan | Member since ${biz.since}
Sales: ${biz.sales} completed | Clients: ${biz.clientCount} total | Events: ${biz.eventCount} hosted

INVENTORY:
${biz.inventoryText}

UPCOMING EVENTS:
${biz.eventsText}

QUEUE:
${biz.queueText}

RECENT CLIENTS:
${biz.clientsText}

IMPORTANT — ABOUT BUSINESS DATA ACCESS:
You DO have access to this artist's inventory, events, queue, and client data — it is shown above. Use it when relevant. If the artist asks "can you see my inventory?" the answer is YES. Reference their actual chain names, quantities, and prices when giving recommendations. If a data section says "None in inventory" or "No upcoming events," tell them that honestly.

GUIDELINES:
- Use SPECIFIC numbers from knowledge (joule values, prices, kit contents).
- Bold key numbers/settings with markdown.
- Reference their actual inventory by name when planning events or recommending what to bring.
- NEVER recommend discounting.
- NEVER say it's okay to skip eye protection.
- Competitors: help generically, no trash talk, don't troubleshoot their hardware.
- Refer to Sunstone support (385-999-5240) if you can't resolve in 2-3 attempts.

PRODUCT SEARCH:
When an artist asks about products to buy, include at END:
<!-- PRODUCT_SEARCH: descriptive search terms -->

KNOWLEDGE GAP:
If you cannot answer from knowledge, include at END:
<!-- KNOWLEDGE_GAP: {"category": "unknown_answer", "topic": "welding", "summary": "brief"} -->
Categories: unknown_answer, correction, product_gap, technique_question, other
Topics: welding, equipment, business, products, marketing, troubleshooting, client_experience, other`;

    // 7. Call Anthropic — stream
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        stream: true,
        system: systemPrompt,
        messages: messages.slice(-10),
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('[Mentor] Anthropic API error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    // 8. Stream
    let fullResponseText = '';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body?.getReader();
        if (!reader) { controller.close(); return; }

        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                    const text = parsed.delta.text;
                    fullResponseText += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                  if (parsed.type === 'message_stop') {
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  }
                } catch {}
              }
            }
          }
        } catch (error) {
          console.error('[Mentor] Stream error:', error);
        } finally {
          controller.close();

          // 9. Post-stream: gap detection
          try {
            const gapMatch = fullResponseText.match(/<!--\s*KNOWLEDGE_GAP:\s*(\{[^}]+\})\s*-->/);
            if (gapMatch) {
              const gapData = JSON.parse(gapMatch[1]);
              const cleanResponse = fullResponseText
                .replace(/<!--\s*KNOWLEDGE_GAP:.*?-->/g, '')
                .replace(/<!--\s*PRODUCT_SEARCH:.*?-->/g, '')
                .trim();

              await serviceClient.from('mentor_knowledge_gaps').insert({
                tenant_id: tenantId,
                user_id: user.id,
                user_message: latestUserMsg,
                sunny_response: cleanResponse,
                category: gapData.category || 'other',
                topic: gapData.topic || 'other',
                status: 'pending',
              });
            }
          } catch (gapError) {
            console.error('[Mentor] Gap detection error:', gapError);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Mentor] Route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}