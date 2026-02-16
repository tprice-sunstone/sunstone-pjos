// src/app/admin/page.tsx
// Platform admin overview — total tenants, users, plan breakdown, revenue, recent activity
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface OverviewData {
  totalTenants: number;
  totalUsers: number;
  planBreakdown: { free: number; pro: number; business: number };
  totalPlatformRevenue: number;
  recentSignups: Array<{ id: string; name: string; created_at: string; subscription_tier: string; owner_email: string }>;
  activeToday: Array<{ id: string; name: string; sales_count: number }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      // Fetch tenants
      const tenantsRes = await fetch('/api/admin/tenants');
      const tenantsData = await tenantsRes.json();

      // Fetch users
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();

      // Fetch revenue
      const revenueRes = await fetch('/api/admin/revenue');
      const revenueData = await revenueRes.json();

      if (!tenantsRes.ok || !usersRes.ok || !revenueRes.ok) {
        setError('Failed to load overview data');
        return;
      }

      const tenants = tenantsData.tenants || [];
      const users = usersData.users || [];

      // Plan breakdown
      const planBreakdown = { free: 0, pro: 0, business: 0 };
      for (const t of tenants) {
        const tier = t.subscription_tier as keyof typeof planBreakdown;
        if (planBreakdown[tier] !== undefined) planBreakdown[tier]++;
      }

      // Active today (tenants with sales today)
      const today = new Date().toISOString().substring(0, 10);
      const activeToday = tenants
        .filter((t: any) => t.last_active && t.last_active.substring(0, 10) === today)
        .map((t: any) => ({ id: t.id, name: t.name, sales_count: t.sales_count }));

      // Recent signups (last 10)
      const recentSignups = tenants.slice(0, 10).map((t: any) => ({
        id: t.id,
        name: t.name,
        created_at: t.created_at,
        subscription_tier: t.subscription_tier,
        owner_email: t.owner_email,
      }));

      setData({
        totalTenants: tenants.length,
        totalUsers: users.length,
        planBreakdown,
        totalPlatformRevenue: revenueData.totals?.platform_fees || 0,
        recentSignups,
        activeToday,
      });
    } catch (err) {
      setError('Failed to load overview');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Platform Overview
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{error}</p>
        <button onClick={loadOverview} className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
        Platform Overview
      </h1>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tenants"
          value={data.totalTenants}
          icon={<TenantsStatIcon />}
          color="blue"
        />
        <StatCard
          label="Total Users"
          value={data.totalUsers}
          icon={<UsersStatIcon />}
          color="emerald"
        />
        <StatCard
          label="Platform Revenue"
          value={formatCurrency(data.totalPlatformRevenue)}
          icon={<RevenueStatIcon />}
          color="amber"
        />
        <StatCard
          label="Active Today"
          value={data.activeToday.length}
          icon={<ActiveStatIcon />}
          color="violet"
        />
      </div>

      {/* ── Plan Breakdown ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Plan Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <PlanStat label="Free" count={data.planBreakdown.free} total={data.totalTenants} color="slate" />
          <PlanStat label="Pro" count={data.planBreakdown.pro} total={data.totalTenants} color="blue" />
          <PlanStat label="Business" count={data.planBreakdown.business} total={data.totalTenants} color="amber" />
        </div>
      </div>

      {/* ── Two-column: Recent Signups + Active Today ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent Signups</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recentSignups.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No tenants yet</div>
            )}
            {data.recentSignups.map(t => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 truncate">{t.owner_email}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <TierBadge tier={t.subscription_tier} />
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Today */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Active Today</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.activeToday.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No sales today</div>
            )}
            {data.activeToday.map(t => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">{t.name}</div>
                <div className="text-sm text-slate-500">
                  {t.sales_count} sale{t.sales_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const bgColors = {
    blue: 'bg-blue-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
    violet: 'bg-violet-50',
  };
  const iconColors = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    violet: 'text-violet-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bgColors[color])}>
          <div className={iconColors[color]}>{icon}</div>
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 font-mono">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function PlanStat({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColors: Record<string, string> = {
    slate: 'bg-slate-400',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-mono text-slate-900">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColors[color] || 'bg-slate-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-400 mt-1">{pct}%</div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-blue-50 text-blue-700',
    business: 'bg-amber-50 text-amber-700',
  };

  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', styles[tier] || styles.free)}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

// ── Stat Icons ──

function TenantsStatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
    </svg>
  );
}

function UsersStatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function RevenueStatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ActiveStatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}