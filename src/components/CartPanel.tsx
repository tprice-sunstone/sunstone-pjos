// ============================================================================
// CartPanel — Luxury Checkout Sidebar
// src/components/CartPanel.tsx
// ============================================================================
// Shared by Store Mode and Event Mode POS.
// - Per-item discount controls (gated by discounts:apply permission)
// - Cart-level discount
// - Elevated total display with design system tokens
// - Touch-optimized 56px row height
// ============================================================================

'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/Button';

// CHANGED: Removed 'receipt' from CheckoutStep
type CheckoutStep = 'items' | 'tip' | 'payment' | 'confirmation';

export default function CartPanel({ cart, step, setStep, tenant }: {
  cart: any;
  step: CheckoutStep;
  setStep: (s: CheckoutStep) => void;
  tenant: any;
}) {
  const { can } = useTenant();
  const canDiscount = can('discounts:apply');

  // Per-item discount state
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountInput, setDiscountInput] = useState('');

  // Cart-level discount state
  const [showCartDiscount, setShowCartDiscount] = useState(false);
  const [cartDiscountType, setCartDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [cartDiscountInput, setCartDiscountInput] = useState('');

  const applyItemDiscount = (itemId: string) => {
    const value = Number(discountInput);
    if (!value || value <= 0) {
      cart.updateItemDiscount(itemId, null, 0);
    } else {
      cart.updateItemDiscount(itemId, discountType, value);
    }
    setDiscountItemId(null);
    setDiscountInput('');
  };

  const clearItemDiscount = (itemId: string) => {
    cart.updateItemDiscount(itemId, null, 0);
    setDiscountItemId(null);
    setDiscountInput('');
  };

  const applyCartDiscount = () => {
    const value = Number(cartDiscountInput);
    if (!value || value <= 0) {
      cart.setCartDiscount(null, 0);
    } else {
      cart.setCartDiscount(cartDiscountType, value);
    }
    setShowCartDiscount(false);
  };

  const clearCartDiscount = () => {
    cart.setCartDiscount(null, 0);
    setCartDiscountInput('');
    setShowCartDiscount(false);
  };

  const hasCartDiscount = cart._cartDiscountType && cart._cartDiscountValue > 0;

  return (
    <>
      {/* —— Panel Header —— */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          Current Sale
        </span>
        <span className="text-[11px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full">
          {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* —— Line Items —— */}
      <div className="flex-1 overflow-y-auto px-2">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-[var(--text-tertiary)] text-sm">Tap items to add them</p>
          </div>
        ) : (
          cart.items.map((item: any) => (
            <div key={item.id} className="group">
              <div className="flex items-start justify-between gap-3 px-4 py-3.5 min-h-[56px] border-b border-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] transition-colors rounded-lg mx-1 my-0.5">
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm font-medium text-[var(--text-primary)] leading-snug">{item.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1.5">
                    {item.quantity > 1 && <span>{item.quantity} x </span>}
                    <span className="">${item.unit_price.toFixed(2)}</span>
                    {item.discount_type && item.discount_value > 0 && (
                      <span className="text-success-600 font-medium">
                        (-{item.discount_type === 'flat' ? `$${item.discount_value.toFixed(2)}` : `${item.discount_value}%`})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)] ">
                    ${item.line_total.toFixed(2)}
                  </span>
                  {/* Discount toggle */}
                  {canDiscount && (
                    <button
                      onClick={() => {
                        if (discountItemId === item.id) {
                          setDiscountItemId(null);
                        } else {
                          setDiscountItemId(item.id);
                          setDiscountType(item.discount_type || 'flat');
                          setDiscountInput(item.discount_value > 0 ? item.discount_value.toString() : '');
                        }
                      }}
                      className={`p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
                        item.discount_type && item.discount_value > 0
                          ? 'text-success-600 bg-success-50 hover:bg-success-100'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] opacity-0 group-hover:opacity-100'
                      }`}
                      title="Item discount"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => cart.removeItem(item.id)}
                    className="text-[var(--text-tertiary)] hover:text-error-500 transition-colors p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-error-50 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline item discount editor */}
              {canDiscount && discountItemId === item.id && (
                <div className="mx-5 mb-2 p-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDiscountType('flat')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                        discountType === 'flat'
                          ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                          : 'bg-[var(--surface-base)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                      }`}
                    >
                      $ Flat
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                        discountType === 'percentage'
                          ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                          : 'bg-[var(--surface-base)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                      }`}
                    >
                      % Percent
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={discountType === 'flat' ? '0.00' : '0'}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm  focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-subtle)]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyItemDiscount(item.id);
                        if (e.key === 'Escape') setDiscountItemId(null);
                      }}
                    />
                    <button
                      onClick={() => applyItemDiscount(item.id)}
                      className="h-9 px-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                    >
                      Apply
                    </button>
                    {item.discount_type && item.discount_value > 0 && (
                      <button
                        onClick={() => clearItemDiscount(item.id)}
                        className="h-9 px-2 rounded-lg text-error-500 hover:bg-error-50 text-xs font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* —— Totals —— */}
      <div className="px-6 pt-4 pb-2 border-t border-[var(--border-subtle)] space-y-1.5 text-sm">
        <div className="flex justify-between text-[var(--text-tertiary)]">
          <span>Subtotal</span>
          <span className="">${cart.subtotal.toFixed(2)}</span>
        </div>

        {/* Cart-level discount controls */}
        {cart.items.length > 0 && canDiscount && (
          <div>
            {hasCartDiscount ? (
              <div className="flex items-center justify-between text-success-600">
                <button
                  onClick={() => {
                    setShowCartDiscount(true);
                    setCartDiscountType(cart._cartDiscountType || 'flat');
                    setCartDiscountInput(cart._cartDiscountValue.toString());
                  }}
                  className="text-xs underline hover:no-underline font-medium"
                >
                  Discount ({cart._cartDiscountType === 'flat' ? `$${cart._cartDiscountValue.toFixed(2)}` : `${cart._cartDiscountValue}%`})
                </button>
                <span className="">-${(cart.discount_amount).toFixed(2)}</span>
              </div>
            ) : !showCartDiscount ? (
              <button
                onClick={() => setShowCartDiscount(true)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-medium transition-colors"
              >
                + Add discount
              </button>
            ) : null}

            {/* Cart discount editor */}
            {showCartDiscount && (
              <div className="mt-2 p-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCartDiscountType('flat')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      cartDiscountType === 'flat'
                        ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                        : 'bg-[var(--surface-base)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                    }`}
                  >
                    $ Flat
                  </button>
                  <button
                    onClick={() => setCartDiscountType('percentage')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      cartDiscountType === 'percentage'
                        ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                        : 'bg-[var(--surface-base)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                    }`}
                  >
                    % Percent
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={cartDiscountType === 'flat' ? '0.00' : '0'}
                    value={cartDiscountInput}
                    onChange={(e) => setCartDiscountInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm  focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-subtle)]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCartDiscount();
                      if (e.key === 'Escape') setShowCartDiscount(false);
                    }}
                  />
                  <button
                    onClick={applyCartDiscount}
                    className="h-9 px-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                  >
                    Apply
                  </button>
                  {hasCartDiscount && (
                    <button
                      onClick={clearCartDiscount}
                      className="h-9 px-2 rounded-lg text-error-500 hover:bg-error-50 text-xs font-medium transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowCartDiscount(false)}
                    className="h-9 px-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Read-only discount display for non-privileged users */}
        {cart.items.length > 0 && !canDiscount && hasCartDiscount && (
          <div className="flex items-center justify-between text-success-600">
            <span className="text-xs">Discount</span>
            <span className="">-${(cart.discount_amount).toFixed(2)}</span>
          </div>
        )}

        {cart.discount_amount > 0 && !hasCartDiscount && (
          <div className="flex justify-between text-success-600">
            <span>Item discounts</span>
            <span className="">-${cart.discount_amount.toFixed(2)}</span>
          </div>
        )}
        {cart.tax_amount > 0 && (
          <div className="flex justify-between text-[var(--text-tertiary)]">
            <span>Tax ({(cart.tax_rate * 100).toFixed(1)}%)</span>
            <span className="">${cart.tax_amount.toFixed(2)}</span>
          </div>
        )}
        {cart.tip_amount > 0 && (
          <div className="flex justify-between text-[var(--text-tertiary)]">
            <span>Tip</span>
            <span className="">${cart.tip_amount.toFixed(2)}</span>
          </div>
        )}
        {cart.platform_fee_amount > 0 && tenant?.fee_handling === 'pass_to_customer' && (
          <div className="flex justify-between text-[var(--text-tertiary)] text-xs">
            <span>Service Fee</span>
            <span className="">${cart.platform_fee_amount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* —— THE MOMENT: Total —— */}
      <div className="px-6 pt-4 pb-2 border-t-2 border-[var(--text-primary)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total</span>
          <span className="text-[32px] font-bold text-[var(--text-primary)]  tracking-tight leading-none">
            ${cart.total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* —— Checkout Button —— */}
      <div className="p-5">
        {step === 'items' && cart.items.length > 0 && (
          <button
            onClick={() => setStep('tip')}
            className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm hover:shadow-md"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            Checkout — ${cart.total.toFixed(2)}
          </button>
        )}
        {step !== 'items' && step !== 'confirmation' && (
          <button
            onClick={() => {
              // CHANGED: Removed 'receipt' from step navigation
              const steps: CheckoutStep[] = ['items', 'tip', 'payment'];
              const idx = steps.indexOf(step);
              if (idx > 0) setStep(steps[idx - 1]);
            }}
            className="w-full h-12 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
        )}
      </div>
    </>
  );
}