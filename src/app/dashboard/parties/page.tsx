// ============================================================================
// Dashboard Parties Page — /dashboard/parties
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Input, Textarea, Badge } from '@/components/ui';
import { toast } from 'sonner';
import type { PartyRequest, PartyRsvp, PartyRequestStatus } from '@/types';

const STATUS_CONFIG: Record<PartyRequestStatus, { label: string; color: string }> = {
  new:        { label: 'New',       color: 'bg-blue-100 text-blue-700' },
  contacted:  { label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  confirmed:  { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  completed:  { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'past', label: 'Past' },
] as const;

type FilterKey = typeof FILTER_TABS[number]['key'];

export default function PartiesPage() {
  const { tenant } = useTenant();
  const [requests, setRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<PartyRsvp[]>([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/party-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Load RSVPs when selecting a party
  useEffect(() => {
    if (!selectedId) return;
    setRsvpsLoading(true);
    fetch(`/api/party-rsvps?partyRequestId=${selectedId}`)
      .then((r) => r.ok ? r.json() : { rsvps: [] })
      .then((d) => setRsvps(d.rsvps || []))
      .catch(() => setRsvps([]))
      .finally(() => setRsvpsLoading(false));
  }, [selectedId]);

  // Sync notes when selecting a party
  useEffect(() => {
    if (selectedId) {
      const req = requests.find((r) => r.id === selectedId);
      setNotes(req?.notes || '');
    }
  }, [selectedId, requests]);

  const handleStatusChange = async (id: string, newStatus: PartyRequestStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/party-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
        toast.success('Status updated');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedId) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/party-requests/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => r.id === selectedId ? { ...r, notes } : r));
        toast.success('Notes saved');
      }
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const copyRsvpLink = (id: string) => {
    const url = `${window.location.origin}/studio/${tenant?.slug}/party/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('RSVP link copied!');
  };

  // Filter logic
  const filtered = requests.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'new') return r.status === 'new';
    if (filter === 'confirmed') return r.status === 'confirmed';
    if (filter === 'past') return r.status === 'completed' || r.status === 'cancelled';
    return true;
  });

  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Party Requests
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--surface-subtle)] rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setSelectedId(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === tab.key
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.key === 'new' && requests.filter((r) => r.status === 'new').length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                {requests.filter((r) => r.status === 'new').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface-subtle)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">No party requests yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            When someone books a party through your profile, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-2">
            {filtered.map((req) => {
              const sc = STATUS_CONFIG[req.status];
              const dateStr = req.preferred_date
                ? new Date(req.preferred_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;
              const isSelected = selectedId === req.id;

              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedId(isSelected ? null : req.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-50)]'
                      : 'border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{req.host_name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {dateStr || 'No date set'}
                        {req.estimated_guests && ` · ${req.estimated_guests} guests`}
                        {req.occasion && ` · ${req.occasion}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                  {req.rsvp_count !== undefined && req.rsvp_count > 0 && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                      {req.attending_count} attending · {req.rsvp_count} RSVPs
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5 space-y-4 lg:sticky lg:top-4 self-start">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selected.host_name}</h2>
                <button onClick={() => setSelectedId(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--text-tertiary)]">Phone</span>
                  <p className="text-[var(--text-primary)]">{selected.host_phone}</p>
                </div>
                {selected.host_email && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Email</span>
                    <p className="text-[var(--text-primary)]">{selected.host_email}</p>
                  </div>
                )}
                {selected.preferred_date && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Date</span>
                    <p className="text-[var(--text-primary)]">
                      {new Date(selected.preferred_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
                {selected.preferred_time && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Time</span>
                    <p className="text-[var(--text-primary)]">{selected.preferred_time}</p>
                  </div>
                )}
                {selected.location && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Location</span>
                    <p className="text-[var(--text-primary)]">{selected.location}</p>
                  </div>
                )}
                {selected.estimated_guests && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Guests</span>
                    <p className="text-[var(--text-primary)]">{selected.estimated_guests}</p>
                  </div>
                )}
                {selected.occasion && (
                  <div>
                    <span className="text-[var(--text-tertiary)]">Occasion</span>
                    <p className="text-[var(--text-primary)]">{selected.occasion}</p>
                  </div>
                )}
              </div>

              {selected.message && (
                <div>
                  <span className="text-xs text-[var(--text-tertiary)]">Message</span>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selected.message}</p>
                </div>
              )}

              {/* Status dropdown */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--surface-base)] text-[var(--text-primary)]"
                  value={selected.status}
                  onChange={(e) => handleStatusChange(selected.id, e.target.value as PartyRequestStatus)}
                  disabled={updatingStatus}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Notes</label>
                <Textarea
                  rows={3}
                  placeholder="Add internal notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={handleSaveNotes}
                  loading={savingNotes}
                >
                  Save Notes
                </Button>
              </div>

              {/* RSVP Link */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">RSVP Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border border-[var(--border-default)] rounded-lg bg-[var(--surface-base)] text-[var(--text-secondary)] truncate"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/studio/${tenant?.slug}/party/${selected.id}`}
                  />
                  <Button variant="secondary" size="sm" onClick={() => copyRsvpLink(selected.id)}>
                    Copy
                  </Button>
                </div>
              </div>

              {/* RSVPs */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  RSVPs ({rsvps.length})
                </h3>
                {rsvpsLoading ? (
                  <p className="text-xs text-[var(--text-tertiary)]">Loading...</p>
                ) : rsvps.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)]">No RSVPs yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {rsvps.map((rv) => (
                      <div
                        key={rv.id}
                        className="flex items-center justify-between px-3 py-2 text-xs rounded-lg bg-[var(--surface-subtle)]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${rv.attending ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="text-[var(--text-primary)] font-medium">{rv.name}</span>
                          {rv.plus_ones > 0 && (
                            <span className="text-[var(--text-tertiary)]">+{rv.plus_ones}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {rv.waiver_signed && (
                            <span className="text-green-600 text-[10px]">Waiver ✓</span>
                          )}
                          <span className="text-[var(--text-tertiary)]">
                            {rv.attending ? 'Attending' : 'Declined'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Event shortcut */}
              <a
                href={`/dashboard/events?prefill_name=${encodeURIComponent(selected.host_name + "'s Party")}&prefill_date=${selected.preferred_date || ''}`}
                className="block text-center text-sm text-[var(--accent-primary)] hover:underline"
              >
                Create Event from this Party →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
