// ============================================================================
// Gift Cards Management — src/app/dashboard/gift-cards/page.tsx
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { formatGiftCardCode } from '@/lib/gift-cards';
import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal';
import type { GiftCard, GiftCardRedemption, GiftCardStatus } from '@/types';

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;

const statusColors: Record<GiftCardStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  fully_redeemed: 'bg-blue-50 text-blue-700',
  expired: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
};

const statusLabels: Record<GiftCardStatus, string> = {
  active: 'Active',
  fully_redeemed: 'Redeemed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function GiftCardsPage() {
  const { tenant } = useTenant();
  const supabase = createClient();

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Summary stats
  const [stats, setStats] = useState({
    totalSold: 0,
    totalAmount: 0,
    outstandingBalance: 0,
    fullyRedeemed: 0,
    thisMonthCount: 0,
    thisMonthAmount: 0,
  });

  // Detail modal
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [redemptions, setRedemptions] = useState<GiftCardRedemption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('limit', '100');

      const res = await fetch(`/api/gift-cards?${params}`);
      const data = await res.json();
      if (res.ok) {
        setGiftCards(data.giftCards || []);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error('Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  }, [tenant, statusFilter, search]);

  // Compute stats from all cards (not filtered)
  const fetchStats = useCallback(async () => {
    if (!tenant) return;
    try {
      const res = await fetch('/api/gift-cards?limit=100');
      const data = await res.json();
      const cards: GiftCard[] = data.giftCards || [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        totalSold: cards.length,
        totalAmount: cards.reduce((s, c) => s + Number(c.amount), 0),
        outstandingBalance: cards
          .filter((c) => c.status === 'active')
          .reduce((s, c) => s + Number(c.remaining_balance), 0),
        fullyRedeemed: cards.filter((c) => c.status === 'fully_redeemed').length,
        thisMonthCount: cards.filter((c) => new Date(c.purchased_at) >= monthStart).length,
        thisMonthAmount: cards
          .filter((c) => new Date(c.purchased_at) >= monthStart)
          .reduce((s, c) => s + Number(c.amount), 0),
      });
    } catch {}
  }, [tenant]);

  useEffect(() => { fetchCards(); }, [fetchCards]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const viewDetail = async (card: GiftCard) => {
    setSelectedCard(card);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/gift-cards/${card.id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedCard(data);
        setRedemptions(data.redemptions || []);
      }
    } catch {}
    finally { setLoadingDetail(false); }
  };

  const handleCancel = async (card: GiftCard) => {
    if (!confirm(`Cancel gift card ${formatGiftCardCode(card.code)}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/gift-cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        toast.success('Gift card cancelled');
        fetchCards();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to cancel');
      }
    } catch { toast.error('Failed to cancel'); }
  };

  const handleResend = async (card: GiftCard) => {
    try {
      const res = await fetch(`/api/gift-cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      });
      const data = await res.json();
      if (res.ok && data.resent) {
        toast.success(`Resent via ${data.method}`);
      } else {
        toast.error(data.error || 'Failed to resend');
      }
    } catch { toast.error('Failed to resend'); }
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Gift Cards</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">Manage gift cards sold from POS</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Total Sold</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalSold}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{money(stats.totalAmount)} total</p>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Outstanding</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{money(stats.outstandingBalance)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">unredeemed balance</p>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Fully Redeemed</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.fullyRedeemed}</p>
          <p className="text-xs text-[var(--text-tertiary)]">cards used up</p>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">This Month</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.thisMonthCount}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{money(stats.thisMonthAmount)} revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="fully_redeemed">Fully Redeemed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name..."
          className="h-10 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-sm text-[var(--text-primary)] flex-1 focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        </div>
      ) : giftCards.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-[var(--text-secondary)] font-medium">No gift cards yet</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Sell gift cards from the POS to see them here</p>
        </div>
      ) : (
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Code</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Balance</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] hidden sm:table-cell">Recipient</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] hidden md:table-cell">From</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((card) => (
                  <tr
                    key={card.id}
                    className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                    onClick={() => viewDetail(card)}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] tracking-wide">
                      {formatGiftCardCode(card.code)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {money(Number(card.amount))}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                      {money(Number(card.remaining_balance))}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                      {card.recipient_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] hidden md:table-cell">
                      {card.purchaser_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[card.status as GiftCardStatus]}`}>
                        {statusLabels[card.status as GiftCardStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] hidden sm:table-cell">
                      {new Date(card.purchased_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {card.status === 'active' && card.delivery_method !== 'none' && card.delivery_method !== 'print' && (
                          <button
                            onClick={() => handleResend(card)}
                            className="px-2 py-1 text-xs text-[var(--accent-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors min-h-[32px]"
                            title="Resend"
                          >
                            Resend
                          </button>
                        )}
                        {card.status === 'active' && (
                          <button
                            onClick={() => handleCancel(card)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[32px]"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <Modal isOpen={true} onClose={() => { setSelectedCard(null); setRedemptions([]); }} size="lg">
          <ModalHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Gift Card Detail</h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedCard.status as GiftCardStatus]}`}>
                {statusLabels[selectedCard.status as GiftCardStatus]}
              </span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-5">
              {/* Card info */}
              <div className="bg-[var(--surface-subtle)] rounded-2xl p-5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">Code</p>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-widest mb-3">
                  {formatGiftCardCode(selectedCard.code)}
                </p>
                <div className="flex items-center justify-center gap-6">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Original</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{money(Number(selectedCard.amount))}</p>
                  </div>
                  <div className="w-px h-8 bg-[var(--border-default)]" />
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Remaining</p>
                    <p className="text-lg font-bold text-[var(--accent-primary)]">{money(Number(selectedCard.remaining_balance))}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-tertiary)]">Recipient</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedCard.recipient_name}</p>
                </div>
                {selectedCard.purchaser_name && (
                  <div>
                    <p className="text-[var(--text-tertiary)]">From</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedCard.purchaser_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-[var(--text-tertiary)]">Purchased</p>
                  <p className="font-medium text-[var(--text-primary)]">{new Date(selectedCard.purchased_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)]">Delivery</p>
                  <p className="font-medium text-[var(--text-primary)] capitalize">
                    {selectedCard.delivery_method}
                    {selectedCard.delivered_at && (
                      <span className="text-xs text-[var(--text-tertiary)]"> (sent)</span>
                    )}
                  </p>
                </div>
                {selectedCard.personal_message && (
                  <div className="col-span-2">
                    <p className="text-[var(--text-tertiary)]">Message</p>
                    <p className="text-[var(--text-primary)] italic">&ldquo;{selectedCard.personal_message}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Redemption history */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
                  Redemption History
                </p>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                  </div>
                ) : redemptions.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] py-2">No redemptions yet</p>
                ) : (
                  <div className="space-y-2">
                    {redemptions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">-{money(Number(r.amount))}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {new Date(r.redeemed_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Sale: {r.sale_id.slice(0, 8)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
