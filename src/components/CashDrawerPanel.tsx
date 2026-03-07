'use client';

// ============================================================================
// Cash Drawer Panel — Self-contained component for POS cash drawer management
// src/components/CashDrawerPanel.tsx
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CashDrawer, CashDrawerTransaction } from '@/types';

interface CashDrawerPanelProps {
  tenantId: string;
  eventId?: string;
  mode: 'store' | 'event';
  onDrawerChange: (drawerId: string | null) => void;
  refreshTrigger?: number;
}

export default function CashDrawerPanel({ tenantId, eventId, mode, onDrawerChange, refreshTrigger }: CashDrawerPanelProps) {
  const [drawer, setDrawer] = useState<(CashDrawer & { transactions?: CashDrawerTransaction[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Track drawer ID via ref so refresh effects can access it without stale closures
  const drawerIdRef = useRef<string | null>(null);
  useEffect(() => {
    drawerIdRef.current = drawer?.id || null;
  }, [drawer]);

  // Stable ref for onDrawerChange — prevents useCallback identity churn
  const onDrawerChangeRef = useRef(onDrawerChange);
  onDrawerChangeRef.current = onDrawerChange;

  // Retry counter ref — caps retries at 2 to prevent infinite loops
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  // Track whether initial fetch has run (prevents re-running on useCallback identity changes)
  const hasFetchedRef = useRef(false);

  // Modal states
  const [showOpen, setShowOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPayInOut, setShowPayInOut] = useState<'pay_in' | 'pay_out' | null>(null);
  const [showClose, setShowClose] = useState(false);

  // Form states
  const [openingAmount, setOpeningAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch open drawer on mount ──────────────────────────────────────────

  const fetchOpenDrawer = useCallback(async () => {
    let willRetry = false;
    try {
      const params = new URLSearchParams({ status: 'open' });
      if (eventId) params.set('event_id', eventId);
      const res = await fetch(`/api/cash-drawers?${params}`);

      if (!res.ok) {
        console.error(`[CashDrawer] Fetch failed: ${res.status} (retry ${retryCountRef.current}/${MAX_RETRIES})`);
        if (retryCountRef.current < MAX_RETRIES) {
          willRetry = true;
          retryCountRef.current += 1;
          setTimeout(() => fetchOpenDrawer(), 2000);
        } else {
          setFetchError(true);
        }
        return;
      }

      // Success — reset retry counter and clear any prior error
      retryCountRef.current = 0;
      setFetchError(false);

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const match = eventId
          ? data.find((d: CashDrawer) => d.event_id === eventId)
          : data.find((d: CashDrawer) => !d.event_id);

        if (match) {
          setDrawer(match);
          onDrawerChangeRef.current(match.id);
        } else {
          setDrawer(null);
          onDrawerChangeRef.current(null);
        }
      } else {
        setDrawer(null);
        onDrawerChangeRef.current(null);
      }
    } catch (err) {
      console.error(`[CashDrawer] Fetch error (retry ${retryCountRef.current}/${MAX_RETRIES}):`, err);
      if (retryCountRef.current < MAX_RETRIES) {
        willRetry = true;
        retryCountRef.current += 1;
        setTimeout(() => fetchOpenDrawer(), 2000);
      } else {
        setFetchError(true);
      }
    } finally {
      if (!willRetry) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchOpenDrawer();
    }
  }, [fetchOpenDrawer]);

  // Auto-prompt in event mode when no drawer is open (skip if fetch errored)
  useEffect(() => {
    if (mode === 'event' && !loading && !drawer && !fetchError) {
      const timer = setTimeout(() => setShowOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [mode, loading, drawer, fetchError]);

  // ── Refresh drawer data when refreshTrigger changes (e.g. after cash sale) ──

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      const id = drawerIdRef.current;
      if (id) {
        // Drawer is open — fetch detail (includes transactions) so expected balance updates
        fetchDrawerDetail(id);
      } else {
        // No drawer known — re-discover, but reset retry counter first so it gets a fresh attempt
        retryCountRef.current = 0;
        setFetchError(false);
        fetchOpenDrawer();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // ── Fetch drawer detail (with transactions) ────────────────────────────

  const fetchDrawerDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cash-drawers/${id}`);
      if (!res.ok) {
        console.error(`[CashDrawer] Detail fetch failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      setDrawer(data);
    } catch (err) {
      console.error('[CashDrawer] Detail fetch error:', err);
    }
  }, []);

  // ── Open drawer ─────────────────────────────────────────────────────────

  const handleOpen = async () => {
    const amt = parseFloat(openingAmount);
    if (isNaN(amt) || amt < 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/cash-drawers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: amt, eventId: eventId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawer(data);
        onDrawerChangeRef.current(data.id);
        setShowOpen(false);
        setOpeningAmount('');
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pay In/Out ──────────────────────────────────────────────────────────

  const handlePayInOut = async () => {
    if (!drawer || !showPayInOut) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cash-drawers/${drawer.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: showPayInOut, amount: amt, note: payNote || null }),
      });
      if (res.ok) {
        await fetchDrawerDetail(drawer.id);
        setShowPayInOut(null);
        setPayAmount('');
        setPayNote('');
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  // ── Close drawer ────────────────────────────────────────────────────────

  const handleClose = async () => {
    if (!drawer) return;
    const amt = parseFloat(closingAmount);
    if (isNaN(amt) || amt < 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cash-drawers/${drawer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingBalance: amt, notes: closeNotes || null }),
      });
      if (res.ok) {
        setDrawer(null);
        onDrawerChangeRef.current(null);
        setShowClose(false);
        setShowDetail(false);
        setClosingAmount('');
        setCloseNotes('');
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  // ── Compute expected balance from transactions ──────────────────────────

  const computeExpected = (): number => {
    if (!drawer) return 0;
    let balance = Number(drawer.opening_amount);
    for (const txn of drawer.transactions || []) {
      const amt = Number(txn.amount);
      if (txn.type === 'sale' || txn.type === 'tip' || txn.type === 'pay_in') {
        balance += amt;
      } else if (txn.type === 'pay_out') {
        balance -= amt;
      } else if (txn.type === 'adjustment') {
        balance += amt;
      }
    }
    return Math.round(balance * 100) / 100;
  };

  const expectedBalance = computeExpected();
  const closingNum = parseFloat(closingAmount);
  const overShort = !isNaN(closingNum) ? Math.round((closingNum - expectedBalance) * 100) / 100 : null;

  // ── Render ──────────────────────────────────────────────────────────────

  const txnLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Cash Sale';
      case 'tip': return 'Cash Tip';
      case 'pay_in': return 'Pay In';
      case 'pay_out': return 'Pay Out';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  return (
    <>
      {/* ── Header Button ────────────────────────────────────────────────── */}
      <button
        onClick={() => {
          if (fetchError) {
            // Retry on click when in error state
            retryCountRef.current = 0;
            setFetchError(false);
            setLoading(true);
            fetchOpenDrawer();
          } else if (drawer) {
            fetchDrawerDetail(drawer.id);
            setShowDetail(true);
          } else {
            setShowOpen(true);
          }
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors hover:bg-[var(--surface-subtle)]"
        title={fetchError ? 'Cash Drawer — tap to retry' : drawer ? 'Cash Drawer (Open)' : 'Open Cash Drawer'}
      >
        {/* Cash register icon */}
        <svg className={`w-5 h-5 ${fetchError ? 'text-amber-500' : drawer ? 'text-emerald-600' : 'text-[var(--text-tertiary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        {drawer && !fetchError && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
        )}
        {fetchError && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>

      {/* ── Open Drawer Modal ──────────────────────────────────────────── */}
      <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} size="sm">
        <ModalHeader>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Open Cash Drawer</h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">How much cash are you starting with?</p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Starting Cash</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="flex gap-2">
              {['50', '100', '200'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setOpeningAmount(preset)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px]"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowOpen(false)}>Cancel</Button>
          <Button
            onClick={handleOpen}
            disabled={submitting || !openingAmount || parseFloat(openingAmount) < 0}
          >
            {submitting ? 'Opening...' : 'Open Drawer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Detail Sheet ───────────────────────────────────────────────── */}
      <Modal isOpen={showDetail && !!drawer} onClose={() => setShowDetail(false)} size="lg">
        <ModalHeader>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cash Drawer</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              Opened {drawer?.opened_at ? new Date(drawer.opened_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
            </span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Balance summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Opening</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">${Number(drawer?.opening_amount || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Expected</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">${expectedBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Transaction log */}
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Transactions</p>
              {(drawer?.transactions || []).length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] italic py-3">No transactions yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(drawer?.transactions || []).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface-subtle)]">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{txnLabel(txn.type)}</p>
                        {txn.description && <p className="text-xs text-[var(--text-tertiary)]">{txn.description}</p>}
                        <p className="text-xs text-[var(--text-tertiary)]">{new Date(txn.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-sm font-medium ${txn.type === 'pay_out' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {txn.type === 'pay_out' ? '-' : '+'}${Number(txn.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowDetail(false); setShowPayInOut('pay_in'); }}>Pay In</Button>
            <Button variant="secondary" className="flex-1" onClick={() => { setShowDetail(false); setShowPayInOut('pay_out'); }}>Pay Out</Button>
            <Button variant="danger" className="flex-1" onClick={() => { setShowDetail(false); setShowClose(true); }}>Close Drawer</Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* ── Pay In/Out Modal ───────────────────────────────────────────── */}
      <Modal isOpen={!!showPayInOut} onClose={() => { setShowPayInOut(null); setPayAmount(''); setPayNote(''); }} size="sm">
        <ModalHeader>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {showPayInOut === 'pay_in' ? 'Pay In' : 'Pay Out'}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {showPayInOut === 'pay_in' ? 'Add cash to the drawer' : 'Remove cash from the drawer'}
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Amount</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Note (optional)</label>
              <Input
                type="text"
                placeholder={showPayInOut === 'pay_in' ? 'e.g. Change for the day' : 'e.g. Bought supplies'}
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setShowPayInOut(null); setPayAmount(''); setPayNote(''); }}>Cancel</Button>
          <Button
            onClick={handlePayInOut}
            disabled={submitting || !payAmount || parseFloat(payAmount) <= 0}
          >
            {submitting ? 'Saving...' : showPayInOut === 'pay_in' ? 'Pay In' : 'Pay Out'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Close Drawer Modal ─────────────────────────────────────────── */}
      <Modal isOpen={showClose && !!drawer} onClose={() => { setShowClose(false); setClosingAmount(''); setCloseNotes(''); }} size="sm">
        <ModalHeader>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Close Cash Drawer</h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Count the cash and enter the total below.</p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Expected Cash</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">${expectedBalance.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Counted Cash</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="text-lg"
              />
            </div>

            {overShort !== null && (
              <div className={`rounded-xl p-3 ${overShort === 0 ? 'bg-emerald-50' : overShort > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: overShort === 0 ? '#059669' : overShort > 0 ? '#2563eb' : '#dc2626' }}>
                  {overShort === 0 ? 'Balanced' : overShort > 0 ? 'Over' : 'Short'}
                </p>
                <p className="text-lg font-bold" style={{ color: overShort === 0 ? '#059669' : overShort > 0 ? '#2563eb' : '#dc2626' }}>
                  {overShort >= 0 ? '+' : '-'}${Math.abs(overShort).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notes (optional)</label>
              <Input
                type="text"
                placeholder="Any notes about this drawer session"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setShowClose(false); setClosingAmount(''); setCloseNotes(''); }}>Cancel</Button>
          <Button
            variant="danger"
            onClick={handleClose}
            disabled={submitting || !closingAmount || parseFloat(closingAmount) < 0}
          >
            {submitting ? 'Closing...' : 'Close Drawer'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
