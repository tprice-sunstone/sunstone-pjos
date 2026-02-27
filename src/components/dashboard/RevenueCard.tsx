'use client';

import { useRouter } from 'next/navigation';
import type { RevenueData } from '@/types';

const money = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function RevenueCard({ data }: { data: RevenueData }) {
  const router = useRouter();

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
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span
          className="text-text-tertiary uppercase"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
        >
          This Month
        </span>
        {data.pctChange !== null && (
          <span
            className={data.pctChange >= 0 ? 'text-success-600 bg-success-50' : 'text-error-600 bg-error-50'}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 9999,
            }}
          >
            {data.pctChange >= 0 ? '+' : ''}{data.pctChange}% vs last month
          </span>
        )}
      </div>

      {/* Revenue number */}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {money(data.monthRevenue)}
      </p>

      {/* Subtitle */}
      <p className="text-text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {data.salesCount} piece{data.salesCount !== 1 ? 's' : ''} &middot; {data.eventsCount} event{data.eventsCount !== 1 ? 's' : ''}
      </p>

      {/* Mini bar chart */}
      <div
        className="flex items-end gap-px"
        style={{ height: 28, marginTop: 14 }}
      >
        {data.dailyBars.map((bar, i) => {
          const isRecent = i >= 6; // last 6 bars = current period
          const isMax = bar === 1;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(bar * 100, 4)}%`,
                backgroundColor: isMax
                  ? 'var(--accent-500)'
                  : isRecent
                    ? 'var(--accent-200)'
                    : 'var(--accent-100)',
                opacity: isRecent ? 1 : 0.5,
                minHeight: 2,
              }}
            />
          );
        })}
      </div>

      {/* Action */}
      <button
        onClick={() => router.push('/dashboard/reports')}
        className="text-accent-600 hover:text-accent-700 transition-colors"
        style={{ fontSize: 12, fontWeight: 600, marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        View Reports &rarr;
      </button>
    </div>
  );
}
