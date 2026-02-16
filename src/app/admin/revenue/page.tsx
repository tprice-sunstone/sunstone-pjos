// src/app/admin/revenue/page.tsx
// Revenue analytics — platform fees, GMV, breakdowns by tenant and plan tier
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface RevenueData {
  totals: { gmv: number; platform_fees: number; sales_count: number };
  by_tier: Record<string, { gmv: number; fees: number; count: number }>;
  by_tenant: Array<{ tenant_id: string; name: string; tier: string; gmv: number; fees: number; count: number }>;
  daily: Array<{ date: string; gmv: number; fees: number; count: number }>;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    loadRevenue();
  }, []);

  async function loadRevenue() {
    try {
      const res = await fetch('/api/admin/revenue');
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }

  // Filter daily data by time range
  function getFilteredDaily() {
    if (!data) return [];
    if (timeRange === 'all') return data.daily;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().substring(0, 10);
    return data.daily.filter(d => d.date >= cutoffStr);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Revenue
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredDaily = getFilteredDaily();
  const maxDailyFee = Math.max(...filteredDaily.map(d => d.fees), 1);

  // Calculate filtered totals
  const filteredTotals = filteredDaily.reduce(
    (acc, d) => ({
      gmv: acc.gmv + d.gmv,
      fees: acc.fees + d.fees,
      count: acc.count + d.count,
    }),
    { gmv: 0, fees: 0, count: 0 }
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Revenue
        </h1>
        {/* Time range selector */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                timeRange === range
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top-line Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-medium text-slate-500 mb-1">Platform Fees</div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {formatCurrency(timeRange === 'all' ? data.totals.platform_fees : filteredTotals.fees)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {timeRange === 'all' ? data.totals.sales_count : filteredTotals.count} sales
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-medium text-slate-500 mb-1">Gross Merchandise Value</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(timeRange === 'all' ? data.totals.gmv : filteredTotals.gmv)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Total sales value</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-medium text-slate-500 mb-1">Take Rate</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {((timeRange === 'all' ? data.totals.gmv : filteredTotals.gmv) > 0
              ? (
                  ((timeRange === 'all' ? data.totals.platform_fees : filteredTotals.fees) /
                    (timeRange === 'all' ? data.totals.gmv : filteredTotals.gmv)) *
                  100
                ).toFixed(2)
              : '0.00'
            )}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Fee ÷ GMV</div>
        </div>
      </div>

      {/* ── Daily Revenue Chart (simple bar chart) ── */}
      {filteredDaily.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Daily Platform Fees</h2>
          <div className="flex items-end gap-[2px] h-40 overflow-x-auto pb-2">
            {filteredDaily.map((d, i) => {
              const height = maxDailyFee > 0 ? (d.fees / maxDailyFee) * 100 : 0;
              return (
                <div key={d.date} className="flex flex-col items-center group relative" style={{ minWidth: filteredDaily.length > 60 ? 4 : 12 }}>
                  <div
                    className="w-full bg-amber-400 rounded-t-sm hover:bg-amber-500 transition-colors cursor-default"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.date}: ${formatCurrency(d.fees)}`}
                  />
                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                    {d.date}: {formatCurrency(d.fees)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>{filteredDaily[0]?.date}</span>
            <span>{filteredDaily[filteredDaily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* ── By Plan Tier ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Revenue by Plan Tier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['free', 'pro', 'business'] as const).map(tier => {
            const tierData = data.by_tier[tier] || { gmv: 0, fees: 0, count: 0 };
            const tierColors: Record<string, string> = {
              free: 'border-l-slate-400',
              pro: 'border-l-blue-500',
              business: 'border-l-amber-500',
            };
            return (
              <div
                key={tier}
                className={cn('border border-slate-100 rounded-lg p-4 border-l-4', tierColors[tier])}
              >
                <div className="text-sm font-medium text-slate-700 capitalize mb-2">{tier}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fees</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(tierData.fees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GMV</span>
                    <span className="font-mono text-slate-700">{formatCurrency(tierData.gmv)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sales</span>
                    <span className="font-mono text-slate-700">{tierData.count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top Tenants by Platform Fees ── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Top Tenants by Platform Fees</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">#</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Tenant</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Plan</th>
                <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Platform Fees</th>
                <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">GMV</th>
                <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.by_tenant.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No revenue data yet
                  </td>
                </tr>
              )}
              {data.by_tenant.slice(0, 20).map((t, i) => (
                <tr key={t.tenant_id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <TierBadge tier={t.tier} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-600 font-medium">
                    {formatCurrency(t.fees)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {formatCurrency(t.gmv)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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