// ============================================================================
// Cart Drawer — src/components/inventory/CartDrawer.tsx
// ============================================================================
// Slide-in panel from the right showing cart items with quantity controls,
// subtotal, and "Proceed to Checkout" button. Reads from the Zustand cart
// store. Empty state links to the Shop Sunstone tab.
// ============================================================================

'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/stores/cart-store';

interface CartDrawerProps {
  onSwitchToShop: () => void;
}

export default function CartDrawer({ onSwitchToShop }: CartDrawerProps) {
  const { items, isOpen, closeCart, removeItem, updateQuantity, openCheckout } = useCartStore();
  const count = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-[var(--surface-base)] shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Cart{count > 0 ? ` (${count} item${count !== 1 ? 's' : ''})` : ''}
          </h2>
          <button
            onClick={closeCart}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)]">Your cart is empty</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Browse the Sunstone catalog to add items.
            </p>
            <button
              onClick={() => { closeCart(); onSwitchToShop(); }}
              className="mt-4 text-sm font-semibold hover:underline"
              style={{ color: '#7A234A' }}
            >
              Shop Sunstone &rarr;
            </button>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-[var(--surface-raised)] overflow-hidden shrink-0 relative">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productTitle}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-[var(--text-tertiary)] opacity-30">
                            {item.productTitle.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {item.productTitle}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {item.variantTitle !== 'Default Title' ? item.variantTitle : item.productType}
                        {' '}&mdash; ${item.unitPrice.toFixed(2)} each
                      </p>
                    </div>

                    {/* Line total + remove */}
                    <div className="shrink-0 text-right flex flex-col items-end justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3 px-3 pb-3 pt-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-9 h-9 rounded-lg border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="text-sm font-semibold text-[var(--text-primary)] w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-9 h-9 rounded-lg border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-default)] px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Subtotal</span>
                <span className="text-lg font-bold text-[var(--text-primary)]">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Tax + shipping calculated at checkout
              </p>
              <button
                onClick={openCheckout}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 min-h-[48px]"
                style={{ backgroundColor: '#7A234A' }}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
