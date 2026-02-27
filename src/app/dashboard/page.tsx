// ============================================================================
// Dashboard Home — src/app/dashboard/page.tsx
// ============================================================================
// Enhanced with AI Business Insights panel and improved quick stats.
// The insights section loads asynchronously so it never blocks the page.
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
import { format } from 'date-fns';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { getSubscriptionTier, canAccessFeature } from '@/lib/subscription';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Insight {
  type: 'growth' | 'attention' | 'tip' | 'milestone';
  title: string;
  body: string;
}

interface QuickStats {
  todayRevenue: number;
  todaySalesCount: number;
  weekRevenue: number;
  lastWeekRevenue: number;
  weekPctChange: number | null;
  upcomingEventsCount: number;
  nextEventName: string | null;
  nextEventDate: string | null;
  lowStockCount: number;
  lowStockCritical: string | null;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const router = useRouter();
  const supabase = createClient();

  // Quick stats state
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // AI insights state
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(false);
  const effectiveTier = tenant ? getSubscriptionTier(tenant) : 'starter';
  const canSeeInsights = canAccessFeature(effectiveTier, 'ai_insights');

  // ── Fetch quick stats ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenant?.id) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const now = new Date();

        // Today boundaries
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // This week (Mon-Sun)
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
        const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekEnd = thisWeekStart;

        // Today's sales
        const { data: todaySales } = await supabase
          .from('sales')
          .select('subtotal')
          .eq('tenant_id', tenant.id)
          .eq('status', 'completed')
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString());

        const todayRevenue = (todaySales || []).reduce((s, r) => s + (r.subtotal || 0), 0);
        const todaySalesCount = (todaySales || []).length;

        // This week sales
        const { data: weekSales } = await supabase
          .from('sales')
          .select('subtotal')
          .eq('tenant_id', tenant.id)
          .eq('status', 'completed')
          .gte('created_at', thisWeekStart.toISOString())
          .lt('created_at', todayEnd.toISOString());

        const weekRevenue = (weekSales || []).reduce((s, r) => s + (r.subtotal || 0), 0);

        // Last week sales
        const { data: lastWeekSales } = await supabase
          .from('sales')
          .select('subtotal')
          .eq('tenant_id', tenant.id)
          .eq('status', 'completed')
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', lastWeekEnd.toISOString());

        const lastWeekRevenue = (lastWeekSales || []).reduce((s, r) => s + (r.subtotal || 0), 0);
        const weekPctChange =
          lastWeekRevenue > 0
            ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
            : weekRevenue > 0
              ? 100
              : null;

        // Upcoming events
        const { data: upcomingEvents } = await supabase
          .from('events')
          .select('id, name, start_time')
          .eq('tenant_id', tenant.id)
          .gte('start_time', now.toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        const upcomingEventsCount = (upcomingEvents || []).length;
        const nextEvent = (upcomingEvents || [])[0] || null;

        // Low stock inventory
        const { data: lowStock } = await supabase
          .from('inventory_items')
          .select('name, quantity_on_hand, reorder_threshold')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true);

        const lowStockItems = (lowStock || []).filter(
          (i) => i.quantity_on_hand <= i.reorder_threshold
        );
        // Sort by most critical (lowest ratio of on_hand / threshold)
        lowStockItems.sort((a, b) => {
          const ratioA = a.reorder_threshold > 0 ? a.quantity_on_hand / a.reorder_threshold : 0;
          const ratioB = b.reorder_threshold > 0 ? b.quantity_on_hand / b.reorder_threshold : 0;
          return ratioA - ratioB;
        });

        setStats({
          todayRevenue,
          todaySalesCount,
          weekRevenue,
          lastWeekRevenue,
          weekPctChange,
          upcomingEventsCount,
          nextEventName: nextEvent?.name || null,
          nextEventDate: nextEvent?.start_time || null,
          lowStockCount: lowStockItems.length,
          lowStockCritical: lowStockItems[0]?.name || null,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [tenant?.id]);

  // ── Fetch AI insights ──────────────────────────────────────────────────────
  const fetchInsights = useCallback(async () => {
    if (!canSeeInsights) return;
    setInsightsLoading(true);
    setInsightsError(false);
    try {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setInsightsError(true);
    } finally {
      setInsightsLoading(false);
    }
  }, [canSeeInsights]);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchInsights();
  }, [tenant?.id, fetchInsights]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-secondary">No business found. Please complete setup.</p>
      </div>
    );
  }

  // ── Greeting ───────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-semibold text-text-primary"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {greeting}!
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Here&apos;s how {tenant.name} is doing today.
        </p>
      </div>

      {/* ================================================================== */}
      {/* Quick Stats Row                                                     */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Today's Revenue */}
        <StatCard
          label="Today's Revenue"
          loading={statsLoading}
          value={stats ? moneyExact(stats.todayRevenue) : '$0'}
          subtitle={
            stats && stats.todaySalesCount > 0
              ? `${stats.todaySalesCount} sale${stats.todaySalesCount !== 1 ? 's' : ''}`
              : 'No sales yet today'
          }
        />

        {/* This Week vs Last Week */}
        <StatCard
          label="This Week"
          loading={statsLoading}
          value={stats ? money(stats.weekRevenue) : '$0'}
          subtitle={
            stats?.weekPctChange !== null && stats?.weekPctChange !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className={
                    stats.weekPctChange >= 0 ? 'text-success-600' : 'text-error-500'
                  }
                >
                  {stats.weekPctChange >= 0 ? '↑' : '↓'}{' '}
                  {Math.abs(Math.round(stats.weekPctChange))}%
                </span>
                <span className="text-text-tertiary">vs last week</span>
              </span>
            ) : (
              'vs last week'
            )
          }
        />

        {/* Upcoming Events */}
        <StatCard
          label="Upcoming Events"
          loading={statsLoading}
          value={stats ? String(stats.upcomingEventsCount) : '0'}
          subtitle={
            stats?.nextEventName
              ? `${stats.nextEventName} · ${format(new Date(stats.nextEventDate!), 'MMM d')}`
              : 'None scheduled'
          }
          onClick={() => router.push('/dashboard/events')}
        />

        {/* Low Stock Alerts */}
        <StatCard
          label="Low Stock"
          loading={statsLoading}
          value={stats ? String(stats.lowStockCount) : '0'}
          valueColor={
            stats && stats.lowStockCount > 0 ? 'text-warning-600' : undefined
          }
          subtitle={
            stats?.lowStockCritical
              ? `${stats.lowStockCritical} is critical`
              : 'All stocked up'
          }
          onClick={() => router.push('/dashboard/inventory')}
        />
      </div>

      {/* ================================================================== */}
      {/* Quick Actions                                                       */}
      {/* ================================================================== */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/dashboard/pos')}
        >
          <span className="flex items-center gap-2">
            <StorefrontIcon className="w-4 h-4" />
            Open Store POS
          </span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/dashboard/events')}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Events
          </span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/dashboard/reports')}
        >
          <span className="flex items-center gap-2">
            <ChartIcon className="w-4 h-4" />
            Reports
          </span>
        </Button>
      </div>

      {/* ================================================================== */}
      {/* AI Business Insights                                                */}
      {/* ================================================================== */}
      {canSeeInsights ? (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <SparklesIcon className="w-5 h-5 text-amber-500" />
            <h2
              className="text-lg font-semibold text-text-primary"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Your Business Insights
            </h2>
          </div>
          <button
            onClick={fetchInsights}
            disabled={insightsLoading}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshIcon
              className={`w-4 h-4 ${insightsLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Loading skeleton */}
        {insightsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <InsightSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!insightsLoading && insightsError && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-text-secondary text-sm">
                Insights are taking a break — check back soon!
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={fetchInsights}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Insights grid */}
        {!insightsLoading && !insightsError && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        )}

        {/* Empty state — no insights returned */}
        {!insightsLoading && !insightsError && insights.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <SparklesIcon className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary text-sm">
                Welcome to Sunstone! Once you start making sales, I&apos;ll have
                personalized insights for your business here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
      ) : (
        <UpgradePrompt
          feature="AI Business Insights"
          description="Get personalized, AI-powered insights about your sales trends, inventory, and growth opportunities."
          variant="inline"
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  loading,
  valueColor,
  onClick,
}: {
  label: string;
  value: string;
  subtitle?: React.ReactNode;
  loading?: boolean;
  valueColor?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      className={onClick ? 'text-left' : ''}
    >
      <Wrapper
        {...(onClick ? { onClick } : {})}
        className="block w-full px-4 py-4 lg:px-5 lg:py-5"
      >
        {loading ? (
          <div className="space-y-2.5">
            <div className="h-3 w-20 bg-[var(--surface-base)] rounded animate-pulse" />
            <div className="h-7 w-16 bg-[var(--surface-base)] rounded animate-pulse" />
            <div className="h-3 w-28 bg-[var(--surface-base)] rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-xs text-text-tertiary uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p
              className={`text-2xl font-semibold tracking-tight ${valueColor || 'text-text-primary'}`}
              style={{ fontFamily: 'var(--)' }}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-1 truncate">
                {subtitle}
              </p>
            )}
          </>
        )}
      </Wrapper>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight Card
// ─────────────────────────────────────────────────────────────────────────────

const INSIGHT_STYLES: Record<
  Insight['type'],
  { border: string; iconBg: string; iconColor: string }
> = {
  growth: {
    border: 'border-l-green-500',
    iconBg: 'bg-success-50',
    iconColor: 'text-success-600',
  },
  attention: {
    border: 'border-l-amber-500',
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-600',
  },
  tip: {
    border: 'border-l-blue-500',
    iconBg: 'bg-info-50',
    iconColor: 'text-info-600',
  },
  milestone: {
    border: 'border-l-purple-500',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.tip;

  return (
    <div
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-sm border-l-4 ${style.border} p-4 lg:p-5`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}
        >
          <InsightTypeIcon type={insight.type} className={`w-4 h-4 ${style.iconColor}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {insight.title}
          </p>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {insight.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-sm border-l-4 border-l-[var(--border-default)] p-4 lg:p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-base)] animate-pulse" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/3 bg-[var(--surface-base)] rounded animate-pulse" />
          <div className="h-3 w-full bg-[var(--surface-base)] rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-[var(--surface-base)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function InsightTypeIcon({
  type,
  className,
}: {
  type: Insight['type'];
  className?: string;
}) {
  switch (type) {
    case 'growth':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 20l5.5-5.5m0 0l3 3L16 12m0 0l4-4m-4 4v4m0-4h4" />
        </svg>
      );
    case 'attention':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    case 'tip':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      );
    case 'milestone':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
  }
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}