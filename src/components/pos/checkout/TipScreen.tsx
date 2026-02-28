// ============================================================================
// TipScreen — Customer-Facing Tip Selection
// src/components/pos/checkout/TipScreen.tsx
// ============================================================================
// Clean, branded tip screen. Designed to be handed to the customer.
// Large touch targets, no POS clutter visible. Theme-safe tokens only.
// ============================================================================

'use client';

const TIP_PRESETS = [0, 3, 5, 10, 15, 20];

interface TipScreenProps {
  subtotalWithTax: number;
  tipAmount: number;
  onSetTip: (amount: number) => void;
  onContinue: () => void;
}

export function TipScreen({
  subtotalWithTax,
  tipAmount,
  onSetTip,
  onContinue,
}: TipScreenProps) {
  return (
    <div className="max-w-sm mx-auto py-8 space-y-6">
      <h2 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight text-center font-[var(--font-heading)]">
        Add a Tip
      </h2>
      <p className="text-[var(--text-tertiary)] text-center text-sm">
        Subtotal:{' '}
        <span className="font-medium">${subtotalWithTax.toFixed(2)}</span>
      </p>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-3">
        {TIP_PRESETS.map((amount) => (
          <button
            key={amount}
            onClick={() => onSetTip(amount)}
            className={`py-5 rounded-2xl text-xl font-bold transition-all min-h-[56px] ${
              tipAmount === amount
                ? 'bg-[var(--text-primary)] text-[var(--surface-base)] shadow-md'
                : 'bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
            }`}
          >
            {amount === 0 ? 'None' : `$${amount}`}
          </button>
        ))}
      </div>

      {/* Custom tip */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
          Custom tip
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-center text-xl focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all"
          placeholder="$0.00"
          value={tipAmount || ''}
          onChange={(e) => onSetTip(Number(e.target.value) || 0)}
        />
      </div>

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm"
        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
      >
        Continue to Payment
      </button>
    </div>
  );
}
