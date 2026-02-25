// src/app/api/mentor/route.ts
// POST endpoint for Sunny mentor chat with streaming responses
// ============================================================================
// V2: Keyword-based section selection instead of sending full knowledge base.
// Only 2-3 relevant sections included per question (~3-5K tokens vs ~15K+).
// Also includes verbosity constraints in the system prompt.
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
// Knowledge sections with keyword mappings
// ============================================================================

interface KnowledgeSection {
  key: string;
  label: string;
  data: any;
  keywords: string[];
}

const KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    key: 'equipment',
    label: 'EQUIPMENT & SETTINGS',
    data: EQUIPMENT_KNOWLEDGE,
    keywords: [
      'welder', 'zapp', 'mpulse', 'orion', 'pulse', 'trufire', 'tru fire',
      'kit', 'momentum', 'dream', 'legacy', 'electrode', 'tungsten',
      'argon', 'gas', 'stylus', 'equipment', 'setup', 'set up', 'settings',
      'joule', 'power', 'machine', 'regulator', 'flowmeter', 'flow meter',
      'sharpen', 'optic', 'scope', 'adl', 'on demand', 'ondemand', 'rental',
    ],
  },
  {
    key: 'weldingTechnique',
    label: 'WELDING TECHNIQUE',
    data: WELDING_TECHNIQUE_KNOWLEDGE,
    keywords: [
      'weld', 'technique', 'touch', 'arc', 'ground', 'grounding',
      'angle', 'practice', 'gauge', 'jump ring', 'jumpring',
      'close', 'gap', 'overlap', 'position', 'steady',
      'chain link', 'fuse', 'leather', 'patch', 'eye', 'safety',
      'glasses', 'protection', 'fiberglass', 'brush', 'soot',
    ],
  },
  {
    key: 'troubleshooting',
    label: 'TROUBLESHOOTING',
    data: TROUBLESHOOTING_KNOWLEDGE,
    keywords: [
      'troubleshoot', 'problem', 'issue', 'break', 'broke', 'breaking',
      'abort', 'burn', 'dark spot', 'discolor', 'inconsistent', 'fix',
      'help', 'not working', 'won\'t hold', 'doesn\'t hold', 'weak',
      'too low', 'too high', 'fuse together', 'links fusing',
      'escalat', 'support', 'malfunction', 'error',
    ],
  },
  {
    key: 'products',
    label: 'PRODUCTS, CHAINS & INVENTORY',
    data: PRODUCTS_KNOWLEDGE,
    keywords: [
      'chain', 'gold', 'silver', 'sterling', 'stainless', 'steel',
      'bracelet', 'anklet', 'necklace', 'ring', 'charm', 'connector',
      'metal', 'gauge', 'inch', 'size', 'measure', 'measurement',
      'fit', 'fitting', 'clasp', 'tier', 'inventory', 'stock',
      'supplier', 'supply', 'reorder', 'order', 'sunstone supply',
      'ready to wear', 'enamel', 'plated', 'gold fill', 'filled',
      'solid gold', '14k', '10k', 'karat', 'rose', 'white gold',
      'imprinted', 'stuller', 'rio grande',
    ],
  },
  {
    key: 'businessStrategy',
    label: 'BUSINESS STRATEGY',
    data: BUSINESS_STRATEGY_KNOWLEDGE,
    keywords: [
      'price', 'pricing', 'business', 'event', 'pop up', 'popup',
      'house party', 'market', 'booth', 'revenue', 'profit', 'margin',
      'salon', 'brick and mortar', 'store', 'permanent location',
      'insurance', 'llc', 'legal', 'license', 'tax', 'entity',
      'budget', 'cost', 'fee', 'startup', 'start up',
      'tip', 'tipping', 'money', 'earn', 'income',
      'pack', 'packing', 'checklist', 'plan', 'schedule',
      'pjx', 'conference', 'expo', 'wholesale',
    ],
  },
  {
    key: 'clientExperience',
    label: 'CLIENT EXPERIENCE',
    data: CLIENT_EXPERIENCE_KNOWLEDGE,
    keywords: [
      'client', 'customer', 'experience', 'waiver', 'upsell',
      'aftercare', 'care', 'appointment', 'consultation', 'checkout',
      'greeting', 'welcome', 'service', 'flow', 'step',
      'display', 'presentation', 'booking', 'walk in',
      'repeat', 'retention', 'follow up', 'thank you',
      'photo', 'selfie', 'social proof', 'review',
    ],
  },
  {
    key: 'marketing',
    label: 'MARKETING',
    data: MARKETING_KNOWLEDGE,
    keywords: [
      'marketing', 'social media', 'instagram', 'facebook', 'tiktok',
      'content', 'photo', 'video', 'reel', 'brand', 'branding',
      'logo', 'website', 'network', 'networking', 'referral',
      'community', 'group', 'promote', 'promotion', 'advertis',
      'post', 'hashtag', 'engage', 'audience', 'follower',
      'collab', 'partnership', 'flyer', 'card', 'business card',
    ],
  },
];

// ============================================================================
// Section selection based on keyword matching
// ============================================================================

function selectRelevantSections(userMessage: string, recentMessages: string[]): KnowledgeSection[] {
  // Combine current message with recent context for better matching
  const searchText = [userMessage, ...recentMessages.slice(-2)]
    .join(' ')
    .toLowerCase();

  // Score each section
  const scored = KNOWLEDGE_SECTIONS.map(section => {
    let score = 0;
    for (const keyword of section.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // Exact word matches score higher for short keywords
        score += keyword.length > 4 ? 2 : 1;
      }
    }
    return { section, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top sections with score > 0, max 3
  const selected = scored
    .filter(s => s.score > 0)
    .slice(0, 3)
    .map(s => s.section);

  // If nothing matched, include the most commonly needed sections
  if (selected.length === 0) {
    // Default to equipment + business strategy for generic questions
    return [KNOWLEDGE_SECTIONS[0], KNOWLEDGE_SECTIONS[4]];
  }

  return selected;
}

// ============================================================================
// Build knowledge string from nested object (unchanged from v1)
// ============================================================================

function buildKnowledgeString(obj: any, depth = 0, prefix = ''): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  if (typeof obj === 'string') {
    return `${indent}${prefix}${obj}`;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return `${indent}${prefix}${String(obj)}`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '';
    if (typeof obj[0] === 'string' || typeof obj[0] === 'number') {
      return obj.map((item) => `${indent}- ${item}`).join('\n');
    }
    return obj.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return buildKnowledgeString(item, depth, `[${i + 1}] `);
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
        lines.push(`${indent}${prefix}${label}: ${value}`);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        lines.push(`${indent}${prefix}${label}:`);
        value.forEach((v: string) => lines.push(`${indent}  - ${v}`));
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${indent}${prefix}${label}:`);
        lines.push(buildKnowledgeString(value, depth + 1));
      }
    }
  }

  return lines.filter(Boolean).join('\n');
}

// ============================================================================
// Build personality + behavior prompt (ALWAYS included)
// ============================================================================

function buildCorePrompt(): string {
  const personality = PJ_UNIVERSITY_AND_SUNNY_ROLE;
  return buildKnowledgeString({
    sunnyPersonality: personality.sunnyPersonality,
    sunnyBoundaries: personality.sunnyBoundaries,
    supportResources: personality.supportResources,
    mentoring: personality.mentoring,
  });
}

// ============================================================================
// Fetch business context for personalization
// ============================================================================

async function fetchBusinessContext(serviceClient: any, tenantId: string) {
  try {
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('name, subscription_tier, created_at')
      .eq('id', tenantId)
      .single();

    const { count: salesCount } = await serviceClient
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthSales } = await serviceClient
      .from('sales')
      .select('subtotal, tax_amount, tip_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const monthRevenue = (monthSales || []).reduce(
      (sum: number, s: any) => sum + (Number(s.subtotal) || 0) + (Number(s.tax_amount) || 0) + (Number(s.tip_amount) || 0),
      0
    );

    const { data: topProducts } = await serviceClient
      .from('sale_items')
      .select('product_name, quantity')
      .eq('tenant_id', tenantId)
      .order('quantity', { ascending: false })
      .limit(20);

    const productMap: Record<string, number> = {};
    (topProducts || []).forEach((p: any) => {
      productMap[p.product_name] = (productMap[p.product_name] || 0) + (p.quantity || 1);
    });
    const top3Products = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name} (${qty} sold)`);

    const { data: inventory } = await serviceClient
      .from('inventory')
      .select('type')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const inventorySummary = {
      chains: (inventory || []).filter((i: any) => i.type === 'chain').length,
      charms: (inventory || []).filter((i: any) => i.type === 'charm').length,
      jumpRings: (inventory || []).filter((i: any) => i.type === 'jump_ring').length,
      connectors: (inventory || []).filter((i: any) => i.type === 'connector').length,
    };

    const { count: eventsCount } = await serviceClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: clientsCount } = await serviceClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return {
      businessName: tenant?.name || 'Unknown',
      subscriptionTier: tenant?.subscription_tier || 'free',
      memberSince: tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown',
      totalSales: salesCount || 0,
      revenueThisMonth: `$${monthRevenue.toFixed(2)}`,
      topProducts: top3Products.length > 0 ? top3Products : ['No sales yet'],
      inventory: inventorySummary,
      eventsHosted: eventsCount || 0,
      totalClients: clientsCount || 0,
    };
  } catch (error) {
    console.error('[Mentor] Error fetching business context:', error);
    return {
      businessName: 'Your Business',
      subscriptionTier: 'unknown',
      memberSince: 'Unknown',
      totalSales: 0,
      revenueThisMonth: '$0.00',
      topProducts: ['No data available'],
      inventory: { chains: 0, charms: 0, jumpRings: 0, connectors: 0 },
      eventsHosted: 0,
      totalClients: 0,
    };
  }
}

// ============================================================================
// POST handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get tenant_id
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

    // 3. Parse request
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: 'user' | 'assistant'; content: string }> };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // 4. Select relevant knowledge sections based on the question
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content);

    const relevantSections = selectRelevantSections(latestUserMessage, recentUserMessages);

    // Build the relevant knowledge text (only matched sections)
    const sectionTexts = relevantSections.map(section =>
      `--- ${section.label} ---\n${buildKnowledgeString(section.data)}`
    ).join('\n\n');

    // 5. Fetch business context + approved additions in parallel
    const [businessContext, additionsResult] = await Promise.all([
      fetchBusinessContext(serviceClient, tenantId),
      serviceClient
        .from('mentor_knowledge_additions')
        .select('question, answer, category')
        .eq('is_active', true),
    ]);

    const approvedAdditions = additionsResult.data || [];

    const additionsText = approvedAdditions.length > 0
      ? `\n\nADDITIONAL LEARNED KNOWLEDGE (approved by Sunstone):\n${approvedAdditions.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
      : '';

    // 6. Build the LEAN system prompt
    const corePersonality = buildCorePrompt();

    const systemPrompt = `You are Sunny, the official AI mentor for Sunstone Permanent Jewelry. You live inside the Sunstone PJOS app and help permanent jewelry artists succeed.

PERSONALITY & BEHAVIOR:
${corePersonality}

RELEVANT KNOWLEDGE (for this question):
${sectionTexts}
${additionsText}

ARTIST'S BUSINESS CONTEXT:
Business: ${businessContext.businessName} (${businessContext.subscriptionTier} plan, member since ${businessContext.memberSince})
Sales: ${businessContext.totalSales} total, ${businessContext.revenueThisMonth} this month
Top products: ${businessContext.topProducts.join(', ')}
Inventory: ${businessContext.inventory.chains} chains, ${businessContext.inventory.charms} charms, ${businessContext.inventory.jumpRings} jump rings
Events: ${businessContext.eventsHosted} hosted | Clients: ${businessContext.totalClients}

RESPONSE LENGTH RULES (STRICT — follow these every time):
- Simple factual questions (settings, sizes, prices): 1-3 sentences. Just the answer.
  Example Q: "What setting for 24g gold fill on Zapp Plus?" → Just say the joule value and one tip. Done.
- How-to questions: Brief intro sentence, then numbered steps (max 8 steps). No rambling.
- Troubleshooting: Ask ONE clarifying question first ("What welder are you using?" or "Are you using argon?"). Then give the most likely fix first — not every possible fix.
- Business/strategy questions: 3-5 sentences with the key insight. Offer to go deeper only if warranted.
- NEVER repeat information the artist already provided in their question.
- NEVER start with "Great question!" or "I'd be happy to help!" or any preamble — just answer directly.
- NEVER list every possible scenario — give the MOST LIKELY answer first, then offer to elaborate.
- If the answer is in your knowledge, give it confidently. Don't hedge unless genuinely uncertain.
- Use markdown bold for key numbers and settings. Use bullet points only for multi-step instructions.

RESPONSE GUIDELINES:
- Include SPECIFIC settings and numbers from the knowledge base (exact joule values per welder/metal/gauge)
- Reference the artist's business data when relevant (e.g. "With ${businessContext.totalSales} sales under your belt...")
- When you genuinely don't know something, say: "That's a great question — I want to make sure I give you the right answer. Let me flag this for the Sunstone team." Do NOT guess technical information.
- NEVER recommend discounting — steer toward value and confidence
- NEVER say it's okay to skip eye protection
- Help non-Sunstone-welder users generically but don't troubleshoot competitor hardware
- Take the high road on competitors — no trash talk
- Refer to Sunstone support (call or text 385-999-5240) when you can't resolve something in 2-3 attempts

PRODUCT SEARCH:
When an artist asks about specific products (chains, jump rings, charms, tools, kits, or supplies), include this marker at the END of your response (after all visible text):
<!-- PRODUCT_SEARCH: descriptive search terms -->
Only include when product search would genuinely help.

KNOWLEDGE GAP PROTOCOL:
If you cannot answer from your knowledge base, or the artist corrects you, include at the END:
<!-- KNOWLEDGE_GAP: {"category": "unknown_answer", "topic": "welding", "summary": "brief description"} -->
Categories: unknown_answer, correction, product_gap, technique_question, other
Topics: welding, equipment, business, products, marketing, troubleshooting, client_experience, other`;

    // 7. Call Anthropic API with streaming
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024, // Reduced from 2048 — encourages concise responses
        stream: true,
        system: systemPrompt,
        messages: messages.slice(-20),
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('[Mentor] Anthropic API error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    // 8. Stream response while buffering for gap detection
    let fullResponseText = '';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

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
                } catch {
                  // Skip non-JSON lines
                }
              }
            }
          }
        } catch (error) {
          console.error('[Mentor] Stream error:', error);
        } finally {
          controller.close();

          // 9. Post-stream: detect knowledge gaps
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
                user_message: lastUserMessage,
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