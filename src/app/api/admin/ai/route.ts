// ============================================================================
// Admin AI Route — src/app/api/admin/ai/route.ts
// ============================================================================
// POST endpoint for platform admin AI assistant ("Atlas").
// Fetches comprehensive platform data, then calls Anthropic with streaming
// to provide insights, analytics, and custom reports.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ============================================================================
// Comprehensive Platform Data Fetcher
// ============================================================================

async function getPlatformData(serviceClient: any) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  try {
    // ====================================================================
    // TENANTS
    // ====================================================================
    const { data: allTenants, count: tenantCount } = await serviceClient
      .from('tenants')
      .select('id, name, slug, subscription_tier, fee_handling, created_at, is_suspended, square_merchant_id, stripe_account_id', { count: 'exact' });

    const tenantsByTier: Record<string, number> = {};
    const tenantsThisMonth: string[] = [];
    const tenantsWithPayment: number[] = [0, 0]; // [square, stripe]

    (allTenants || []).forEach((t: any) => {
      tenantsByTier[t.subscription_tier] = (tenantsByTier[t.subscription_tier] || 0) + 1;
      if (new Date(t.created_at) >= startOfMonth) tenantsThisMonth.push(t.name);
      if (t.square_merchant_id) tenantsWithPayment[0]++;
      if (t.stripe_account_id) tenantsWithPayment[1]++;
    });

    // ====================================================================
    // SALES — overall
    // ====================================================================
    const { data: allSales } = await serviceClient
      .from('sales')
      .select('id, tenant_id, subtotal, tax_amount, tip_amount, platform_fee_amount, total, payment_method, fee_handling, status, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    const completedSales = allSales || [];
    const totalRevenue = completedSales.reduce((s: number, sale: any) =>
      s + Number(sale.subtotal) + Number(sale.tax_amount) + Number(sale.tip_amount), 0);
    const totalPlatformFees = completedSales.reduce((s: number, sale: any) =>
      s + Number(sale.platform_fee_amount), 0);

    // Monthly revenue
    const thisMonthSales = completedSales.filter((s: any) => new Date(s.created_at) >= startOfMonth);
    const lastMonthSales = completedSales.filter((s: any) => {
      const d = new Date(s.created_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });
    const thisWeekSales = completedSales.filter((s: any) => new Date(s.created_at) >= startOfWeek);
    const todaySales = completedSales.filter((s: any) => new Date(s.created_at) >= startOfToday);

    const calcRevenue = (sales: any[]) => sales.reduce((s: number, sale: any) =>
      s + Number(sale.subtotal) + Number(sale.tax_amount) + Number(sale.tip_amount), 0);
    const calcFees = (sales: any[]) => sales.reduce((s: number, sale: any) =>
      s + Number(sale.platform_fee_amount), 0);

    // Revenue by tenant
    const revenueByTenant: Record<string, { name: string; revenue: number; sales: number }> = {};
    const tenantNameMap = (allTenants || []).reduce((acc: Record<string, string>, t: any) => {
      acc[t.id] = t.name;
      return acc;
    }, {});

    completedSales.forEach((sale: any) => {
      const tid = sale.tenant_id;
      if (!revenueByTenant[tid]) {
        revenueByTenant[tid] = { name: tenantNameMap[tid] || 'Unknown', revenue: 0, sales: 0 };
      }
      revenueByTenant[tid].revenue += Number(sale.subtotal) + Number(sale.tax_amount) + Number(sale.tip_amount);
      revenueByTenant[tid].sales += 1;
    });

    const topTenantsByRevenue = Object.values(revenueByTenant)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    completedSales.forEach((s: any) => {
      paymentBreakdown[s.payment_method] = (paymentBreakdown[s.payment_method] || 0) + 1;
    });

    // Daily sales last 7 days
    const dailySales: { date: string; count: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const daySales = completedSales.filter((s: any) => s.created_at.startsWith(dayStr));
      dailySales.push({
        date: dayStr,
        count: daySales.length,
        revenue: calcRevenue(daySales),
      });
    }

    // ====================================================================
    // SALE ITEMS — top products
    // ====================================================================
    const { data: recentItems } = await serviceClient
      .from('sale_items')
      .select('name, quantity, unit_price, line_total')
      .order('created_at', { ascending: false })
      .limit(500);

    const productCounts: Record<string, { count: number; revenue: number }> = {};
    (recentItems || []).forEach((item: any) => {
      const name = item.name;
      if (!productCounts[name]) productCounts[name] = { count: 0, revenue: 0 };
      productCounts[name].count += Number(item.quantity);
      productCounts[name].revenue += Number(item.line_total);
    });

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([name, data]) => ({ name, ...data }));

    // ====================================================================
    // EVENTS
    // ====================================================================
    const { data: allEvents, count: eventCount } = await serviceClient
      .from('events')
      .select('id, tenant_id, name, location, start_time, booth_fee, is_active', { count: 'exact' })
      .order('start_time', { ascending: false })
      .limit(100);

    const upcomingEvents = (allEvents || []).filter((e: any) => new Date(e.start_time) > now);
    const pastEvents = (allEvents || []).filter((e: any) => new Date(e.start_time) <= now);

    // ====================================================================
    // CLIENTS
    // ====================================================================
    const { count: clientCount } = await serviceClient
      .from('clients')
      .select('id', { count: 'exact', head: true });

    const { count: newClientsThisMonth } = await serviceClient
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // ====================================================================
    // QUEUE
    // ====================================================================
    const { data: recentQueue } = await serviceClient
      .from('queue_entries')
      .select('status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const queueStats = {
      total: (recentQueue || []).length,
      served: (recentQueue || []).filter((q: any) => q.status === 'served').length,
      noShow: (recentQueue || []).filter((q: any) => q.status === 'no_show').length,
    };

    // ====================================================================
    // MENTOR / SUNNY KNOWLEDGE GAPS
    // ====================================================================
    const { data: recentGaps } = await serviceClient
      .from('mentor_knowledge_gaps')
      .select('id, user_message, sunny_response, category, topic, status, created_at, tenant_id')
      .order('created_at', { ascending: false })
      .limit(50);

    const pendingGaps = (recentGaps || []).filter((g: any) => g.status === 'pending');

    // Topic frequency from gaps
    const gapTopics: Record<string, number> = {};
    const gapCategories: Record<string, number> = {};
    (recentGaps || []).forEach((g: any) => {
      if (g.topic) gapTopics[g.topic] = (gapTopics[g.topic] || 0) + 1;
      if (g.category) gapCategories[g.category] = (gapCategories[g.category] || 0) + 1;
    });

    // Recent gap questions (for analysis)
    const recentGapQuestions = pendingGaps.slice(0, 20).map((g: any) => ({
      question: g.user_message,
      topic: g.topic,
      category: g.category,
      tenant: tenantNameMap[g.tenant_id] || 'Unknown',
      date: g.created_at,
    }));

    // ====================================================================
    // MENTOR KNOWLEDGE ADDITIONS
    // ====================================================================
    const { count: activeAdditions } = await serviceClient
      .from('mentor_knowledge_additions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // ====================================================================
    // INVENTORY HEALTH
    // ====================================================================
    const { data: lowStock } = await serviceClient
      .from('inventory_items')
      .select('name, type, quantity_on_hand, reorder_threshold, tenant_id')
      .eq('is_active', true)
      .filter('quantity_on_hand', 'lte', 'reorder_threshold');

    const lowStockItems = (lowStock || []).slice(0, 20).map((item: any) => ({
      name: item.name,
      type: item.type,
      qty: Number(item.quantity_on_hand),
      threshold: Number(item.reorder_threshold),
      tenant: tenantNameMap[item.tenant_id] || 'Unknown',
    }));

    // ====================================================================
    // WAIVERS
    // ====================================================================
    const { count: waiverCount } = await serviceClient
      .from('waivers')
      .select('id', { count: 'exact', head: true });

    const { count: waiversThisMonth } = await serviceClient
      .from('waivers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // ====================================================================
    // ASSEMBLE
    // ====================================================================
    return {
      snapshot_date: now.toISOString(),

      tenants: {
        total: tenantCount || 0,
        byTier: tenantsByTier,
        newThisMonth: tenantsThisMonth,
        paymentConnected: { square: tenantsWithPayment[0], stripe: tenantsWithPayment[1] },
        suspended: (allTenants || []).filter((t: any) => t.is_suspended).length,
      },

      revenue: {
        allTime: {
          total: totalRevenue,
          platformFees: totalPlatformFees,
          salesCount: completedSales.length,
        },
        thisMonth: {
          total: calcRevenue(thisMonthSales),
          platformFees: calcFees(thisMonthSales),
          salesCount: thisMonthSales.length,
        },
        lastMonth: {
          total: calcRevenue(lastMonthSales),
          platformFees: calcFees(lastMonthSales),
          salesCount: lastMonthSales.length,
        },
        thisWeek: {
          total: calcRevenue(thisWeekSales),
          salesCount: thisWeekSales.length,
        },
        today: {
          total: calcRevenue(todaySales),
          salesCount: todaySales.length,
        },
        dailyLast7Days: dailySales,
        paymentMethodBreakdown: paymentBreakdown,
        topTenantsByRevenue,
      },

      products: {
        topSellingProducts: topProducts,
      },

      events: {
        total: eventCount || 0,
        upcoming: upcomingEvents.slice(0, 10).map((e: any) => ({
          name: e.name,
          location: e.location,
          date: e.start_time,
          boothFee: Number(e.booth_fee),
          tenant: tenantNameMap[e.tenant_id] || 'Unknown',
        })),
        recentPast: pastEvents.slice(0, 10).map((e: any) => ({
          name: e.name,
          location: e.location,
          date: e.start_time,
          tenant: tenantNameMap[e.tenant_id] || 'Unknown',
        })),
      },

      clients: {
        total: clientCount || 0,
        newThisMonth: newClientsThisMonth || 0,
      },

      queue: {
        last30Days: queueStats,
        serveRate: queueStats.total > 0
          ? ((queueStats.served / queueStats.total) * 100).toFixed(1) + '%'
          : 'N/A',
      },

      waivers: {
        total: waiverCount || 0,
        thisMonth: waiversThisMonth || 0,
      },

      sunny: {
        totalGaps: (recentGaps || []).length,
        pendingGaps: pendingGaps.length,
        activeKnowledgeAdditions: activeAdditions || 0,
        gapTopicBreakdown: gapTopics,
        gapCategoryBreakdown: gapCategories,
        recentPendingQuestions: recentGapQuestions,
      },

      inventoryHealth: {
        lowStockItems,
      },
    };
  } catch (err) {
    console.error('Failed to fetch platform data:', err);
    return { error: 'Failed to gather platform data', details: String(err) };
  }
}

// ============================================================================
// POST handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyPlatformAdmin();
    const serviceClient = await createServiceRoleClient();

    const body = await req.json();
    const { messages } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Fetch comprehensive platform data
    const platformData = await getPlatformData(serviceClient);

    // Build system prompt
    const systemPrompt = `You are Atlas, the platform intelligence assistant for Sunstone PJOS. You help Tony (the platform admin and founder of Sunstone Supply) understand how the platform is performing, what artists need, and where to focus next.

You have access to real-time platform data from the Sunstone PJOS database. Use this data to answer questions accurately with specific numbers.

PLATFORM DATA (real-time snapshot):
${JSON.stringify(platformData, null, 2)}

YOUR CAPABILITIES:
- Analyze revenue trends, growth rates, and financial health
- Identify which tenants are most active or need attention
- Analyze what artists are asking Sunny (the AI mentor) and where knowledge gaps exist
- Spot patterns in sales data (top products, payment methods, event performance)
- Generate custom reports and summaries on demand
- Provide strategic recommendations based on data
- Track queue performance and customer flow
- Monitor inventory health across tenants
- Compare month-over-month and week-over-week metrics

RESPONSE GUIDELINES:
- Lead with the most important insight or answer
- Use specific numbers from the data — don't generalize when you have exact figures
- Format currency as $X,XXX.XX
- Use percentages for comparisons and rates
- When asked for reports, structure them clearly with headers and sections
- Bold key metrics using markdown
- If a trend is positive, note it. If something needs attention, flag it clearly.
- Be direct and actionable — Tony is a busy founder
- If asked something the data doesn't cover, say so clearly rather than guessing
- When analyzing Sunny's gaps, provide specific insights: what topics come up most, what knowledge should be added, what patterns suggest about artist needs

PERSONALITY:
- Sharp, analytical, and concise
- Data-driven but accessible — explain what the numbers mean
- Proactive: if you notice something interesting in the data while answering, mention it
- Strategic: connect data points to business implications

PLATFORM ARCHITECTURE & OPERATIONS:
Sunstone PJOS is a multi-tenant SaaS platform for permanent jewelry artists. Built with Next.js 15, Supabase, and Tailwind CSS. Deployed at sunstonepj.app.

Core Feature Set:
- Events: Artists create events (pop-ups, private parties, bridal), each with its own POS, queue, QR code, and P&L tracking
- Event Mode POS: Step-through product selection (product type → material → chain → measure), cart with discounts/tips, multiple payment methods (Card, Cash, Venmo, Other)
- Store Mode POS: Same POS for everyday walk-in sales without an event context
- Inventory: Chain products (buy by inch, sell by piece), jump rings (auto-deducted on sale), charms, connectors — with reorder thresholds and low-stock alerts
- Queue: QR-code-based waiver check-in, SMS notifications, real-time status tracking (Waiting → Notified → Served/No Show)
- Digital Waivers: Built-in waiver with signature capture, PDF generation, shareable link
- Clients/CRM: Customer database built from waiver signatures, waiver history per client
- Reports: Revenue breakdown, P&L by event, COGS tracking, CSV export, payment method breakdown
- Team Management: Invite members with roles (Admin/Manager/Staff), permissions-based access
- Sunny AI Mentor: Tenant-facing AI with keyword-matched knowledge base, question metering on Starter
- Atlas AI: Platform admin intelligence (this is you)

Subscription Tiers:
- Starter (Free): 3% platform fee, 5 Sunny questions/month, 1 team member, basic POS and inventory
- Pro ($129/month): 1.5% platform fee, unlimited Sunny, full reports, CRM, AI insights, 3 team members
- Business ($279/month): 0% platform fee, everything in Pro, unlimited team members, priority support
- Trial: 60-day Pro trial for new accounts, defaults to Starter after expiry

Revenue Model:
- Platform fees on each sale (3%/1.5%/0% by tier) — tenants choose to pass to customer or absorb
- Monthly subscriptions (Pro $129, Business $279)

TENANT HEALTH SIGNALS — How to interpret the data:
- Active events in last 30 days = healthy, engaged tenant
- No events in 30+ days = potential churn risk, may need outreach
- Trial expiring within 7 days = upsell opportunity — check their usage to make a data-informed recommendation
- High Sunny question volume = engaged and learning, good sign
- Zero sales but account > 30 days old = onboarding may have stalled, consider intervention
- Low stock items = active business needing inventory help, potential Sunstone Supply upsell
- Queue entries with high no-show rate = tenant may need help with SMS/waiver flow
- Multiple team members = growing business, potential Business tier upgrade candidate

COMMON TENANT ISSUES & RESOLUTIONS:
- "Payment processor not connected" → They need to add Square or Stripe API keys in Settings → Payment Processing
- "Inventory not deducting" → Product types may not be configured, or chain pricing mode is not set up correctly
- "SMS not sending" → Customer may not have provided a phone number on the waiver, or carrier delay
- "Can't invite team members" → Hit tier limit (Starter=1, Pro=3, Business=unlimited) — upgrade needed
- "Reports not showing" → Starter tier only gets basic metrics, need Pro or Business for full reports
- "QR code not working" → Usually a display size issue or customer internet connectivity

SUNNY KNOWLEDGE GAP SYSTEM:
- When Sunny can't answer a question, she logs it to the mentor_knowledge_gaps table
- Gaps have categories: unknown_answer, correction, product_gap, technique_question, other
- Gaps have topics: welding, equipment, business, products, marketing, troubleshooting, client_experience, other
- Pending gaps need review — you can suggest answers for Tony to approve as mentor_knowledge_additions
- High gap volume in a specific topic = knowledge base needs expansion in that area
- Recurring gaps on the same question = high-priority addition needed

ADMIN DASHBOARD UI:
The admin panel lives at /admin and uses an obsidian dark theme (#0F0F14 bg, #FF7A00 accent). It has a sidebar on desktop and bottom nav on mobile with a hamburger dropdown menu.

Pages:
- Overview (/admin): KPI cards (total tenants, this month revenue, platform fees, active events), quick stats, and platform health summary
- Tenants (/admin/tenants): Searchable tenant list with sort by name/created/tier. Click a tenant to see their full profile (subscription, sales, events, inventory, team, Sunny usage). "Needs Attention" section at top shows flagged tenants (trial expiring, no events in 30+ days, no payment processor, zero sales but old account). Each suggestion has a "View" button to jump to that tenant's profile.
- Revenue (/admin/revenue): Revenue analytics with charts, platform fee breakdown by tier, month-over-month comparisons, top tenants by revenue
- Broadcast (/admin with modal): Send messages to tenants filtered by tier or status. Compose modal with recipient filters and message body.
- Sunny Learning (/admin/sunny): View Sunny's knowledge gaps — questions she couldn't answer. Review pending gaps, approve/reject suggested answers, add new knowledge entries that get injected into Sunny's responses. Gap list shows question, topic, category, tenant, and date.

Mobile Navigation:
- Bottom nav bar with Overview, Tenants, Revenue, Sunny icons
- Top header with hamburger menu dropdown containing "Tenant Dashboard" (go to /dashboard) and "Sign Out"

ONBOARDING SYSTEM:
New tenant signup flow: business name, owner name, email, phone, password → email verification → guided onboarding at /onboarding.

Onboarding is an 8-step wizard:
0. Welcome — personalized greeting with owner's first name
1. Business Name — pre-filled from signup, editable
2. Phone — phone number with SMS consent
3. Experience — how long they've been doing PJ (just starting, <1yr, 1-3yr, 3+yr)
4. Kit Selection — choose Sunstone starter kit (Momentum $249, Dream $399, Legacy $649) or skip
5. Pricing — set product prices (by type, by metal, by markup, or individual)
6. Theme Picker — choose from 9 visual themes with live preview
7. Grand Reveal — summary and "Start Exploring" button

Kit auto-populate: When an artist selects a kit, the system auto-creates inventory items matching their physical kit contents:
- Momentum: 7 chains (Chloe, Olivia, Marlee, Lavina, Ella, Paisley, Maria), 25+25 jump rings
- Dream: 9 chains (all Momentum + Alessia, Benedetta), 50+50 jump rings, birthstone connectors
- Legacy: 15 chains (all Dream + Charlie, Lucy, Grace, Bryce, Hannah, Ruby), 100+100 jump rings, birthstone connectors

Onboarding state is persisted: onboarding_step (integer) and onboarding_data (JSONB) on the tenants table. Artists resume where they left off if they close the browser.

Owners who haven't completed onboarding are redirected from /dashboard to /onboarding. Team members skip onboarding entirely.

SUNNY'S TIPS (Tutorial System):
After onboarding, Sunny shows per-page tutorial tips via a floating pill in the bottom-right corner. Each dashboard page has 2-3 contextual tips. Once an owner completes the tips for a page, they don't appear again. Progress is tracked in the tutorial_progress table (user_id, tenant_id, page_key, completed).

DASHBOARD GETTING STARTED CHECKLIST:
The dashboard shows a "Getting Started" card with 5 checks:
1. Connect a payment processor (Square or Stripe)
2. Create your first event
3. Add inventory items
4. Make your first sale
5. Set your tax rate
The card can be dismissed (stored in onboarding_data.getting_started_dismissed). It only shows for owners who have completed onboarding.

TRIAL SYSTEM:
- New accounts get a 60-day Pro trial
- Trial expiry date stored on tenant
- After expiry, account downgrades to Starter (free) tier
- Trial tenants approaching expiry are flagged in admin "Needs Attention"`;

    // Trim conversation
    const conversationMessages = messages.slice(-20);

    // Call Anthropic API with streaming
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: conversationMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 502 });
    }

    // Stream response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
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
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                    );
                  }
                  if (parsed.type === 'message_stop') {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
                    );
                  }
                } catch {}
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Admin AI route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}