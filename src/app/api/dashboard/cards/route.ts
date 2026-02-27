// ============================================================================
// Dashboard Cards API — src/app/api/dashboard/cards/route.ts
// ============================================================================
// GET: Generates context-aware dashboard cards from real tenant data.
// Pure data queries — no AI/LLM calls. Cached for 24 hours per tenant.
// Returns structured data payloads that card components render directly.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import type { DashboardCard } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/cards
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await createServiceRoleClient();

    const { data: membership } = await db
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;

    // Check cache (table may not exist yet — gracefully skip)
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
    if (!forceRefresh) {
      try {
        const { data: cached } = await db
          .from('dashboard_card_cache')
          .select('cards, expires_at')
          .eq('tenant_id', tenantId)
          .single();

        if (cached && new Date(cached.expires_at) > new Date()) {
          return NextResponse.json({ cards: cached.cards, cached: true });
        }
      } catch {
        // Cache table may not exist — continue to generate
      }
    }

    // Generate cards
    const cards = await generateCards(db, tenantId);

    // Try to cache (upsert) — non-critical if table doesn't exist
    try {
      const now = new Date();
      await db
        .from('dashboard_card_cache')
        .upsert(
          {
            tenant_id: tenantId,
            cards,
            generated_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'tenant_id' }
        );
    } catch {
      // Cache write failed — non-critical
    }

    return NextResponse.json({ cards, cached: false });
  } catch (err) {
    console.error('Dashboard cards error:', err);
    return NextResponse.json(
      { error: 'Failed to generate dashboard cards' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateCards(
  db: Awaited<ReturnType<typeof createServiceRoleClient>>,
  tenantId: string
): Promise<DashboardCard[]> {
  const cards: DashboardCard[] = [];
  const now = new Date();

  // Date boundaries
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = thisMonthStart;
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    eventsResult,
    thisMonthSalesResult,
    lastMonthSalesResult,
    dailySalesResult,
    eventsThisMonthResult,
    lowStockResult,
    staleClientsResult,
    clientCountResult,
    broadcastsResult,
    upcomingEventsResult,
  ] = await Promise.all([
    // Next event (within 7 days)
    db
      .from('events')
      .select('id, name, location, start_time, booth_fee')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(1),

    // This month sales
    db
      .from('sales')
      .select('subtotal, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', thisMonthStart.toISOString()),

    // Last month sales
    db
      .from('sales')
      .select('subtotal')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', lastMonthEnd.toISOString()),

    // Daily sales for bar chart (last 12 days)
    (() => {
      const twelveAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
      return db
        .from('sales')
        .select('subtotal, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', twelveAgo.toISOString());
    })(),

    // Events this month (for revenue card subtitle)
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', thisMonthStart.toISOString())
      .lt('start_time', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()),

    // Inventory items (all active)
    db
      .from('inventory_items')
      .select('id, name, quantity_on_hand, reorder_threshold')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

    // Stale clients: created 60+ days ago, check last sale
    db
      .from('clients')
      .select('id, first_name, last_name, created_at')
      .eq('tenant_id', tenantId)
      .lt('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20),

    // Total client count
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    // Recent broadcasts (last 7 days)
    db
      .from('broadcasts')
      .select('id, name, status, sent_count, total_recipients, sent_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('sent_at', sevenDaysAgo.toISOString())
      .order('sent_at', { ascending: false })
      .limit(5),

    // Upcoming events in next 14 days (for nudge check)
    db
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .lt('start_time', fourteenDaysFromNow.toISOString()),
  ]);

  // ── Next Event Card ─────────────────────────────────────────────────────
  const upcomingEvents = eventsResult.data || [];
  if (upcomingEvents.length > 0) {
    const next = upcomingEvents[0];
    const days = daysUntil(next.start_time);
    if (days <= 7) {
      cards.push({
        type: 'next_event',
        priority: days <= 3 ? 1 : 10,
        data: {
          eventName: next.name,
          date: formatDate(next.start_time),
          location: next.location,
          daysUntil: days,
          boothFee: next.booth_fee || 0,
        },
      });
    }
  }

  // ── Revenue Snapshot (always shown) ─────────────────────────────────────
  const thisMonthSales = thisMonthSalesResult.data || [];
  const lastMonthSales = lastMonthSalesResult.data || [];
  const dailySalesRaw = dailySalesResult.data || [];

  const monthRevenue = thisMonthSales.reduce((s, r) => s + (r.subtotal || 0), 0);
  const lastMonthRevenue = lastMonthSales.reduce((s, r) => s + (r.subtotal || 0), 0);
  const pctChange = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : null;

  // Build 12-day bar chart data
  const dailyTotals: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTotal = dailySalesRaw
      .filter((s) => {
        const d = new Date(s.created_at);
        return d >= dayStart && d < dayEnd;
      })
      .reduce((sum, s) => sum + (s.subtotal || 0), 0);
    dailyTotals.push(dayTotal);
  }
  const maxDaily = Math.max(...dailyTotals, 1);
  const dailyBars = dailyTotals.map((d) => d / maxDaily);

  cards.push({
    type: 'revenue_snapshot',
    priority: 5,
    data: {
      monthRevenue,
      lastMonthRevenue,
      pctChange: pctChange !== null ? Math.round(pctChange) : null,
      salesCount: thisMonthSales.length,
      eventsCount: eventsThisMonthResult.count || 0,
      dailyBars,
    },
  });

  // ── Inventory Alert ─────────────────────────────────────────────────────
  const allStock = lowStockResult.data || [];
  const lowItems = allStock
    .filter((i) => i.quantity_on_hand <= i.reorder_threshold)
    .sort((a, b) => {
      const ra = a.reorder_threshold > 0 ? a.quantity_on_hand / a.reorder_threshold : 0;
      const rb = b.reorder_threshold > 0 ? b.quantity_on_hand / b.reorder_threshold : 0;
      return ra - rb;
    })
    .slice(0, 4);

  if (lowItems.length > 0) {
    cards.push({
      type: 'inventory_alert',
      priority: lowItems.some((i) => i.quantity_on_hand === 0) ? 2 : 15,
      data: {
        items: lowItems.map((i) => ({
          name: i.name,
          stock: i.quantity_on_hand,
          threshold: i.reorder_threshold,
          status:
            i.quantity_on_hand === 0
              ? 'critical'
              : i.quantity_on_hand <= i.reorder_threshold * 0.5
                ? 'critical'
                : 'low',
        })),
      },
    });
  }

  // ── Suggested Outreach ──────────────────────────────────────────────────
  // Clients who haven't purchased in 60+ days
  const staleClients = staleClientsResult.data || [];
  if (staleClients.length > 0) {
    // Check last sale for each stale client
    const clientsWithReason: { name: string; reason: string }[] = [];

    for (const client of staleClients.slice(0, 5)) {
      const { data: lastSale } = await db
        .from('sales')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSale) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastSale.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= 60) {
          const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Unknown';
          clientsWithReason.push({
            name,
            reason: `Last purchase ${daysSince} days ago`,
          });
        }
      } else {
        // Never purchased but was created 60+ days ago
        const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Unknown';
        clientsWithReason.push({
          name,
          reason: 'No purchases yet',
        });
      }

      if (clientsWithReason.length >= 3) break;
    }

    if (clientsWithReason.length > 0) {
      cards.push({
        type: 'suggested_outreach',
        priority: 25,
        data: { clients: clientsWithReason },
      });
    }
  }

  // ── Networking Nudge ────────────────────────────────────────────────────
  const upcomingIn14 = upcomingEventsResult.data || [];
  const totalClients = clientCountResult.count || 0;

  if (upcomingIn14.length === 0) {
    cards.push({
      type: 'networking_nudge',
      priority: 30,
      data: {
        title: 'Book Your Next Event',
        body: totalClients > 0
          ? `You have ${totalClients} clients waiting to see you. Events drive repeat sales and grow your audience.`
          : 'Events are where you grow — get your next one on the calendar and start building your client list.',
        primaryLabel: 'Create Event',
        primaryRoute: '/dashboard/events',
        secondaryLabel: 'Browse Tips',
        secondaryRoute: '/dashboard/reports',
      },
    });
  }

  // ── Recent Messages ─────────────────────────────────────────────────────
  const recentBroadcasts = broadcastsResult.data || [];
  if (recentBroadcasts.length > 0) {
    const messages = recentBroadcasts.slice(0, 3).map((b) => {
      const sentDate = b.sent_at ? new Date(b.sent_at) : new Date(b.created_at);
      const hoursAgo = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60));
      const timeStr = hoursAgo < 1 ? 'Just now'
        : hoursAgo < 24 ? `${hoursAgo}h ago`
        : `${Math.floor(hoursAgo / 24)}d ago`;

      return {
        sender: 'Sunstone',
        initials: 'S',
        text: `${b.name} — sent to ${b.sent_count} recipients`,
        time: timeStr,
        isSystem: true,
      };
    });

    cards.push({
      type: 'recent_messages',
      priority: 40,
      data: { messages },
    });
  }

  // ── Sunstone Product Tip ────────────────────────────────────────────────
  const tip = getSunstoneTip(allStock.length, totalClients, upcomingEvents.length);
  if (tip) {
    // Show if no nudge card exists, or always for starter tenants
    const hasNudge = cards.some((c) => c.type === 'networking_nudge');
    if (!hasNudge) {
      cards.push({ type: 'sunstone_product', priority: 50, data: tip });
    }
  }

  cards.sort((a, b) => a.priority - b.priority);
  return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sunstone Tips
// ─────────────────────────────────────────────────────────────────────────────

function getSunstoneTip(
  inventoryCount: number,
  clientCount: number,
  upcomingEventCount: number
): Record<string, unknown> | null {
  if (inventoryCount === 0) {
    return {
      title: 'Set Up Your Inventory',
      body: 'Add your chains, charms, and supplies to start tracking stock and pricing products automatically.',
      actionLabel: 'Add Inventory',
      actionRoute: '/dashboard/inventory',
    };
  }
  if (upcomingEventCount === 0) {
    return {
      title: 'Create Your First Event',
      body: 'Events help you track sales by location, manage booth fees, and generate per-event reports.',
      actionLabel: 'Create Event',
      actionRoute: '/dashboard/events',
    };
  }
  if (clientCount === 0) {
    return {
      title: 'Build Your Client List',
      body: 'Clients are automatically added when you complete a sale. You can also import existing contacts.',
      actionLabel: 'View Clients',
      actionRoute: '/dashboard/clients',
    };
  }

  const tips = [
    {
      title: 'Try Event Mode',
      body: 'Full-screen POS for events — faster checkout and live sales tracking.',
      actionLabel: 'Learn More',
      actionRoute: '/dashboard/events',
    },
    {
      title: 'Broadcast to Clients',
      body: 'Send SMS or email blasts about upcoming events, promotions, or new products.',
      actionLabel: 'Create Broadcast',
      actionRoute: '/dashboard/broadcasts',
    },
    {
      title: 'Track Performance',
      body: 'Revenue trends, top-selling items, and event comparisons in your reports.',
      actionLabel: 'View Reports',
      actionRoute: '/dashboard/reports',
    },
  ];

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return tips[dayOfYear % tips.length];
}
