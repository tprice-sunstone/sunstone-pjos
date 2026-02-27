'use client';

import { useRouter } from 'next/navigation';
import type { GettingStartedData } from '@/types';

export function GettingStartedCard({ data }: { data: GettingStartedData }) {
  const router = useRouter();
  if (!data || !Array.isArray(data.steps)) return null;

  const { steps, completedCount, totalCount } = data;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const encouragement =
    completedCount === 0
      ? "Let's get started!"
      : completedCount >= totalCount
        ? "All done \u2014 you're ready to go!"
        : completedCount >= totalCount - 1
          ? 'Almost there!'
          : "You're making great progress!";

  return (
    <div
      className="col-span-full border border-[var(--border-default)]"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 18,
        background: 'linear-gradient(135deg, var(--accent-50), var(--surface-raised))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span
          className="text-text-tertiary uppercase"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
        >
          Getting Started
        </span>
        <span
          className="text-accent-600"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {completedCount} of {totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="bg-[var(--surface-raised)]"
        style={{ height: 4, borderRadius: 9999, overflow: 'hidden', marginBottom: 14 }}
      >
        <div
          className="bg-accent-500"
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 9999,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Encouragement */}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.3,
          marginBottom: 10,
        }}
      >
        {encouragement}
      </p>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((step) => (
          <button
            key={step.href + step.label}
            onClick={() => !step.done && router.push(step.href)}
            disabled={step.done}
            className={step.done ? '' : 'hover:bg-accent-50'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: step.done ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            {/* Check circle */}
            <div
              className={step.done ? 'bg-accent-500' : 'border border-[var(--border-strong)]'}
              style={{
                width: 20,
                height: 20,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {step.done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-accent)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>

            {/* Label */}
            <span
              className={step.done ? 'text-text-tertiary' : 'text-text-primary'}
              style={{
                fontSize: 13,
                fontWeight: 500,
                textDecoration: step.done ? 'line-through' : 'none',
              }}
            >
              {step.label}
            </span>

            {/* Arrow for incomplete */}
            {!step.done && (
              <svg
                className="text-text-tertiary"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
