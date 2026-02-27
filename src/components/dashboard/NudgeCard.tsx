'use client';

import { useRouter } from 'next/navigation';
import type { NudgeData } from '@/types';

export function NudgeCard({ data }: { data: NudgeData }) {
  const router = useRouter();
  if (!data) return null;

  return (
    <div
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 18,
        background: 'linear-gradient(135deg, var(--accent-50), var(--surface-raised))',
      }}
    >
      {/* Title in heading font */}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {data.title}
      </p>

      {/* Body */}
      <p className="text-text-secondary" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
        {data.body}
      </p>

      {/* Buttons */}
      <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
        <button
          onClick={() => router.push(data.primaryRoute)}
          className="bg-accent-500 text-[var(--text-on-accent)] hover:bg-accent-600 transition-colors"
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {data.primaryLabel}
        </button>
        {data.secondaryLabel && data.secondaryRoute && (
          <button
            onClick={() => router.push(data.secondaryRoute!)}
            className="text-accent-600 border border-[var(--border-default)] hover:bg-accent-50 transition-colors"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: 8,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {data.secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
