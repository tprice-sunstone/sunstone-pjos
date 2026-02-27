'use client';

import { useRouter } from 'next/navigation';
import type { MessagesData } from '@/types';

export function MessagesCard({ data }: { data: MessagesData }) {
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
        Messages
      </span>

      {/* Message rows */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {/* Avatar */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-on-accent)',
                background: msg.isSystem
                  ? 'linear-gradient(135deg, var(--accent-500), var(--accent-400))'
                  : 'var(--accent-200)',
              }}
            >
              {msg.initials}
            </div>

            {/* Content */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="flex items-center justify-between">
                <span className="text-text-primary" style={{ fontSize: 11, fontWeight: 600 }}>
                  {msg.sender}
                </span>
                <span className="text-text-tertiary" style={{ fontSize: 9 }}>
                  {msg.time}
                </span>
              </div>
              <p
                className="text-text-secondary truncate"
                style={{ fontSize: 11, marginTop: 1 }}
              >
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      <button
        onClick={() => router.push('/dashboard/broadcasts')}
        className="text-accent-600 hover:text-accent-700 transition-colors"
        style={{ fontSize: 12, fontWeight: 600, marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        View All &rarr;
      </button>
    </div>
  );
}
