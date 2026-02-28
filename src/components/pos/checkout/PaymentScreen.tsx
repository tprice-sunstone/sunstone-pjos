// ============================================================================
// PaymentScreen — Artist-Facing Payment Method Selection
// src/components/pos/checkout/PaymentScreen.tsx
// ============================================================================
// Grid of payment method buttons + "Complete Sale" CTA.
// Shared by Store Mode and Event Mode POS.
// ============================================================================

'use client';

import type { PaymentMethod } from '@/types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'card_present', label: 'Card', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
  { value: 'cash', label: 'Cash', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
  { value: 'venmo', label: 'Venmo', icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
  { value: 'other', label: 'Other', icon: 'M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z' },
];

interface PaymentScreenProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  processing: boolean;
  total: number;
}

export function PaymentScreen({
  selectedMethod,
  onSelectMethod,
  onCompleteSale,
  processing,
  total,
}: PaymentScreenProps) {
  return (
    <div className="max-w-sm mx-auto py-8 space-y-6">
      <h2 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight text-center font-[var(--font-heading)]">
        Select Payment
      </h2>

      {/* Payment method grid */}
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
  );
}
