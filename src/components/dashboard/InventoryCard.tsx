'use client';

import { useRouter } from 'next/navigation';
import type { InventoryAlertData } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  critical: 'var(--error-500)',
  low: 'var(--warning-500)',
  ok: 'var(--success-500)',
};

export function InventoryCard({ data }: { data: InventoryAlertData }) {
  const router = useRouter();
  if (!data || !Array.isArray(data.items)) return null;

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
      <span
        className="text-text-tertiary uppercase"
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
      >
        Inventory
      </span>

      {/* Progress bars */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.items.map((item, i) => {
          const pct = item.threshold > 0
            ? Math.min((item.stock / item.threshold) * 100, 100)
            : 0;

          return (
            <div key={i}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span className="text-text-primary" style={{ fontSize: 12, fontWeight: 500 }}>
                  {item.name}
                </span>
                <span className="text-text-tertiary" style={{ fontSize: 11 }}>
                  {item.stock} / {item.threshold}
                </span>
              </div>
              {/* Track */}
              <div
                className="bg-[var(--surface-base)]"
                style={{ height: 3, borderRadius: 2, overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: STATUS_COLORS[item.status] || STATUS_COLORS.low,
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <button
        onClick={() => router.push('/dashboard/inventory')}
        className="text-accent-600 border border-[var(--border-default)] hover:bg-accent-50 transition-colors"
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 8,
          marginTop: 14,
          background: 'transparent',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          textAlign: 'center',
        }}
      >
        Manage Inventory
      </button>
    </div>
  );
}
