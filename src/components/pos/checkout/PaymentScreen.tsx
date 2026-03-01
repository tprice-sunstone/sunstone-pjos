// ============================================================================
// PaymentScreen — Artist-Facing Payment Method Selection + Order Summary
// src/components/pos/checkout/PaymentScreen.tsx
// ============================================================================
// Responsive split layout: order summary left, payment grid right.
// Renamed methods: Tap to Pay, Card Reader, Cash, Venmo. No "Other".
// ============================================================================

'use client';

import type { PaymentMethod } from '@/types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  {
    value: 'card_present',
    label: 'Tap to Pay',
    // Contactless / NFC icon
    icon: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z',
  },
  {
    value: 'card_not_present',
    label: 'Card Reader',
    // Card swipe icon
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
  },
  {
    value: 'cash',
    label: 'Cash',
    // Bills icon
    icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  },
  {
    value: 'venmo',
    label: 'Venmo',
    // Phone icon
    icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
];

interface PaymentScreenProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  processing: boolean;
  total: number;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  activeQueueEntry?: { name: string } | null;
  cardProcessor?: string | null;
}

export function PaymentScreen({
  selectedMethod,
  onSelectMethod,
  onCompleteSale,
  processing,
  total,
  items,
  subtotal,
  taxAmount,
  tipAmount,
  activeQueueEntry,
  cardProcessor,
}: PaymentScreenProps) {
  return (
    <div className="flex items-start justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-3xl">
        <h2 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight text-center font-[var(--font-heading)] mb-6">
          Complete Payment
        </h2>

        {/* Responsive split layout */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column — Order Summary */}
          <div className="md:w-1/2 space-y-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-5 space-y-3 shadow-[var(--shadow-card)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                Order Summary
              </p>

              {/* Line items */}
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[var(--text-primary)] font-medium">
                      {item.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      ${item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1">
                <div className="flex justify-between text-sm text-[var(--text-tertiary)]">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-[var(--text-tertiary)]">
                    <span>Tax</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm text-[var(--text-tertiary)]">
                    <span>Tip</span>
                    <span>${tipAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Grand total */}
              <div className="border-t-2 border-[var(--text-primary)] pt-3 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Total
                </span>
                <span className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Queue customer badge */}
            {activeQueueEntry && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {activeQueueEntry.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {activeQueueEntry.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Receipt info ready
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — Payment Methods */}
          <div className="md:w-1/2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => onSelectMethod(pm.value)}
                  className={`py-7 rounded-2xl text-center transition-all min-h-[80px] flex flex-col items-center justify-center gap-2 ${
                    selectedMethod === pm.value
                      ? 'bg-[var(--text-primary)] text-[var(--surface-base)] shadow-md'
                      : 'bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
                  }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={pm.icon} />
                  </svg>
                  <div className="text-lg font-bold">{pm.label}</div>
                </button>
              ))}
            </div>

            {/* Processor label for card payments */}
            {cardProcessor && (selectedMethod === 'card_present' || selectedMethod === 'card_not_present') && (
              <p className="text-[11px] text-center text-[var(--text-tertiary)]">
                Processing via {cardProcessor === 'square' ? 'Square' : 'Stripe'}
              </p>
            )}

            {/* Complete Sale CTA */}
            {selectedMethod && (
              <button
                onClick={onCompleteSale}
                disabled={processing}
                className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                {processing ? 'Processing...' : `Complete Sale — $${total.toFixed(2)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
