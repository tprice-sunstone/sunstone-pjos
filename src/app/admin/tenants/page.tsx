// src/app/admin/tenants/page.tsx
// Searchable, sortable list of all tenants with management actions
'use client';

import { Fragment, useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  subscription_tier: string;
  payment_processor: string;
  onboarding_completed: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  sales_count: number;
  last_active: string | null;
  created_at: string;
  brand_color: string;
}

interface TenantDetail {
  tenant: any;
  owner: any;
  counts: { events: number; inventory_items: number; clients: number; members: number };
  recent_sales: Array<{ id: string; total: number; platform_fee_amount: number; created_at: string }>;
}

type SortKey = 'name' | 'created_at' | 'sales_count' | 'subscription_tier';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants || []);
      }
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(tenantId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch {
      toast.error('Failed to load tenant details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateTenant(tenantId: string, updates: Record<string, any>) {
    setActionLoading(tenantId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success('Tenant updated');
        await loadTenants();
        if (expandedId === tenantId) await loadDetail(tenantId);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setActionLoading(null);
    }
  }

  function toggleExpand(tenantId: string) {
    if (expandedId === tenantId) {
      setExpandedId(null);
      setDetail(null);
    } else {
      setExpandedId(tenantId);
      loadDetail(tenantId);
    }
  }

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(key === 'name');
    }
  }

  const filtered = useMemo(() => {
    let list = [...tenants];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.owner_email.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at);
          break;
        case 'sales_count':
          cmp = a.sales_count - b.sales_count;
          break;
        case 'subscription_tier':
          cmp = a.subscription_tier.localeCompare(b.subscription_tier);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [tenants, search, sortBy, sortAsc]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Tenants
        </h1>
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-8 animate-pulse">
          <div className="h-10 w-64 bg-[var(--surface-subtle)] rounded mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--surface-subtle)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display, Georgia)' }}>
          Tenants
        </h1>
        <div className="text-sm text-[var(--text-secondary)]">{tenants.length} total</div>
      </div>

      {/* Search */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)]">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by name, email, or slug…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--surface-subtle)] focus:bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <SortHeader label="Business" sortKey="name" current={sortBy} asc={sortAsc} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Owner</th>
                <SortHeader label="Plan" sortKey="subscription_tier" current={sortBy} asc={sortAsc} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Payment</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Onboarded</th>
                <SortHeader label="Sales" sortKey="sales_count" current={sortBy} asc={sortAsc} onSort={handleSort} />
                <SortHeader label="Created" sortKey="created_at" current={sortBy} asc={sortAsc} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                    {search ? 'No tenants match your search' : 'No tenants yet'}
                  </td>
                </tr>
              )}
              {filtered.map(t => (
                <Fragment key={t.id}>
                  <tr
                    onClick={() => toggleExpand(t.id)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]',
                      expandedId === t.id && 'bg-warning-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-bold"
                          style={{ backgroundColor: t.brand_color || '#94a3b8' }}
                        >
                          {t.name.charAt(0)}
                        </div>
                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{t.owner_email}</td>
                    <td className="px-4 py-3"><TierBadge tier={t.subscription_tier} /></td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{t.payment_processor}</td>
                    <td className="px-4 py-3">
                      {t.onboarding_completed ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3  text-[var(--text-secondary)]">{t.sales_count}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {t.is_suspended ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-error-50 text-error-600">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-50 text-success-600">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedId === t.id && (
                    <tr key={`${t.id}-detail`}>
                      <td colSpan={8} className="bg-[var(--surface-subtle)] px-6 py-6">
                        {detailLoading ? (
                          <div className="text-sm text-[var(--text-tertiary)] animate-pulse">Loading details…</div>
                        ) : detail ? (
                          <TenantDetailPanel
                            detail={detail}
                            tenant={t}
                            actionLoading={actionLoading === t.id}
                            onUpdatePlan={(tier) => updateTenant(t.id, { subscription_tier: tier })}
                            onToggleSuspend={() =>
                              updateTenant(t.id, {
                                is_suspended: !t.is_suspended,
                                suspended_reason: !t.is_suspended ? 'Suspended by platform admin' : undefined,
                              })
                            }
                          />
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tenant Detail Panel (expanded row)
// ============================================================================

function TenantDetailPanel({
  detail,
  tenant,
  actionLoading,
  onUpdatePlan,
  onToggleSuspend,
}: {
  detail: TenantDetail;
  tenant: Tenant;
  actionLoading: boolean;
  onUpdatePlan: (tier: string) => void;
  onToggleSuspend: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Counts row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Events" value={detail.counts.events} />
        <MiniStat label="Inventory Items" value={detail.counts.inventory_items} />
        <MiniStat label="Clients" value={detail.counts.clients} />
        <MiniStat label="Team Members" value={detail.counts.members} />
      </div>

      {/* Owner info */}
      {detail.owner && (
        <div className="text-sm text-[var(--text-secondary)]">
          Owner: <span className="font-medium text-[var(--text-primary)]">{detail.owner.email}</span>
          <span className="text-[var(--text-tertiary)] ml-2">
            (joined {new Date(detail.owner.created_at).toLocaleDateString()})
          </span>
        </div>
      )}

      {/* Recent sales */}
      {detail.recent_sales.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Recent Sales</h4>
          <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-subtle)]">
            {detail.recent_sales.slice(0, 5).map(s => (
              <div key={s.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{new Date(s.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-4">
                  <span className=" text-[var(--text-primary)]">{formatCurrency(Number(s.total))}</span>
                  <span className=" text-amber-600 text-xs">
                    +{formatCurrency(Number(s.platform_fee_amount))} fee
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Plan tier select */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Plan:</span>
          <select
            value={tenant.subscription_tier}
            onChange={e => onUpdatePlan(e.target.value)}
            disabled={actionLoading}
            className="text-sm border border-[var(--border-default)] rounded-lg px-3 py-1.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Suspend / Unsuspend */}
        <button
          onClick={onToggleSuspend}
          disabled={actionLoading}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            tenant.is_suspended
              ? 'bg-success-50 text-success-600 hover:bg-success-100'
              : 'bg-error-50 text-error-600 hover:bg-error-100'
          )}
        >
          {tenant.is_suspended ? 'Unsuspend' : 'Suspend'}
        </button>

        {/* TODO: View as tenant */}
        <span className="text-xs text-[var(--text-tertiary)] ml-2">
          View as tenant — coming soon
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Helper components
// ============================================================================

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] px-4 py-3">
      <div className="text-lg font-bold text-[var(--text-primary)] ">{value}</div>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
    pro: 'bg-info-50 text-info-600',
    business: 'bg-warning-50 text-warning-600',
  };
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', styles[tier] || styles.free)}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <svg className={cn('w-3 h-3', !asc && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}