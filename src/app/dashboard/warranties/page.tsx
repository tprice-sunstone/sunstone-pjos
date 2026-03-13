// ============================================================================
// Warranties Management — src/app/dashboard/warranties/page.tsx
// ============================================================================
// List view with detail panel, claim filing, and claim management.
// Follows the Gift Cards page layout pattern.
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea, Badge } from '@/components/ui';
import type { WarrantyStatus, WarrantyClaimStatus } from '@/types';

// ============================================================================
// Helpers
// ============================================================================

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;

const statusColors: Record<WarrantyStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  claimed: 'bg-amber-50 text-amber-700',
  expired: 'bg-gray-100 text-gray-600',
  voided: 'bg-red-50 text-red-700',
};

const statusLabels: Record<WarrantyStatus, string> = {
  active: 'Active',
  claimed: 'Claimed',
  expired: 'Expired',
  voided: 'Voided',
};

const claimStatusColors: Record<WarrantyClaimStatus, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  denied: 'bg-red-50 text-red-700',
};

const claimStatusLabels: Record<WarrantyClaimStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  completed: 'Completed',
  denied: 'Denied',
};

interface WarrantyRow {
  id: string;
  sale_id: string;
  sale_item_id: string | null;
  client_id: string | null;
  scope: 'per_item' | 'per_invoice';
  amount: number;
  coverage_terms: string | null;
  status: WarrantyStatus;
  purchased_at: string;
  expires_at: string | null;
  photo_url: string | null;
  notes: string | null;
  // Joined
  client?: { first_name: string | null; last_name: string | null } | null;
  sale_item?: { name: string } | null;
  sale?: { created_at: string; total: number } | null;
}

interface ClaimRow {
  id: string;
  warranty_id: string;
  claim_date: string;
  description: string;
  repair_details: string | null;
  status: WarrantyClaimStatus;
  resolved_at: string | null;
  notes: string | null;
}

// ============================================================================
// Page Component
// ============================================================================

export default function WarrantiesPage() {
  const { tenant } = useTenant();
  const supabase = createClient();

  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    claimed: 0,
    totalValue: 0,
  });

  // Detail panel
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRow | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimDescription, setClaimDescription] = useState('');
  const [claimStatus, setClaimStatus] = useState<WarrantyClaimStatus>('submitted');
  const [claimRepairDetails, setClaimRepairDetails] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [savingClaim, setSavingClaim] = useState(false);

  // Edit claim
  const [editingClaim, setEditingClaim] = useState<ClaimRow | null>(null);

  // ── Fetch warranties ──────────────────────────────────────────────────

  const fetchWarranties = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      let query = supabase
        .from('warranties')
        .select('*, client:clients(first_name, last_name), sale_item:sale_items(name), sale:sales(created_at, total)')
        .eq('tenant_id', tenant.id)
        .order('purchased_at', { ascending: false })
        .limit(200);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data || []) as WarrantyRow[];

      // Client name search
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((w) => {
          const name = [w.client?.first_name, w.client?.last_name].filter(Boolean).join(' ').toLowerCase();
          const itemName = w.sale_item?.name?.toLowerCase() || '';
          return name.includes(q) || itemName.includes(q);
        });
      }

      setWarranties(filtered);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load warranties');
    } finally {
      setLoading(false);
    }
  }, [tenant, statusFilter, search, supabase]);

  const fetchStats = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('warranties')
      .select('status, amount')
      .eq('tenant_id', tenant.id);

    if (data) {
      setStats({
        total: data.length,
        active: data.filter((w) => w.status === 'active').length,
        claimed: data.filter((w) => w.status === 'claimed').length,
        totalValue: data.reduce((sum, w) => sum + Number(w.amount), 0),
      });
    }
  }, [tenant, supabase]);

  useEffect(() => { fetchWarranties(); }, [fetchWarranties]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Detail view ────────────────────────────────────────────────────────

  const viewDetail = async (warranty: WarrantyRow) => {
    setSelectedWarranty(warranty);
    setLoadingDetail(true);
    setClaims([]);

    const { data } = await supabase
      .from('warranty_claims')
      .select('*')
      .eq('warranty_id', warranty.id)
      .order('claim_date', { ascending: false });

    setClaims((data || []) as ClaimRow[]);
    setLoadingDetail(false);
  };

  // ── Void warranty ──────────────────────────────────────────────────────

  const handleVoid = async (warranty: WarrantyRow) => {
    if (!confirm('Void this warranty? This cannot be undone.')) return;
    const { error } = await supabase
      .from('warranties')
      .update({ status: 'voided', updated_at: new Date().toISOString() })
      .eq('id', warranty.id);
    if (error) {
      toast.error('Failed to void warranty');
    } else {
      toast.success('Warranty voided');
      setSelectedWarranty(null);
      fetchWarranties();
      fetchStats();
    }
  };

  // ── File claim ─────────────────────────────────────────────────────────

  const openClaimModal = (warranty?: WarrantyRow) => {
    setClaimDescription('');
    setClaimStatus('submitted');
    setClaimRepairDetails('');
    setClaimNotes('');
    setEditingClaim(null);
    setShowClaimModal(true);
  };

  const openEditClaim = (claim: ClaimRow) => {
    setEditingClaim(claim);
    setClaimDescription(claim.description);
    setClaimStatus(claim.status);
    setClaimRepairDetails(claim.repair_details || '');
    setClaimNotes(claim.notes || '');
    setShowClaimModal(true);
  };

  const saveClaim = async () => {
    if (!selectedWarranty || !tenant) return;
    if (!claimDescription.trim()) {
      toast.error('Description is required');
      return;
    }
    setSavingClaim(true);
    try {
      if (editingClaim) {
        // Update existing claim
        const updates: Record<string, any> = {
          description: claimDescription.trim(),
          status: claimStatus,
          repair_details: claimRepairDetails.trim() || null,
          notes: claimNotes.trim() || null,
          updated_at: new Date().toISOString(),
        };
        if (claimStatus === 'completed' && !editingClaim.resolved_at) {
          updates.resolved_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('warranty_claims')
          .update(updates)
          .eq('id', editingClaim.id);
        if (error) throw error;
        toast.success('Claim updated');
      } else {
        // Create new claim
        const { error } = await supabase.from('warranty_claims').insert({
          warranty_id: selectedWarranty.id,
          tenant_id: tenant.id,
          description: claimDescription.trim(),
          status: claimStatus,
          repair_details: claimRepairDetails.trim() || null,
          notes: claimNotes.trim() || null,
        });
        if (error) throw error;

        // Update warranty status to claimed
        await supabase
          .from('warranties')
          .update({ status: 'claimed', updated_at: new Date().toISOString() })
          .eq('id', selectedWarranty.id);

        toast.success('Claim filed');
      }

      setShowClaimModal(false);
      // Refresh
      viewDetail(selectedWarranty);
      fetchWarranties();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save claim');
    } finally {
      setSavingClaim(false);
    }
  };

  const markClaimCompleted = async (claim: ClaimRow) => {
    const { error } = await supabase
      .from('warranty_claims')
      .update({
        status: 'completed',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claim.id);
    if (error) {
      toast.error('Failed to update claim');
    } else {
      toast.success('Claim marked completed');
      if (selectedWarranty) viewDetail(selectedWarranty);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const clientName = (w: WarrantyRow) => {
    if (!w.client) return 'Walk-in';
    return [w.client.first_name, w.client.last_name].filter(Boolean).join(' ') || 'Walk-in';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const durationLabel = (w: WarrantyRow) => {
    if (!w.expires_at) return 'Lifetime';
    const exp = new Date(w.expires_at);
    const now = new Date();
    if (exp < now) return `Expired ${formatDate(w.expires_at)}`;
    return `Expires ${formatDate(w.expires_at)}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Warranties</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">Track and manage warranty protection on permanent jewelry</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Warranties', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Claimed', value: stats.claimed },
          { label: 'Total Value', value: money(stats.totalValue) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{card.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="claimed">Claimed</option>
          <option value="expired">Expired</option>
          <option value="voided">Voided</option>
        </select>
        <input
          type="text"
          placeholder="Search by customer or item name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm flex-1 focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : warranties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-[var(--border-default)]">
          <svg className="w-10 h-10 text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-[var(--text-tertiary)] text-sm font-medium">No warranties yet</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">Warranties are created when customers purchase warranty protection in the POS</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-subtle)] text-[var(--text-tertiary)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Scope</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Item</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {warranties.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => viewDetail(w)}
                  className="hover:bg-[var(--surface-raised)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{clientName(w)}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)] hidden sm:table-cell">{formatDate(w.purchased_at)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                    {w.scope === 'per_item' ? 'Per Item' : 'Per Invoice'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell truncate max-w-[180px]">
                    {w.sale_item?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{money(w.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[w.status]}`}>
                      {statusLabels[w.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)] hidden sm:table-cell text-xs">{durationLabel(w)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      {selectedWarranty && (
        <Modal isOpen onClose={() => setSelectedWarranty(null)} size="lg">
          <ModalHeader>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Warranty Details</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedWarranty.status]}`}>
                {statusLabels[selectedWarranty.status]}
              </span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Customer</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{clientName(selectedWarranty)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Amount</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{money(selectedWarranty.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Scope</p>
                  <p className="text-[var(--text-primary)] mt-0.5">
                    {selectedWarranty.scope === 'per_item'
                      ? `Per Item — ${selectedWarranty.sale_item?.name || 'Unknown'}`
                      : 'Per Invoice'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Purchased</p>
                  <p className="text-[var(--text-primary)] mt-0.5">{formatDate(selectedWarranty.purchased_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Duration</p>
                  <p className="text-[var(--text-primary)] mt-0.5">{durationLabel(selectedWarranty)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Warranty ID</p>
                  <p className="text-[var(--text-tertiary)] mt-0.5 text-xs break-all">{selectedWarranty.id.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Coverage terms */}
              {selectedWarranty.coverage_terms && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Coverage Terms</p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{selectedWarranty.coverage_terms}</p>
                </div>
              )}

              {/* Photo placeholder */}
              <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] p-4 flex items-center gap-3">
                <svg className="w-8 h-8 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">No photo attached</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Photo will be available when the camera feature launches</p>
                </div>
              </div>

              {/* Claims history */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Claims History</p>
                  {selectedWarranty.status !== 'voided' && (
                    <Button variant="primary" size="sm" onClick={() => openClaimModal()}>
                      File Claim
                    </Button>
                  )}
                </div>

                {loadingDetail ? (
                  <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">Loading...</div>
                ) : claims.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-default)] p-4 text-center">
                    <p className="text-sm text-[var(--text-tertiary)]">No claims filed</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${claimStatusColors[claim.status]}`}>
                                {claimStatusLabels[claim.status]}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">{formatDate(claim.claim_date)}</span>
                            </div>
                            <p className="text-sm text-[var(--text-primary)]">{claim.description}</p>
                            {claim.repair_details && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Repair: {claim.repair_details}</p>
                            )}
                            {claim.notes && (
                              <p className="text-xs text-[var(--text-tertiary)] mt-1">Notes: {claim.notes}</p>
                            )}
                            {claim.resolved_at && (
                              <p className="text-xs text-[var(--text-tertiary)] mt-1">Resolved {formatDate(claim.resolved_at)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {claim.status !== 'completed' && claim.status !== 'denied' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markClaimCompleted(claim); }}
                                className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditClaim(claim); }}
                              className="text-xs px-2 py-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedWarranty.status === 'active' && (
                <div className="border-t border-[var(--border-subtle)] pt-4 flex justify-end">
                  <Button variant="danger" size="sm" onClick={() => handleVoid(selectedWarranty)}>
                    Void Warranty
                  </Button>
                </div>
              )}
            </div>
          </ModalBody>
        </Modal>
      )}

      {/* ── Claim Modal ─────────────────────────────────────────────────── */}
      {showClaimModal && (
        <Modal isOpen onClose={() => setShowClaimModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {editingClaim ? 'Edit Claim' : 'File Warranty Claim'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Textarea
                label="Description"
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                placeholder="What happened? What needs repair?"
                rows={3}
              />
              <Select
                label="Status"
                value={claimStatus}
                onChange={(e) => setClaimStatus(e.target.value as WarrantyClaimStatus)}
              >
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="denied">Denied</option>
              </Select>
              <Textarea
                label="Repair Details (optional)"
                value={claimRepairDetails}
                onChange={(e) => setClaimRepairDetails(e.target.value)}
                placeholder="What was done to fix it?"
                rows={2}
              />
              <Textarea
                label="Notes (optional)"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowClaimModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={savingClaim} onClick={saveClaim}>
                {editingClaim ? 'Save Changes' : 'File Claim'}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
