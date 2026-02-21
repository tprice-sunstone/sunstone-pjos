// ============================================================================
// MiniQueueStrip — src/components/MiniQueueStrip.tsx
// ============================================================================
// Collapsible horizontal queue strip for Event Mode POS.
// Shows waiting/notified/serving queue entries with real-time updates.
// ============================================================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface QueueEntry {
  id: string;
  tenant_id: string;
  event_id: string | null;
  client_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  position: number;
  status: 'waiting' | 'notified' | 'serving' | 'served';
  notified_at: string | null;
  served_at: string | null;
  waiver_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MiniQueueStripProps {
  tenantId: string;
  eventId?: string;
  mode: 'event' | 'store';
  onStartSale: (queueEntry: QueueEntry) => void;
  isServingActive?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getWaitTime(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// ============================================================================
// Component
// ============================================================================

export default function MiniQueueStrip({
  tenantId,
  eventId,
  mode,
  onStartSale,
  isServingActive = false,
}: MiniQueueStripProps) {
  const { tenant } = useTenant();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [overflowMenuId, setOverflowMenuId] = useState<string | null>(null);
  const [, setTick] = useState(0); // For re-rendering wait times
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Auto-collapse when a sale starts
  useEffect(() => {
    if (isServingActive) setExpanded(false);
  }, [isServingActive]);

  // Tick every 30s to update wait times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowMenuId) return;
    const handler = () => setOverflowMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [overflowMenuId]);

  // ── Fetch queue entries ──
  const fetchEntries = useCallback(async () => {
    if (!tenantId) return;
    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['waiting', 'notified', 'serving'])
      .order('position', { ascending: true });

    if (eventId) query = query.eq('event_id', eventId);

    const { data } = await query;
    setEntries((data || []) as QueueEntry[]);
    setLoading(false);
  }, [tenantId, eventId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Real-time subscription (debounced) ──
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`queue-strip-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Debounce re-fetches by 500ms
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchEntries();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchEntries]);

  // ── "Now Serving" / "Up Next" logic ──
  const servingEntry = entries.find((e) => e.status === 'serving');
  const waitingEntries = entries.filter((e) => e.status !== 'serving');

  let nowServing: QueueEntry | null = servingEntry || waitingEntries[0] || null;
  let upNext: QueueEntry | null = servingEntry
    ? waitingEntries[0] || null
    : waitingEntries[1] || null;
  const remaining = entries.filter(
    (e) => e.id !== nowServing?.id && e.id !== upNext?.id
  );

  function getRole(entry: QueueEntry): 'now-serving' | 'up-next' | 'waiting' {
    if (entry.id === nowServing?.id) return 'now-serving';
    if (entry.id === upNext?.id) return 'up-next';
    return 'waiting';
  }

  // ── Actions ──
  const handleStartSale = async (entry: QueueEntry) => {
    setOverflowMenuId(null);
    try {
      await supabase
        .from('queue_entries')
        .update({ status: 'serving' })
        .eq('id', entry.id);
      onStartSale(entry);
    } catch {
      toast.error('Failed to start sale');
    }
  };

  const handleNotify = async (entry: QueueEntry) => {
    if (!entry.phone || !tenant) {
      toast.error('No phone number for this customer');
      return;
    }
    try {
      const res = await fetch('/api/queue/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueEntryId: entry.id,
          phone: entry.phone,
          tenantName: tenant.name,
        }),
      });
      const data = await res.json();
      if (data.success || data.sent) {
        toast.success(`Notified ${entry.name}`);
      } else {
        toast.error(data.error || 'Failed to notify');
      }
    } catch {
      toast.error('Failed to send notification');
    }
  };

  const handleNoShow = async (entry: QueueEntry) => {
    setOverflowMenuId(null);
    try {
      // TODO: change to 'no_show' after Task C migration
      await supabase
        .from('queue_entries')
        .update({ status: 'served' })
        .eq('id', entry.id);
      toast.success(`${entry.name} marked as no-show`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleRemove = async (entry: QueueEntry) => {
    setOverflowMenuId(null);
    try {
      // TODO: change to 'removed' after Task C migration
      await supabase
        .from('queue_entries')
        .update({ status: 'served' })
        .eq('id', entry.id);
      toast.success(`${entry.name} removed from queue`);
    } catch {
      toast.error('Failed to remove');
    }
  };

  // ── Render nothing if empty or loading ──
  if (loading || entries.length === 0) return null;

  // ── Collapsed state ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2.5 px-4 bg-white border-b border-[var(--border-default)] transition-colors hover:bg-[var(--surface-raised)]"
        style={{ height: '40px' }}
      >
        {/* Pulsing green dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Queue
        </span>
        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
          {entries.length}
        </span>
        <svg
          className="w-3.5 h-3.5 text-[var(--text-tertiary)] ml-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    );
  }

  // ── Expanded state ──
  const allCards = [nowServing, upNext, ...remaining].filter(Boolean) as QueueEntry[];

  return (
    <div className="bg-white border-b border-[var(--border-default)]">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[var(--surface-raised)]"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Queue</span>
        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
          {entries.length}
        </span>
        <svg
          className="w-3.5 h-3.5 text-[var(--text-tertiary)] ml-auto transition-transform rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Horizontal scrolling cards */}
      <div className="flex gap-3 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {allCards.map((entry) => {
          const role = getRole(entry);
          const isNowServing = role === 'now-serving';
          const isUpNext = role === 'up-next';

          return (
            <div
              key={entry.id}
              className="relative shrink-0"
              style={{ width: '200px' }}
            >
              <div
                className={`rounded-xl border p-3 h-full transition-shadow ${
                  isNowServing
                    ? 'border-l-2 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]'
                    : 'border-[var(--border-default)]'
                } ${role === 'waiting' ? 'opacity-70' : ''}`}
                style={
                  isNowServing
                    ? { borderLeftColor: 'var(--accent-primary)', borderLeftWidth: '2px' }
                    : undefined
                }
              >
                {/* Top row: avatar + name + overflow */}
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{
                      backgroundColor: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {getInitials(entry.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${
                        isNowServing
                          ? 'font-bold text-[var(--text-primary)]'
                          : 'font-medium text-[var(--text-secondary)]'
                      }`}
                    >
                      {entry.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Waiver check */}
                      {entry.waiver_id && (
                        <svg
                          className="w-3.5 h-3.5 text-green-500 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {getWaitTime(entry.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Overflow menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverflowMenuId(overflowMenuId === entry.id ? null : entry.id);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>

                  {/* Overflow dropdown */}
                  {overflowMenuId === entry.id && (
                    <div
                      className="absolute right-2 top-10 z-50 bg-white border border-[var(--border-default)] rounded-xl shadow-lg py-1 min-w-[140px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleStartSale(entry)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
                      >
                        Start Sale
                      </button>
                      <button
                        onClick={() => handleNoShow(entry)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                      >
                        No Show
                      </button>
                      <button
                        onClick={() => handleRemove(entry)}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="mb-2">
                  {isNowServing && (
                    <span
                      className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      Now Serving
                    </span>
                  )}
                  {isUpNext && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Up Next
                    </span>
                  )}
                  {role === 'waiting' && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-tertiary)]">
                      Waiting
                    </span>
                  )}
                </div>

                {/* Action button */}
                {isNowServing && !isServingActive && (
                  <button
                    onClick={() => handleStartSale(entry)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.97]"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    Start Sale
                  </button>
                )}
                {isUpNext && (
                  <button
                    onClick={() => handleNotify(entry)}
                    className="w-full py-2 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-all active:scale-[0.97]"
                  >
                    Notify
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { QueueEntry };