'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { QueueEntry } from '@/components/MiniQueueStrip';

interface QueueBadgeProps {
  tenantId: string;
  eventId?: string;
  mode: 'event' | 'store';
  onStartSale: (entry: QueueEntry) => void;
  isServingActive?: boolean;
  refreshTrigger?: number;
}

export function QueueBadge({
  tenantId,
  eventId,
  mode,
  onStartSale,
  isServingActive = false,
  refreshTrigger = 0,
}: QueueBadgeProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

  // ── Fetch entries ──

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

  useEffect(() => { fetchEntries(); }, [fetchEntries, refreshTrigger]);

  // ── Real-time subscription ──

  useEffect(() => {
    const filter =
      mode === 'event' && eventId
        ? `event_id=eq.${eventId}`
        : `tenant_id=eq.${tenantId}`;

    const channel = supabase
      .channel(`queue-badge-${mode}-${eventId || tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter },
        () => {
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

  // ── Auto-close when serving ──

  useEffect(() => {
    if (isServingActive) setOpen(false);
  }, [isServingActive]);

  // ── Click outside to close ──

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Filter for store mode ──

  const visibleEntries =
    mode === 'store' ? entries.filter((e) => !e.event_id) : entries;

  // ── If empty, render nothing (or minimal) ──

  if (visibleEntries.length === 0) return null;

  const servingEntry = visibleEntries.find((e) => e.status === 'serving');
  const waitingEntries = visibleEntries.filter((e) => e.status !== 'serving');
  const waitingCount = waitingEntries.length;

  // ── Time helper ──

  const waitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Actions ──

  const handleStartSale = (entry: QueueEntry) => {
    setOpenMenu(null);
    setOpen(false);
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
        body: JSON.stringify({ phone: entry.phone, name: entry.name, smsConsent: entry.sms_consent }),
      });
      if (!res.ok) throw new Error('Failed to notify');
      const data = await res.json();
      if (data.sent) toast.success(`Notified ${entry.name} via SMS`);
      else toast.info(`${entry.name} — notify in person`);
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

  // ── Badge label ──

  const badgeLabel = mode === 'store'
    ? `${waitingCount} Checked In`
    : `${waitingCount} in Queue`;

  // ── Determine which entries can start sale / be notified ──

  const canStartSale = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') return false;
    if (mode === 'store') return true;
    return index === 0 && !servingEntry;
  };

  const canNotify = (entry: QueueEntry, index: number) => {
    if (entry.status === 'serving') return false;
    if (mode === 'store') return !!entry.phone;
    if (!servingEntry) return index === 1;
    return index === 0;
  };

  // ── Sorted list: serving first, then waiting ──

  const sortedEntries: QueueEntry[] = [];
  if (servingEntry) sortedEntries.push(servingEntry);
  sortedEntries.push(...waitingEntries);

  return (
    <div className="relative">
      {/* Badge */}
      <button
        ref={badgeRef}
        onClick={() => { setOpen(!open); setOpenMenu(null); }}
        className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] transition-all min-h-[44px] cursor-pointer"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {badgeLabel}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => { setOpen(false); setOpenMenu(null); }}
        />
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-32px)] bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] overflow-hidden animate-[fadeSlideDown_200ms_ease-out]"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              {mode === 'store' ? 'Checked In' : 'Queue'}
            </span>
            <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--surface-subtle)] rounded-full px-2 py-0.5">
              {visibleEntries.length}
            </span>
          </div>

          {/* Scrollable entries */}
          <div className="max-h-[320px] overflow-y-auto">
            {sortedEntries.map((entry, idx) => {
              const isServing = entry.status === 'serving';
              const waitingIdx = isServing ? -1 : waitingEntries.indexOf(entry);

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[48px] transition-colors ${
                    isServing
                      ? 'bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
                      : 'hover:bg-[var(--surface-subtle)]'
                  } ${idx < sortedEntries.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {initials(entry.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                        {entry.name}
                      </span>
                      {isServing && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                          Serving
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                      <span>{waitTime(entry.created_at)}</span>
                      {entry.waiver_id && <span className="text-emerald-500">&#10003;</span>}
                      {entry.phone && entry.sms_consent && (
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                      )}
                      {entry.phone && !entry.sms_consent && (
                        <span className="text-amber-500 text-[10px]">No SMS</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Notify icon button */}
                    {canNotify(entry, waitingIdx) && !isServingActive && (
                      <button
                        onClick={() => handleNotify(entry)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
                        title="Notify via SMS"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                      </button>
                    )}

                    {/* Start Sale button */}
                    {canStartSale(entry, waitingIdx) && !isServingActive && (
                      <button
                        onClick={() => handleStartSale(entry)}
                        className="h-8 px-3 rounded-lg text-[12px] font-semibold text-white transition-all active:scale-[0.97] min-h-[32px]"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        Start Sale
                      </button>
                    )}

                    {/* Overflow menu */}
                    {!isServingActive && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === entry.id ? null : entry.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {openMenu === entry.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-8 z-20 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-lg shadow-lg py-1 min-w-[120px]">
                              {!isServing && (
                                <button
                                  onClick={() => handleStartSale(entry)}
                                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                                >
                                  Start Sale
                                </button>
                              )}
                              <button
                                onClick={() => handleNoShow(entry)}
                                className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                              >
                                No Show
                              </button>
                              <button
                                onClick={() => handleRemove(entry)}
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
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
