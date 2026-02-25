// src/app/api/mentor/route.ts
// POST endpoint for Sunny mentor chat with streaming responses
// Handles: knowledge base, business context, learning gap detection, product search markers

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { SUNNY_MENTOR_KNOWLEDGE } from '@/lib/mentor-knowledge';

// ============================================================================
// Build knowledge string from nested object
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
    // Check if array of simple values
    if (typeof obj[0] === 'string' || typeof obj[0] === 'number') {
      return obj.map((item, i) => `${indent}- ${item}`).join('\n');
    }
    // Array of objects
    return obj.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return buildKnowledgeString(item, depth, `[${i + 1}] `);
      }
      return `${indent}- ${item}`;
    }).join('\n');
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      // Clean up key for readability
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
// Fetch business context for personalization
// ============================================================================

async function fetchBusinessContext(serviceClient: any, tenantId: string) {
  try {
    // Tenant info
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('name, subscription_tier, created_at')
      .eq('id', tenantId)
      .single();

    // Sales count
    const { count: salesCount } = await serviceClient
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed');

    // Revenue this month
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

    // Top 3 products
    const { data: topProducts } = await serviceClient
      .from('sale_items')
      .select('product_name, quantity')
      .eq('tenant_id', tenantId)
      .order('quantity', { ascending: false })
      .limit(20);

    // Aggregate top products
    const productMap: Record<string, number> = {};
    (topProducts || []).forEach((p: any) => {
      productMap[p.product_name] = (productMap[p.product_name] || 0) + (p.quantity || 1);
    });
    const top3Products = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name} (${qty} sold)`);

    // Inventory summary
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

    // Events count
    const { count: eventsCount } = await serviceClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Clients count
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

    // 4. Fetch business context + approved additions in parallel
    const [businessContext, additionsResult] = await Promise.all([
      fetchBusinessContext(serviceClient, tenantId),
      serviceClient
        .from('mentor_knowledge_additions')
        .select('question, answer, category')
        .eq('is_active', true),
    ]);

    const approvedAdditions = additionsResult.data || [];

    // 5. Build system prompt
    const staticKnowledge = buildKnowledgeString(SUNNY_MENTOR_KNOWLEDGE);

    const additionsText = approvedAdditions.length > 0
      ? `\n\nADDITIONAL LEARNED KNOWLEDGE (approved by Sunstone):\n${approvedAdditions.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
      : '';

    const systemPrompt = `You are Sunny, the official AI mentor for Sunstone Permanent Jewelry. You live inside the Sunstone PJOS app and help permanent jewelry artists succeed.

CORE KNOWLEDGE BASE:
${staticKnowledge}
${additionsText}

ARTIST'S BUSINESS CONTEXT:
${JSON.stringify(businessContext)}

RESPONSE GUIDELINES:
- Keep responses concise: 3-8 sentences for simple questions, longer for tutorials/guides
- Use bullet points or numbered steps for how-to instructions
- Include SPECIFIC settings and numbers from the knowledge base (exact joule values per welder/metal/gauge)
- Bold key terms and important numbers using markdown
- Reference the artist's business data when relevant (e.g. "You've done ${businessContext.totalSales} sales so far — nice work!")
- End complex answers with an invitation to dig deeper
- When you genuinely don't know something, say: "That's a great question — I want to make sure I give you the right answer. Let me flag this for the Sunstone team to get back to you on." Do NOT guess or make up technical information.
- When relevant, reference specific PJ University modules by name
- NEVER recommend discounting — steer toward value and confidence
- NEVER say it's okay to skip eye protection
- Help non-Sunstone-welder users generically but don't troubleshoot competitor hardware
- Help artists using non-Sunstone chains freely
- Take the high road on competitors — no trash talk
- Refer to Sunstone support (call or text 385-999-5240) when you can't resolve something in 2-3 attempts
- For product recommendations, describe what to look for and note you can search the Sunstone catalog

PRODUCT SEARCH:
When an artist asks about specific products (chains, jump rings, charms, connectors, tools, kits, or supplies), include this marker at the END of your response (after all visible text):
<!-- PRODUCT_SEARCH: descriptive search terms -->
Use descriptive terms based on what they asked for. Example: "gold filled chain" or "sterling silver jump rings 24g".
Only include the marker when product search would genuinely help — not for every question.

KNOWLEDGE GAP PROTOCOL:
If you cannot answer a question from your knowledge base, or if the artist corrects you on something, include this exact marker at the END of your response (after your visible reply and after any PRODUCT_SEARCH marker):
<!-- KNOWLEDGE_GAP: {"category": "unknown_answer", "topic": "welding", "summary": "brief description"} -->
Categories: unknown_answer, correction, product_gap, technique_question, other
Topics: welding, equipment, business, products, marketing, troubleshooting, client_experience, other
Only include this when you genuinely cannot answer from your knowledge base.

PERSONALITY:
You are a warm, encouraging mentor with "You can do this!" energy. Be genuine — not a robotic cheerleader. Read the room. Celebrate wins, support struggles, give honest guidance when needed. You're their knowledgeable friend in the PJ business.`;

    // 6. Call Anthropic API with streaming
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        messages: messages.slice(-20), // Last 20 messages for context
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('[Mentor] Anthropic API error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    // 7. Stream response while buffering for gap detection
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
                    // Forward SSE to client
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

          // 8. Post-stream: detect knowledge gaps
          try {
            const gapMatch = fullResponseText.match(/<!--\s*KNOWLEDGE_GAP:\s*(\{[^}]+\})\s*-->/);
            if (gapMatch) {
              const gapData = JSON.parse(gapMatch[1]);
              // Clean the response (remove marker) for storage
              const cleanResponse = fullResponseText.replace(/<!--\s*KNOWLEDGE_GAP:.*?-->/g, '').trim();

              await serviceClient.from('mentor_knowledge_gaps').insert({
                tenant_id: tenantId,
                user_id: user.id,
                user_message: lastUserMessage,
                sunny_response: cleanResponse.replace(/<!--\s*PRODUCT_SEARCH:.*?-->/g, '').trim(),
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