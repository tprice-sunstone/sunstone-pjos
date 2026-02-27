'use client';

import { useRouter } from 'next/navigation';
import type { OutreachData } from '@/types';

export function OutreachCard({ data }: { data: OutreachData }) {
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
      <span
        className="text-text-tertiary uppercase"
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
      >
        Suggested Outreach
      </span>

      {/* Client rows */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.clients.map((client, i) => (
          <div
            key={i}
            className="bg-[var(--surface-base)] flex items-center justify-between"
            style={{ borderRadius: 8, padding: '8px 10px' }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="text-text-primary" style={{ fontSize: 12, fontWeight: 500 }}>
                {client.name}
              </p>
              <p className="text-text-tertiary" style={{ fontSize: 10, marginTop: 1 }}>
                {client.reason}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/clients')}
              className="text-accent-600 border border-[var(--border-default)] hover:bg-accent-50 transition-colors shrink-0"
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
                marginLeft: 8,
              }}
            >
              Reach out
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
