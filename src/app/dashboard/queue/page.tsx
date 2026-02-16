'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button, Badge, Card, CardContent, Select } from '@/components/ui';
import type { QueueEntry, Event, QueueStatus } from '@/types';

const STATUS_BADGE: Record<QueueStatus, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info' }> = {
  waiting: { label: 'Waiting', variant: 'warning' },
  notified: { label: 'Notified', variant: 'info' },
  served: { label: 'Served', variant: 'success' },
  no_show: { label: 'No Show', variant: 'error' },
};

export default function QueuePage() {
  const { tenant } = useTenant();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load active events
  useEffect(() => {
    if (!tenant) return;
    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('start_time');
      const evts = (data || []) as Event[];
      setEvents(evts);
      if (evts.length > 0 && !selectedEvent) setSelectedEvent(evts[0].id);
      setLoading(false);
    };
    load();
  }, [tenant]);

  // Load queue for selected event
  useEffect(() => {
    if (!selectedEvent) return;
    const load = async () => {
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('event_id', selectedEvent)
        .order('position');
      setEntries((data || []) as QueueEntry[]);
    };
    load();

    // Real-time subscription
    const channel = supabase
      .channel(`queue-${selectedEvent}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `event_id=eq.${selectedEvent}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedEvent]);

  const notifyNext = async () => {
    const nextEntry = entries.find((e) => e.status === 'waiting');
    if (!nextEntry) { toast.error('No one waiting'); return; }

    // Update status
    await supabase
      .from('queue_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextEntry.id);

    // Send SMS via API
    if (nextEntry.phone) {
      try {
        await fetch('/api/queue/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: nextEntry.phone,
            name: nextEntry.name,
            tenantName: tenant?.name,
          }),
        });
        toast.success(`Notified ${nextEntry.name}`);
      } catch {
        toast.success(`Status updated (SMS unavailable)`);
      }
    } else {
      toast.success(`${nextEntry.name} marked as notified (no phone)`);
    }
  };

  const updateStatus = async (entryId: string, status: QueueStatus) => {
    const updates: Record<string, any> = { status };
    if (status === 'served') updates.served_at = new Date().toISOString();
    if (status === 'notified') updates.notified_at = new Date().toISOString();

    await supabase.from('queue_entries').update(updates).eq('id', entryId);
  };

  const waiting = entries.filter((e) => e.status === 'waiting');
  const notified = entries.filter((e) => e.status === 'notified');
  const served = entries.filter((e) => e.status === 'served');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Queue</h1>
          <p className="text-text-secondary text-sm mt-1">
            {waiting.length} waiting · {notified.length} notified
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={notifyNext}>
          📣 Notify Next
        </Button>
      </div>

      {/* Event Selector */}
      {events.length > 1 && (
        <div className="max-w-xs">
          <Select
            label="Event"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            options={events.map((ev) => ({ value: ev.id, label: ev.name }))}
          />
        </div>
      )}

      {loading ? (
        <div className="text-text-tertiary py-12 text-center">Loading...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-text-secondary font-medium mb-1">No one in the queue yet</p>
            <p className="text-text-tertiary text-sm">
              Share your waiver link — signing adds people to the queue automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Notified — Ready */}
          {notified.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-accent-600 uppercase tracking-wider mb-3">
                Notified — Ready
              </h2>
              <div className="space-y-2">
                {notified.map((entry) => (
                  <QueueCard key={entry.id} entry={entry} onStatusChange={updateStatus} />
                ))}
              </div>
            </section>
          )}

          {/* Waiting */}
          {waiting.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">
                Waiting ({waiting.length})
              </h2>
              <div className="space-y-2">
                {waiting.map((entry) => (
                  <QueueCard key={entry.id} entry={entry} onStatusChange={updateStatus} />
                ))}
              </div>
            </section>
          )}

          {/* Served */}
          {served.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                Served ({served.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {served.map((entry) => (
                  <QueueCard key={entry.id} entry={entry} onStatusChange={updateStatus} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function QueueCard({ entry, onStatusChange }: {
  entry: QueueEntry;
  onStatusChange: (id: string, status: QueueStatus) => void;
}) {
  const cfg = STATUS_BADGE[entry.status];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center text-lg font-bold text-accent-600 shrink-0">
            {entry.position}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-text-primary">{entry.name}</div>
            <div className="text-xs text-text-tertiary">
              {entry.phone || entry.email || 'No contact'}
              {entry.created_at && <span> · joined {format(new Date(entry.created_at), 'h:mm a')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
          {entry.status === 'waiting' && (
            <Button variant="ghost" size="sm" onClick={() => onStatusChange(entry.id, 'notified')}>
              Notify
            </Button>
          )}
          {entry.status === 'notified' && (
            <>
              <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => onStatusChange(entry.id, 'served')}>
                Served
              </Button>
              <Button variant="ghost" size="sm" className="text-text-tertiary" onClick={() => onStatusChange(entry.id, 'no_show')}>
                No Show
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}