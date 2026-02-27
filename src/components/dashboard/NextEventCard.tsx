'use client';

import { useRouter } from 'next/navigation';
import type { NextEventData } from '@/types';

export function NextEventCard({ data }: { data: NextEventData }) {
  const router = useRouter();
  const dayLabel =
    data.daysUntil === 0 ? 'Today' : data.daysUntil === 1 ? 'Tomorrow' : `In ${data.daysUntil} days`;

  return (
    <div
      className="border border-[var(--border-default)] bg-[var(--surface-raised)]"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 18,
      }}
    >
      {/* Section label */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span
          className="text-text-tertiary uppercase"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
        >
          Next Event
        </span>
        <span
          className="text-accent-600 bg-accent-50"
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 9999,
          }}
        >
          {dayLabel}
        </span>
      </div>

      {/* Event name */}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {data.eventName}
      </p>

      {/* Date + location */}
      <p className="text-text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {data.date}
        {data.location ? ` \u00B7 ${data.location}` : ''}
      </p>

      {/* Booth fee */}
      {data.boothFee > 0 && (
        <p className="text-text-tertiary" style={{ fontSize: 11, marginTop: 6 }}>
          Booth fee: ${data.boothFee.toFixed(2)}
        </p>
      )}

      {/* Action */}
      <button
        onClick={() => router.push('/dashboard/events')}
        className="text-accent-600 hover:text-accent-700 transition-colors"
        style={{ fontSize: 12, fontWeight: 600, marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        View Events &rarr;
      </button>
    </div>
  );
}
