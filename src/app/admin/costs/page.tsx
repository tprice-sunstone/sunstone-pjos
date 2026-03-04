// src/app/admin/costs/page.tsx
// Platform API cost tracker — Anthropic, Twilio, Resend spend breakdown
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CostsData {
  totalCost: number;
  byService: { anthropic: number; twilio: number; resend: number };
  daily: Array<{ date: string; anthropic: number; twilio: number; resend: number }>;
  byTenant: Array<{ tenant_id: string; tenant_name: string; total: number; anthropic: number; twilio: number; resend: number }>;
  byOperation: Array<{ operation: string; count: number; total_cost: number }>;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const SERVICE_COLORS: Record<string, string> = {
  anthropic: 'bg-purple-500',
  twilio: 'bg-red-400',
  resend: 'bg-emerald-400',
};

const SERVICE_DOT_COLORS: Record<string, string> = {
  anthropic: 'bg-purple-500',
  twilio: 'bg-red-400',
  resend: 'bg-emerald-400',
};

function formatCost(n: number): string {
  return '$' + n.toFixed(n >= 1 ? 2 : 4);
}

const OPERATION_LABELS: Record<string, string> = {
  mentor_chat: 'Sunny Chat',
  admin_ai: 'Atlas AI',
  admin_insights: 'Admin Insights',
  sunny_demo: 'Landing Page Demo',
  sms_queue_notify: 'Queue SMS (Next Up)',
  sms_position_notify: 'Queue SMS (Position)',
  sms_direct: 'Direct SMS',
  sms_broadcast: 'Broadcast SMS',
  email_direct: 'Direct Email',
  email_broadcast: 'Broadcast Email',
  email_receipt: 'Receipt Email',
};

export default function AdminCostsPage() {
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(d => {
        if (d.role === 'support' || d.role === 'viewer') {
          setAccessDenied(true);
          setLoading(false);
        } else {
          loadCosts();
        }
      })
      .catch(() => loadCosts());
  }, []);

  async function loadCosts() {
    try {
      const res = await fetch('/api/admin/costs?range=all');
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  }

  function getFilteredDaily() {
    if (!data) return [];
    if (timeRange === 'all') return data.daily;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().substring(0, 10);
    return data.daily.filter(d => d.date >= cutoffStr);
  }

  function getFilteredTotals() {
    const filtered = getFilteredDaily();
    return filtered.reduce(
      (acc, d) => ({
        total: acc.total + d.anthropic + d.twilio + d.resend,
        anthropic: acc.anthropic + d.anthropic,
        twilio: acc.twilio + d.twilio,
        resend: acc.resend + d.resend,
      }),
      { total: 0, anthropic: 0, twilio: 0, resend: 0 }
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Access Restricted
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          You don&apos;t have permission to view cost data. Contact a super admin for access.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Platform Costs
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6 animate-pulse">
              <div className="h-4 w-20 bg-[var(--surface-subtle)] rounded mb-3" />
              <div className="h-8 w-24 bg-[var(--surface-subtle)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredDaily = getFilteredDaily();
  const totals = timeRange === 'all'
    ? { total: data.totalCost, anthropic: data.byService.anthropic, twilio: data.byService.twilio, resend: data.byService.resend }
    : getFilteredTotals();
  const maxDailyTotal = Math.max(...filteredDaily.map(d => d.anthropic + d.twilio + d.resend), 0.001);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Platform Costs
        </h1>
        <div className="flex items-center bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                timeRange === range
                  ? 'bg-accent-500 text-[var(--text-on-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-accent-600">{formatCost(totals.total)}</div>
        </div>
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Anthropic
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCost(totals.anthropic)}</div>
        </div>
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Twilio
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCost(totals.twilio)}</div>
        </div>
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Resend
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCost(totals.resend)}</div>
        </div>
      </div>

      {/* ── Daily Cost Chart (stacked bars) ── */}
      {filteredDaily.length > 0 && (
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Daily Costs by Service</h2>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />AI</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />SMS</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Email</span>
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-40 overflow-x-auto pb-2">
            {filteredDaily.map((d) => {
              const dayTotal = d.anthropic + d.twilio + d.resend;
              const pctAnthropic = (d.anthropic / maxDailyTotal) * 100;
              const pctTwilio = (d.twilio / maxDailyTotal) * 100;
              const pctResend = (d.resend / maxDailyTotal) * 100;
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center group relative"
                  style={{ minWidth: filteredDaily.length > 60 ? 4 : 12, flex: '1 1 0' }}
                >
                  <div className="w-full flex flex-col-reverse" style={{ height: `${Math.max(((dayTotal / maxDailyTotal) * 100), 2)}%` }}>
                    {d.anthropic > 0 && <div className="w-full bg-purple-500 rounded-t-sm" style={{ height: `${(pctAnthropic / (pctAnthropic + pctTwilio + pctResend)) * 100}%`, minHeight: 1 }} />}
                    {d.twilio > 0 && <div className="w-full bg-red-400" style={{ height: `${(pctTwilio / (pctAnthropic + pctTwilio + pctResend)) * 100}%`, minHeight: 1 }} />}
                    {d.resend > 0 && <div className="w-full bg-emerald-400" style={{ height: `${(pctResend / (pctAnthropic + pctTwilio + pctResend)) * 100}%`, minHeight: 1 }} />}
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full mb-2 bg-[var(--surface-overlay)] text-[var(--text-primary)] text-[10px] rounded-md px-2 py-1 whitespace-nowrap z-10 pointer-events-none border border-[var(--border-default)] shadow-md">
                    {d.date}: {formatCost(dayTotal)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
            <span>{filteredDaily[0]?.date}</span>
            <span>{filteredDaily[filteredDaily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* ── Operations Breakdown ── */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)]">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Cost by Operation</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Operation</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Calls</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Total Cost</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Avg Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.byOperation.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                    No cost data yet
                  </td>
                </tr>
              )}
              {data.byOperation.map(op => (
                <tr key={op.operation} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    {OPERATION_LABELS[op.operation] || op.operation}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{op.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-accent-600 font-medium">{formatCost(op.total_cost)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatCost(op.count > 0 ? op.total_cost / op.count : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Per-Tenant Breakdown ── */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)]">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Cost by Tenant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">#</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Tenant</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Total</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Anthropic</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Twilio</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Resend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.byTenant.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                    No cost data yet
                  </td>
                </tr>
              )}
              {data.byTenant.slice(0, 20).map((t, i) => (
                <tr key={t.tenant_id} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{t.tenant_name}</td>
                  <td className="px-4 py-3 text-right text-accent-600 font-medium">{formatCost(t.total)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatCost(t.anthropic)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatCost(t.twilio)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatCost(t.resend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
