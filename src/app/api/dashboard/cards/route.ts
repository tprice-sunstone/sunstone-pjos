// ============================================================================
// Dashboard Cards API — src/app/api/dashboard/cards/route.ts
// ============================================================================
// GET: Generates context-aware dashboard cards from real tenant data.
// Pure data queries — no AI/LLM calls. Cached for 24 hours per tenant.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import type { DashboardCard, DashboardCardType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const money = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const moneyExact = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/cards
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get tenant
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

    // 3. Check cache
    const { data: cached } = await db
      .from('dashboard_card_cache')
      .select('cards, expires_at')
      .eq('tenant_id', tenantId)
      .single();

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

    if (cached && !forceRefresh && new Date(cached.expires_at) > new Date()) {
      return NextResponse.json({ cards: cached.cards, cached: true });
    }

    // 4. Generate cards from real data
    const cards = await generateCards(db, tenantId);

    // 5. Cache result (upsert)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db
      .from('dashboard_card_cache')
      .upsert(
        {
          tenant_id: tenantId,
          cards,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

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
// Card Generation — Pure data queries, no AI
// ─────────────────────────────────────────────────────────────────────────────

async function generateCards(
  db: Awaited<ReturnType<typeof createServiceRoleClient>>,
  tenantId: string
): Promise<DashboardCard[]> {
  const cards: DashboardCard[] = [];
  const now = new Date();

  // Run all data queries in parallel
  const [
    eventsResult,
    salesThisWeekResult,
    salesLastWeekResult,
    salesTodayResult,
    lowStockResult,
    clientsResult,
    recentClientsResult,
    broadcastsResult,
  ] = await Promise.all([
    // Upcoming events (next 30 days)
    db
      .from('events')
      .select('id, name, location, start_time, end_time, booth_fee')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(5),

    // This week sales (Mon-Sun)
    (() => {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      return db
        .from('sales')
        .select('subtotal, total, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', weekStart.toISOString());
    })(),

    // Last week sales
    (() => {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return db
        .from('sales')
        .select('subtotal')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', thisWeekStart.toISOString());
    })(),

    // Today's sales
    (() => {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      return db
        .from('sales')
        .select('subtotal, total')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());
    })(),

    // Low stock items
    db
      .from('inventory_items')
      .select('id, name, quantity_on_hand, reorder_threshold')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

    // Total clients
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    // Recent clients (last 30 days, no email)
    db
      .from('clients')
      .select('id, first_name, last_name, email, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .is('email', null)
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent broadcasts
    db
      .from('broadcasts')
      .select('id, name, status, sent_count, sent_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  // ── Card 1: Next Event ──────────────────────────────────────────────────
  const upcomingEvents = eventsResult.data || [];
  if (upcomingEvents.length > 0) {
    const next = upcomingEvents[0];
    const days = daysUntil(next.start_time);
    const dayLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;

    cards.push({
      type: 'next_event',
      title: next.name,
      body: next.location
        ? `${formatDate(next.start_time)} at ${next.location}`
        : formatDate(next.start_time),
      metric: dayLabel,
      sub: next.booth_fee > 0 ? `Booth fee: ${moneyExact(next.booth_fee)}` : undefined,
      actionLabel: 'View Events',
      actionRoute: '/dashboard/events',
      priority: days <= 3 ? 1 : 10,
    });
  }

  // ── Card 2: Revenue Snapshot ────────────────────────────────────────────
  const weekSales = salesThisWeekResult.data || [];
  const lastWeekSales = salesLastWeekResult.data || [];
  const todaySales = salesTodayResult.data || [];

  const weekRevenue = weekSales.reduce((s, r) => s + (r.subtotal || 0), 0);
  const lastWeekRevenue = lastWeekSales.reduce((s, r) => s + (r.subtotal || 0), 0);
  const todayRevenue = todaySales.reduce((s, r) => s + (r.subtotal || 0), 0);

  // Always show revenue snapshot if tenant has any sales this week or last week
  if (weekRevenue > 0 || lastWeekRevenue > 0) {
    let body = '';
    if (lastWeekRevenue > 0) {
      const pctChange = ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
      const direction = pctChange >= 0 ? 'up' : 'down';
      body = `${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(Math.round(pctChange))}% from last week (${money(lastWeekRevenue)})`;
    } else {
      body = `${weekSales.length} sale${weekSales.length !== 1 ? 's' : ''} this week`;
    }

    cards.push({
      type: 'revenue_snapshot',
      title: 'This Week\'s Revenue',
      body,
      metric: money(weekRevenue),
      sub: todayRevenue > 0 ? `Today: ${moneyExact(todayRevenue)}` : undefined,
      actionLabel: 'View Reports',
      actionRoute: '/dashboard/reports',
      priority: 5,
    });
  }

  // ── Card 3: Inventory Alert ─────────────────────────────────────────────
  const allStock = lowStockResult.data || [];
  const lowStockItems = allStock.filter(
    (i) => i.quantity_on_hand <= i.reorder_threshold
  );

  if (lowStockItems.length > 0) {
    // Sort by most critical
    lowStockItems.sort((a, b) => {
      const ratioA = a.reorder_threshold > 0 ? a.quantity_on_hand / a.reorder_threshold : 0;
      const ratioB = b.reorder_threshold > 0 ? b.quantity_on_hand / b.reorder_threshold : 0;
      return ratioA - ratioB;
    });

    const critical = lowStockItems[0];
    const otherCount = lowStockItems.length - 1;

    cards.push({
      type: 'inventory_alert',
      title: 'Low Stock Alert',
      body: otherCount > 0
        ? `${critical.name} is running low, plus ${otherCount} other item${otherCount !== 1 ? 's' : ''}`
        : `${critical.name} is running low`,
      metric: `${lowStockItems.length} item${lowStockItems.length !== 1 ? 's' : ''}`,
      sub: `${critical.name}: ${critical.quantity_on_hand} left`,
      actionLabel: 'View Inventory',
      actionRoute: '/dashboard/inventory',
      priority: lowStockItems.some((i) => i.quantity_on_hand === 0) ? 2 : 15,
    });
  }

  // ── Card 4: Suggested Outreach ──────────────────────────────────────────
  const recentNoEmail = recentClientsResult.data || [];
  if (recentNoEmail.length > 0) {
    const names = recentNoEmail
      .slice(0, 3)
      .map((c) => c.first_name || 'A client')
      .join(', ');

    cards.push({
      type: 'suggested_outreach',
      title: 'Collect Contact Info',
      body: `${recentNoEmail.length} recent client${recentNoEmail.length !== 1 ? 's' : ''} without email: ${names}${recentNoEmail.length > 3 ? '...' : ''}`,
      metric: `${recentNoEmail.length}`,
      sub: 'Missing emails from recent sales',
      actionLabel: 'View Clients',
      actionRoute: '/dashboard/clients',
      priority: 25,
    });
  }

  // ── Card 5: Networking Nudge ────────────────────────────────────────────
  const totalClients = clientsResult.count || 0;
  const totalBroadcasts = broadcastsResult.data || [];
  const sentBroadcasts = totalBroadcasts.filter((b) => b.status === 'completed');

  // Show if they have clients but haven't sent broadcasts
  if (totalClients >= 5 && sentBroadcasts.length === 0) {
    cards.push({
      type: 'networking_nudge',
      title: 'Stay Connected',
      body: `You have ${totalClients} clients — send them an update or promotion to drive repeat business.`,
      metric: `${totalClients} clients`,
      sub: 'No broadcasts sent yet',
      actionLabel: 'Create Broadcast',
      actionRoute: '/dashboard/broadcasts',
      priority: 30,
    });
  } else if (sentBroadcasts.length > 0) {
    const lastSent = sentBroadcasts[0];
    const daysSinceLast = lastSent.sent_at
      ? Math.floor((now.getTime() - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Nudge if it's been more than 14 days since last broadcast
    if (daysSinceLast !== null && daysSinceLast > 14 && totalClients >= 5) {
      cards.push({
        type: 'networking_nudge',
        title: 'Time to Reconnect',
        body: `It's been ${daysSinceLast} days since your last broadcast to ${totalClients} clients.`,
        metric: `${daysSinceLast}d ago`,
        sub: `Last: "${lastSent.name}" (${lastSent.sent_count} sent)`,
        actionLabel: 'Send Broadcast',
        actionRoute: '/dashboard/broadcasts',
        priority: 35,
      });
    }
  }

  // ── Card 6: Recent Messages ─────────────────────────────────────────────
  if (sentBroadcasts.length > 0 && sentBroadcasts[0].status === 'completed') {
    const latest = sentBroadcasts[0];
    cards.push({
      type: 'recent_messages',
      title: 'Latest Broadcast',
      body: latest.name,
      metric: `${latest.sent_count} sent`,
      sub: latest.sent_at ? `Sent ${formatDate(latest.sent_at)}` : undefined,
      actionLabel: 'View Broadcasts',
      actionRoute: '/dashboard/broadcasts',
      priority: 40,
    });
  }

  // ── Card 7: Sunstone Product Tip ────────────────────────────────────────
  // Rotate through tips based on day of year
  const tips = getSunstoneTips(allStock.length, totalClients, upcomingEvents.length);
  if (tips) {
    cards.push({ ...tips, priority: 50 });
  }

  // Sort by priority (lower = more important)
  cards.sort((a, b) => a.priority - b.priority);

  return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sunstone Product Tips — contextual, rotating
// ─────────────────────────────────────────────────────────────────────────────

function getSunstoneTips(
  inventoryCount: number,
  clientCount: number,
  upcomingEventCount: number
): Omit<DashboardCard, 'priority'> | null {
  const tips: Omit<DashboardCard, 'priority'>[] = [];

  if (inventoryCount === 0) {
    tips.push({
      type: 'sunstone_product',
      title: 'Set Up Your Inventory',
      body: 'Add your chains, charms, and supplies to start tracking stock and pricing products automatically.',
      actionLabel: 'Add Inventory',
      actionRoute: '/dashboard/inventory',
    });
  }

  if (upcomingEventCount === 0) {
    tips.push({
      type: 'sunstone_product',
      title: 'Create Your First Event',
      body: 'Events help you track sales by location, manage booth fees, and generate per-event reports.',
      actionLabel: 'Create Event',
      actionRoute: '/dashboard/events',
    });
  }

  if (clientCount === 0) {
    tips.push({
      type: 'sunstone_product',
      title: 'Build Your Client List',
      body: 'Clients are automatically added when you complete a sale. You can also import existing contacts.',
      actionLabel: 'View Clients',
      actionRoute: '/dashboard/clients',
    });
  }

  if (tips.length === 0) {
    // Rotating general tips
    const generalTips: Omit<DashboardCard, 'priority'>[] = [
      {
        type: 'sunstone_product',
        title: 'Try Event Mode',
        body: 'Launch a full-screen POS designed for events — faster checkout, queue management, and live sales tracking.',
        actionLabel: 'Learn More',
        actionRoute: '/dashboard/events',
      },
      {
        type: 'sunstone_product',
        title: 'Broadcast to Clients',
        body: 'Send SMS or email blasts to your clients about upcoming events, promotions, or new products.',
        actionLabel: 'Create Broadcast',
        actionRoute: '/dashboard/broadcasts',
      },
      {
        type: 'sunstone_product',
        title: 'Track Your Performance',
        body: 'See revenue trends, top-selling items, and event comparisons in your reports dashboard.',
        actionLabel: 'View Reports',
        actionRoute: '/dashboard/reports',
      },
    ];

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    return generalTips[dayOfYear % generalTips.length];
  }

  // Return first contextual tip
  return tips[0];
}
