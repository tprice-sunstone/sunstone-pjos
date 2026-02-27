'use client';

import type { PJUniversityData } from '@/types';

export function PJUniversityCard({ data }: { data: PJUniversityData }) {
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
        Learn
      </span>

      {/* Graduation cap icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <div
          className="bg-accent-50 text-accent-600"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
          </svg>
        </div>
        <p
          className="text-text-primary"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {data.title}
        </p>
      </div>

      {/* Subtitle */}
      <p className="text-text-secondary" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
        {data.subtitle}
      </p>

      {/* CTA */}
      <a
        href={data.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-600 hover:text-accent-700 transition-colors"
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 600,
          marginTop: 12,
          textDecoration: 'none',
        }}
      >
        {data.ctaLabel} &rarr;
      </a>
    </div>
  );
}
