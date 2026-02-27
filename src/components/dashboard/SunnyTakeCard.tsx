'use client';

import type { SunnyTakeData } from '@/types';

export function SunnyTakeCard({ data }: { data: SunnyTakeData }) {
  if (!data?.insight) return null;

  // Compute relative time label
  const timeLabel = (() => {
    if (!data.generatedAt) return '';
    const genDate = new Date(data.generatedAt);
    const hoursAgo = Math.floor((Date.now() - genDate.getTime()) / (1000 * 60 * 60));
    if (hoursAgo < 1) return 'Updated just now';
    if (hoursAgo < 24) return `Updated ${hoursAgo}h ago`;
    return 'Updated today';
  })();

  return (
    <div
      className="border border-[var(--border-default)]"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 18,
        background: 'var(--surface-raised)',
        borderLeft: '3px solid var(--accent-400)',
      }}
    >
      {/* Section label with sparkle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg
          className="text-accent-500"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0l3.09 6.26L22 7.27l-5 4.87L18.18 19 12 15.77 5.82 19 7 12.14l-5-4.87 6.91-1.01L12 0z" />
        </svg>
        <span
          className="text-accent-600 uppercase"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
        >
          {"Sunny's Take"}
        </span>
      </div>

      {/* Insight text */}
      <p
        className="text-text-primary"
        style={{
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.6,
          marginTop: 10,
        }}
      >
        {data.insight}
      </p>

      {/* Timestamp */}
      {timeLabel && (
        <p
          className="text-text-tertiary"
          style={{ fontSize: 10, marginTop: 10 }}
        >
          {timeLabel}
        </p>
      )}
    </div>
  );
}
