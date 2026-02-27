// ============================================================================
// MiniQueueStrip — src/components/MiniQueueStrip.tsx
// ============================================================================
// Collapsible queue/check-in strip for POS pages.
// mode='event': Queue with Now Serving / Up Next / Waiting hierarchy + Notify
// mode='store': Flat check-in list with Ready / Serving labels, no Notify
// ============================================================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface QueueEntry {
  id: string;
  tenant_id: string;
  event_id: string | null;
  client_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  position: number;
  status: string;
  notified_at: string | null;
  served_at: string | null;
  waiver_id: string | null;
  sms_consent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MiniQueueStripProps {
  tenantId: string;
  eventId?: string;
  mode: 'event' | 'store';
  onStartSale: (entry: QueueEntry) => void;
  isServingActive?: boolean;
  refreshTrigger?: number;
}

export default function MiniQueueStrip({
  tenantId,
  eventId,
  mode,
  onStartSale,
  isServingActive = false,
  refreshTrigger = 0,
}: MiniQueueStripProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  // ── Fetch entries ──────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('tenant_id', tenantId);

    if (mode === 'event' && eventId) {
      query = query.eq('event_id', eventId).in('status', ['waiting', 'notified', 'serving']);
    } else if (mode === 'store') {
      query = query.is('event_id', null).in('status', ['waiting', 'serving']);
    }

    const { data } = await query.order('position', { ascending: true });
    setEntries((data || []) as QueueEntry[]);
  }, [tenantId, eventId, mode]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshTrigger]);

  // ── Real-time subscription ─────────────────────────────────────────────

  useEffect(() => {
    const filter =
      mode === 'event' && eventId
        ? `event_id=eq.${eventId}`
        : `tenant_id=eq.${tenantId}`;

    const channel = supabase
      .channel(`queue-strip-${mode}-${eventId || tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter },
        () => {
          // Debounce refetch
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchEntries(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tenantId, eventId, mode, fetchEntries]);

  // ── Auto-collapse when serving ─────────────────────────────────────────

  useEffect(() => {
    if (isServingActive) setExpanded(false);
  }, [isServingActive]);

  // ── Filter for store mode (remove entries with event_id from tenant-wide subscription)
  const visibleEntries =
    mode === 'store' ? entries.filter((e) => !e.event_id) : entries;

  // ── Render nothing if empty ────────────────────────────────────────────

  if (visibleEntries.length === 0) return null;

  // ── Entry classification ───────────────────────────────────────────────

  const servingEntry = visibleEntries.find((e) => e.status === 'serving');
  const waitingEntries = visibleEntries.filter((e) => e.status !== 'serving');

  // ── Actions ────────────────────────────────────────────────────────────

  const handleStartSale = async (entry: QueueEntry) => {
    setOpenMenu(null);
    onStartSale(entry);
  };

  const handleNotify = async (entry: QueueEntry) => {
    if (!entry.phone) {
      toast.error('No phone number on file');
      return;
    }
    if (!entry.sms_consent) {
      toast.info(`${entry.name} didn't opt in to SMS — notify in person`);
      return;
    }
    try {
      const res = await fetch('/api/queue/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: entry.phone,
          name: entry.name,
          smsConsent: entry.sms_consent,
        }),
      });
      if (!res.ok) throw new Error('Failed to notify');
      const data = await res.json();
      if (data.sent) {
        toast.success(`Notified ${entry.name} via SMS`);
      } else {
        toast.info(`${entry.name} — notify in person`);
      }
    } catch {
      toast.error('Failed to send notification');
    }
  };

  const handleNoShow = async (entry: QueueEntry) => {
    setOpenMenu(null);
    await supabase
      .from('queue_entries')
      .update({ status: 'no_show', served_at: new Date().toISOString() })
      .eq('id', entry.id);
    toast.success(`${entry.name} marked as no-show`);
  };

  const handleRemove = async (entry: QueueEntry) => {
    setOpenMenu(null);
    await supabase
      .from('queue_entries')
      .update({ status: 'removed', served_at: new Date().toISOString() })
      .eq('id', entry.id);
    toast.success(`${entry.name} removed`);
  };

  // ── Time helpers ───────────────────────────────────────────────────────

  const waitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  // ── Labels based on mode ───────────────────────────────────────────────

  const stripLabel = mode === 'store' ? 'Checked In' : 'Queue';

  const getCardLabel = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') {
      return mode === 'store' ? 'Serving' : 'Now Serving';
    }
    if (mode === 'store') return 'Ready';
    if (index === 0 && !servingEntry) return 'Now Serving';
    if (index === 0 || (index === 1 && !servingEntry)) return 'Up Next';
    return 'Waiting';
  };

  const getCardStyle = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') {
      return 'border-2 border-[var(--accent-primary)] bg-[var(--surface-raised)] shadow-sm';
    }
    if (mode === 'store') {
      // All "Ready" cards have equal weight
      return 'border border-[var(--border-default)] bg-[var(--surface-raised)]';
    }
    // Event mode hierarchy
    if (index === 0 && !servingEntry) return 'border-2 border-[var(--accent-primary)] bg-[var(--surface-raised)] shadow-sm';
    if (index === 0 || (index === 1 && !servingEntry)) return 'border border-[var(--border-default)] bg-[var(--surface-raised)]';
    return 'border border-[var(--border-subtle)] bg-[var(--surface-raised)] opacity-75';
  };

  const showStartSaleButton = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') return false;
    if (mode === 'store') return true; // Every ready card in store mode
    // Event mode: only "Now Serving" card
    return index === 0 && !servingEntry;
  };

  const showNotifyButton = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') return false;
    if (mode === 'store') return !!entry.phone; // Store mode: notify any waiting entry that has a phone
    // Event mode: "Up Next" card
    if (!servingEntry) return index === 1;
    return index === 0;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="bg-[var(--surface-base)] border-b border-[var(--border-default)]">
      {/* Collapsed bar */}
      <button
        onClick={() => !isServingActive && setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            {stripLabel}
          </span>
          <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-raised)] rounded-full px-2 py-0.5">
            {visibleEntries.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded cards */}
      {expanded && (
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
            {/* Serving entry first */}
            {servingEntry && (
              <QueueCard
                entry={servingEntry}
                label={getCardLabel(servingEntry, -1)}
                cardStyle={getCardStyle(servingEntry, -1)}
                showStartSale={false}
                showNotify={false}
                waitTime={waitTime(servingEntry.created_at)}
                initials={initials(servingEntry.name)}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onStartSale={handleStartSale}
                onNotify={handleNotify}
                onNoShow={handleNoShow}
                onRemove={handleRemove}
                isServingActive={isServingActive}
              />
            )}
            {/* Waiting entries */}
            {waitingEntries.map((entry, i) => (
              <QueueCard
                key={entry.id}
                entry={entry}
                label={getCardLabel(entry, i)}
                cardStyle={getCardStyle(entry, i)}
                showStartSale={showStartSaleButton(entry, i)}
                showNotify={showNotifyButton(entry, i)}
                waitTime={waitTime(entry.created_at)}
                initials={initials(entry.name)}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onStartSale={handleStartSale}
                onNotify={handleNotify}
                onNoShow={handleNoShow}
                onRemove={handleRemove}
                isServingActive={isServingActive}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Queue Card Sub-component ─────────────────────────────────────────────

function QueueCard({
  entry,
  label,
  cardStyle,
  showStartSale,
  showNotify,
  waitTime,
  initials,
  openMenu,
  setOpenMenu,
  onStartSale,
  onNotify,
  onNoShow,
  onRemove,
  isServingActive,
}: {
  entry: QueueEntry;
  label: string;
  cardStyle: string;
  showStartSale: boolean;
  showNotify: boolean;
  waitTime: string;
  initials: string;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  onStartSale: (e: QueueEntry) => void;
  onNotify: (e: QueueEntry) => void;
  onNoShow: (e: QueueEntry) => void;
  onRemove: (e: QueueEntry) => void;
  isServingActive: boolean;
}) {
  const isServing = entry.status === 'serving';

  return (
    <div className={`rounded-xl p-3 min-w-[180px] max-w-[220px] flex-shrink-0 relative ${cardStyle}`}>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${
            isServing ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
          }`}
        >
          {label}
        </span>

        {/* Overflow menu */}
        {!isServingActive && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === entry.id ? null : entry.id);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--surface-raised)] text-[var(--text-tertiary)]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {openMenu === entry.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <div className="absolute right-0 top-8 z-20 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg shadow-lg py-1 min-w-[140px]">
                  {!isServing && (
                    <button
                      onClick={() => onStartSale(entry)}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                    >
                      Start Sale
                    </button>
                  )}
                  <button
                    onClick={() => onNoShow(entry)}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                  >
                    No Show
                  </button>
                  <button
                    onClick={() => onRemove(entry)}
                    className="w-full text-left px-3 py-2 text-sm text-error-600 hover:bg-error-50"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Customer info */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.name}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {waitTime}
            {entry.waiver_id && (
              <span className="ml-1 text-success-600">✓</span>
            )}
            {entry.phone && !entry.sms_consent && (
              <span className="ml-1 text-amber-500" title="No SMS consent">⊘ No SMS</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showStartSale && !isServingActive && (
        <button
          onClick={() => onStartSale(entry)}
          className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all active:scale-[0.97]"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          Start Sale
        </button>
      )}
      {showNotify && !isServingActive && (
        <button
          onClick={() => onNotify(entry)}
          className="w-full py-2 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-all active:scale-[0.97]"
        >
          Notify
        </button>
      )}
    </div>
  );
}