'use client';

import { useRouter } from 'next/navigation';
import type { SunstoneProductData } from '@/types';

export function SunstoneProductCard({ data }: { data: SunstoneProductData }) {
  const router = useRouter();
  if (!data) return null;

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
        Tip
      </span>

      {/* Title */}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.3,
          marginTop: 8,
        }}
      >
        {data.title}
      </p>

      {/* Body */}
      <p className="text-text-secondary" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
        {data.body}
      </p>

      {/* Action */}
      <button
        onClick={() => router.push(data.actionRoute)}
        className="text-accent-600 hover:text-accent-700 transition-colors"
        style={{ fontSize: 12, fontWeight: 600, marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        {data.actionLabel} &rarr;
      </button>
    </div>
  );
}
