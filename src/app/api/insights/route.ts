// ============================================================================
// AI Business Insights API — src/app/api/insights/route.ts
// ============================================================================
// GET: Gathers tenant business data and sends to Claude for analysis.
// Returns 3-5 actionable, mentor-style insights as JSON.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Insight {
  type: 'growth' | 'attention' | 'tip' | 'milestone';
  title: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/insights
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get tenant via service role
    const serviceClient = await createServiceRoleClient();

    const { data: membership } = await serviceClient
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;

    // 3. Gather business data
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // -- Sales: last 30 days
    const { data: recentSales } = await serviceClient
      .from('sales')
      .select(
        'id, subtotal, tax_amount, tip_amount, total, platform_fee_amount, payment_method, fee_handling, event_id, client_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // -- Sales: previous 30 days (for comparison)
    const { data: previousSales } = await serviceClient
      .from('sales')
      .select(
        'id, subtotal, tax_amount, tip_amount, total, platform_fee_amount, payment_method, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    // -- Sale items for recent sales (top sellers)
    const recentSaleIds = (recentSales || []).map((s) => s.id);
    let saleItems: any[] = [];
    if (recentSaleIds.length > 0) {
      const { data } = await serviceClient
        .from('sale_items')
        .select('sale_id, inventory_item_id, name, quantity, unit_price, line_total')
        .eq('tenant_id', tenantId)
        .in('sale_id', recentSaleIds);
      saleItems = data || [];
    }

    // -- Inventory alerts
    const { data: inventoryItems } = await serviceClient
      .from('inventory_items')
      .select(
        'id, name, type, quantity_on_hand, reorder_threshold, sell_price, cost_per_unit, is_active'
      )
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // -- Events: last 5 completed + next 3 upcoming
    const { data: pastEvents } = await serviceClient
      .from('events')
      .select('id, name, start_time, location, booth_fee')
      .eq('tenant_id', tenantId)
      .lt('start_time', now.toISOString())
      .order('start_time', { ascending: false })
      .limit(5);

    const { data: upcomingEvents } = await serviceClient
      .from('events')
      .select('id, name, start_time, location')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(3);

    // -- Clients
    const { count: totalClients } = await serviceClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: newClients30d } = await serviceClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // -- Repeat customers (clients with 2+ sales in last 30 days)
    const clientSaleCounts: Record<string, number> = {};
    (recentSales || []).forEach((s) => {
      if (s.client_id) {
        clientSaleCounts[s.client_id] = (clientSaleCounts[s.client_id] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(clientSaleCounts).filter((c) => c >= 2).length;

    // 4. Compute aggregates for the AI
    const sales30 = recentSales || [];
    const sales60 = previousSales || [];

    const revenue30 = sales30.reduce((sum, s) => sum + (s.subtotal || 0), 0);
    const revenue60 = sales60.reduce((sum, s) => sum + (s.subtotal || 0), 0);
    const tips30 = sales30.reduce((sum, s) => sum + (s.tip_amount || 0), 0);
    const avgSale30 = sales30.length > 0 ? revenue30 / sales30.length : 0;
    const avgTipPct = revenue30 > 0 ? (tips30 / revenue30) * 100 : 0;

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    sales30.forEach((s) => {
      const method = s.payment_method || 'other';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + 1;
    });

    // Top selling items by quantity
    const itemQuantities: Record<string, { name: string; qty: number; revenue: number }> = {};
    saleItems.forEach((si) => {
      const key = si.name || 'Unknown';
      if (!itemQuantities[key])
        itemQuantities[key] = { name: key, qty: 0, revenue: 0 };
      itemQuantities[key].qty += si.quantity || 1;
      itemQuantities[key].revenue += si.line_total || 0;
    });
    const topByQuantity = Object.values(itemQuantities)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    const topByRevenue = Object.values(itemQuantities)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Inventory alerts
    const lowStockItems = (inventoryItems || []).filter(
      (i) => i.quantity_on_hand <= i.reorder_threshold
    );
    const zeroStockItems = (inventoryItems || []).filter(
      (i) => i.quantity_on_hand <= 0
    );

    // Day-of-week analysis
    const dayRevenue: Record<string, { total: number; count: number }> = {};
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    sales30.forEach((s) => {
      const day = dayNames[new Date(s.created_at).getDay()];
      if (!dayRevenue[day]) dayRevenue[day] = { total: 0, count: 0 };
      dayRevenue[day].total += s.subtotal || 0;
      dayRevenue[day].count += 1;
    });

    // Event performance
    const eventPerformance = (pastEvents || []).map((ev) => {
      const eventSales = sales30.filter((s) => s.event_id === ev.id);
      const eventRevenue = eventSales.reduce((sum, s) => sum + (s.subtotal || 0), 0);
      return {
        name: ev.name,
        date: ev.start_time,
        salesCount: eventSales.length,
        revenue: Math.round(eventRevenue * 100) / 100,
        boothFee: ev.booth_fee || 0,
      };
    });

    // 5. Build the data payload for AI
    const businessData = {
      period: 'last_30_days',
      salesCount30: sales30.length,
      salesCount60: sales60.length,
      revenue30: Math.round(revenue30 * 100) / 100,
      revenue60: Math.round(revenue60 * 100) / 100,
      avgSaleValue: Math.round(avgSale30 * 100) / 100,
      avgTipPercentage: Math.round(avgTipPct * 10) / 10,
      tips30: Math.round(tips30 * 100) / 100,
      paymentMethods: paymentBreakdown,
      topItemsByQuantity: topByQuantity,
      topItemsByRevenue: topByRevenue,
      lowStockItems: lowStockItems.map((i) => ({
        name: i.name,
        type: i.type,
        onHand: i.quantity_on_hand,
        threshold: i.reorder_threshold,
      })),
      zeroStockCount: zeroStockItems.length,
      totalInventoryItems: (inventoryItems || []).length,
      eventPerformance,
      upcomingEvents: (upcomingEvents || []).map((e) => ({
        name: e.name,
        date: e.start_time,
        location: e.location,
      })),
      totalClients: totalClients || 0,
      newClients30d: newClients30d || 0,
      repeatCustomers,
      busiestDays: Object.entries(dayRevenue)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([day, data]) => ({
          day,
          revenue: Math.round(data.total * 100) / 100,
          sales: data.count,
        })),
    };

    // 6. Check if there's enough data for analysis
    if (
      sales30.length === 0 &&
      sales60.length === 0 &&
      (inventoryItems || []).length === 0
    ) {
      // New tenant — return welcoming insights without calling AI
      return NextResponse.json({
        insights: [
          {
            type: 'tip' as const,
            title: 'Welcome to Sunstone!',
            body: "You're all set up and ready to go! Start by adding your chain inventory and setting up your first event. I'll have personalized insights for your business once you start making sales.",
          },
          {
            type: 'tip' as const,
            title: 'Set Up Your Inventory',
            body: 'Head to Inventory to add your chains, charms, and jump rings. Once your products are in the system, checkout will be a breeze.',
          },
          {
            type: 'tip' as const,
            title: 'Create Your First Event',
            body: "Got a market, pop-up, or salon day coming up? Create an event to track sales, manage your queue, and see exactly how profitable each gig is.",
          },
        ],
        generatedAt: new Date().toISOString(),
        source: 'onboarding',
      });
    }

    // 7. Call Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json({
        insights: getFallbackInsights(businessData),
        generatedAt: new Date().toISOString(),
        source: 'fallback',
      });
    }

    const systemPrompt = `You are a friendly, experienced permanent jewelry business mentor named Sunny. You help women who run permanent jewelry businesses understand their numbers and grow their business.

Your personality:
- Warm, encouraging, and practical
- You celebrate wins genuinely
- You give honest, specific advice when something needs attention
- You reference specific numbers from their data
- You sound like a smart friend who's great with numbers — NOT a corporate BI dashboard

Rules:
- Return ONLY a valid JSON array of 3-5 insight objects
- Each insight: { "type": "growth|attention|tip|milestone", "title": "short title", "body": "2-3 sentences max" }
- Use type "growth" for positive trends worth celebrating
- Use type "attention" for things that need action (low stock, declining sales)
- Use type "tip" for optimization opportunities
- Use type "milestone" for achievements worth celebrating
- Reference specific numbers: "$X revenue", "Y clients", "Z% increase"
- Use warm language: "Your charm upsells are really paying off!" not "Accessory revenue increased"
- If data is sparse (few sales), give relevant onboarding tips mixed with any data observations
- Keep each insight to 2-3 sentences maximum
- Do NOT include any text outside the JSON array — no preamble, no explanation
- Make sure the JSON is valid and parseable`;

    const userMessage = `Here is the business data for a permanent jewelry artist. Analyze it and return 3-5 actionable insights as a JSON array:\n\n${JSON.stringify(businessData, null, 2)}`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      console.error(
        'Anthropic API error:',
        anthropicResponse.status,
        await anthropicResponse.text()
      );
      return NextResponse.json({
        insights: getFallbackInsights(businessData),
        generatedAt: new Date().toISOString(),
        source: 'fallback',
      });
    }

    const aiResult = await anthropicResponse.json();
    const textContent =
      aiResult.content?.find((c: any) => c.type === 'text')?.text || '[]';

    // Parse the JSON from Claude's response
    let insights: Insight[];
    try {
      // Strip markdown code fences if present
      const cleaned = textContent.replace(/```json\s*|```\s*/g, '').trim();
      insights = JSON.parse(cleaned);

      // Validate structure
      if (!Array.isArray(insights)) throw new Error('Not an array');
      insights = insights.slice(0, 5).map((i: any) => ({
        type: ['growth', 'attention', 'tip', 'milestone'].includes(i.type)
          ? i.type
          : 'tip',
        title: String(i.title || 'Insight'),
        body: String(i.body || ''),
      }));
    } catch (parseErr) {
      console.error('Failed to parse AI insights:', parseErr, textContent);
      insights = getFallbackInsights(businessData);
    }

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
      source: 'ai',
    });
  } catch (error: any) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback insights when AI is unavailable
// ─────────────────────────────────────────────────────────────────────────────

function getFallbackInsights(data: any): Insight[] {
  const insights: Insight[] = [];

  // Revenue comparison
  if (data.salesCount30 > 0 && data.salesCount60 > 0) {
    const pctChange =
      data.revenue60 > 0
        ? ((data.revenue30 - data.revenue60) / data.revenue60) * 100
        : 0;
    if (pctChange > 0) {
      insights.push({
        type: 'growth',
        title: 'Revenue Trending Up',
        body: `You brought in $${data.revenue30.toLocaleString()} over the last 30 days — that's ${Math.round(pctChange)}% more than the previous month. Keep it going!`,
      });
    } else if (pctChange < -10) {
      insights.push({
        type: 'attention',
        title: 'Revenue Dipped',
        body: `Revenue was $${data.revenue30.toLocaleString()} over the last 30 days, down ${Math.abs(Math.round(pctChange))}% from the previous period. Consider booking more events or running a promotion.`,
      });
    }
  } else if (data.salesCount30 > 0) {
    insights.push({
      type: 'growth',
      title: "You're Making Sales!",
      body: `You've completed ${data.salesCount30} sales for $${data.revenue30.toLocaleString()} in the last 30 days. Your average sale is $${data.avgSaleValue.toFixed(2)}.`,
    });
  }

  // Low stock
  if (data.lowStockItems.length > 0) {
    const critical = data.lowStockItems[0];
    insights.push({
      type: 'attention',
      title: 'Low Stock Alert',
      body: `${data.lowStockItems.length} item${data.lowStockItems.length > 1 ? 's are' : ' is'} below reorder threshold. ${critical.name} has ${critical.onHand} left — time to restock!`,
    });
  }

  // New clients
  if (data.newClients30d > 0) {
    insights.push({
      type: 'milestone',
      title: 'Growing Your Client Base',
      body: `You've added ${data.newClients30d} new client${data.newClients30d !== 1 ? 's' : ''} this month, bringing your total to ${data.totalClients}. ${data.repeatCustomers > 0 ? `Plus, ${data.repeatCustomers} are repeat customers!` : 'Keep building those relationships!'}`,
    });
  }

  // Upcoming events
  if (data.upcomingEvents.length > 0) {
    const next = data.upcomingEvents[0];
    insights.push({
      type: 'tip',
      title: 'Next Event Coming Up',
      body: `You have "${next.name}" on ${new Date(next.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${next.location ? ` at ${next.location}` : ''}. Make sure your inventory is stocked and your supplies are packed!`,
    });
  }

  // Fill with tips if needed
  if (insights.length < 3) {
    if (data.avgTipPercentage > 0) {
      insights.push({
        type: 'tip',
        title: 'Tip Trend',
        body: `Your average tip is ${data.avgTipPercentage.toFixed(1)}% of sales — $${data.tips30.toFixed(2)} total this month. Having a tip prompt at checkout makes a real difference!`,
      });
    }
    if (data.busiestDays.length > 0) {
      insights.push({
        type: 'tip',
        title: 'Your Busiest Day',
        body: `${data.busiestDays[0].day} is your top-performing day with $${data.busiestDays[0].revenue.toLocaleString()} in revenue from ${data.busiestDays[0].sales} sales. Worth considering when you book events!`,
      });
    }
  }

  return insights.slice(0, 5);
}