// ============================================================================
// JumpRingStep — Post-Sale Jump Ring Confirmation (Event Mode Only)
// src/components/pos/checkout/JumpRingStep.tsx
// ============================================================================
// Shows after sale completes successfully in Event Mode.
// Artist can adjust jump ring counts per material before deducting inventory.
// ============================================================================

'use client';

import { useState } from 'react';
import type { JumpRingResolution } from '@/types';

const PAYMENT_LABELS: Record<string, string> = {
  card_present: 'Tap to Pay',
  card_not_present: 'Card Reader',
  cash: 'Cash',
  venmo: 'Venmo',
};

const QUICK_PRESETS = [1, 2, 3, 4, 6];

interface JumpRingStepProps {
  saleTotal: number;
  paymentMethod: string;
  resolutions: JumpRingResolution[];
  onConfirm: (adjusted: JumpRingResolution[]) => void;
  onSkip: () => void;
}

export function JumpRingStep({
  saleTotal,
  paymentMethod,
  resolutions,
  onConfirm,
  onSkip,
}: JumpRingStepProps) {
  const [adjusted, setAdjusted] = useState<JumpRingResolution[]>(
    () => resolutions.map((r) => ({ ...r }))
  );

  const updateCount = (index: number, newCount: number) => {
    const clamped = Math.max(0, Math.min(20, newCount));
    setAdjusted((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, jump_rings_needed: clamped } : r
      )
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Success header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-2">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            Sale Complete!
          </h2>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            ${saleTotal.toFixed(2)}
          </p>
          <p className="text-sm text-[var(--text-tertiary)]">
            {PAYMENT_LABELS[paymentMethod] || paymentMethod}
          </p>
        </div>

        {/* Jump Rings Used section */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            Jump Rings Used
          </p>

          {adjusted.map((r, i) => (
            <div
              key={r.cart_item_id}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 space-y-3"
            >
              {/* Material name */}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {r.material_name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {r.cart_item_name}
                  </p>
                </div>
              </div>

              {/* +/- stepper */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateCount(i, r.jump_rings_needed - 1)}
                  disabled={r.jump_rings_needed <= 0}
                  className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  </svg>
                </button>
                <span className="text-2xl font-bold text-[var(--text-primary)] w-12 text-center tabular-nums">
                  {r.jump_rings_needed}
                </span>
                <button
                  onClick={() => updateCount(i, r.jump_rings_needed + 1)}
                  disabled={r.jump_rings_needed >= 20}
                  className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>

              {/* Quick presets */}
              <div className="flex items-center justify-center gap-2">
                {QUICK_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => updateCount(i, n)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                      r.jump_rings_needed === n
                        ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                        : 'bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(adjusted)}
          className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          Confirm
        </button>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors py-2"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
