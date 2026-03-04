// ============================================================================
// GiftCardRedeemModal — Apply Gift Card at POS Checkout
// src/components/pos/GiftCardRedeemModal.tsx
// ============================================================================

'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { formatGiftCardCode } from '@/lib/gift-cards';

interface GiftCardRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  onApply: (result: {
    giftCardId: string;
    amountApplied: number;
    remainingDue: number;
    code: string;
  }) => void;
}

interface LookedUpCard {
  id: string;
  code: string;
  formatted_code: string;
  amount: number;
  remaining_balance: number;
  recipient_name: string;
}

export function GiftCardRedeemModal({
  isOpen,
  onClose,
  orderTotal,
  onApply,
}: GiftCardRedeemModalProps) {
  const [code, setCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [card, setCard] = useState<LookedUpCard | null>(null);
  const [error, setError] = useState('');

  const resetState = () => {
    setCode('');
    setLooking(false);
    setCard(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLooking(true);
    setError('');
    setCard(null);

    try {
      const res = await fetch('/api/gift-cards/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gift card not found');
      setCard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLooking(false);
    }
  };

  const handleApply = () => {
    if (!card) return;
    const amountApplied = Math.min(card.remaining_balance, orderTotal);
    const remainingDue = Math.max(0, orderTotal - card.remaining_balance);

    onApply({
      giftCardId: card.id,
      amountApplied,
      remainingDue,
      code: card.code,
    });
    handleClose();
  };

  if (!isOpen) return null;

  const amountToApply = card ? Math.min(card.remaining_balance, orderTotal) : 0;
  const remainingDue = card ? Math.max(0, orderTotal - card.remaining_balance) : orderTotal;
  const coversFullAmount = card ? card.remaining_balance >= orderTotal : false;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Apply Gift Card</h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Enter the gift card code to apply to this sale
        </p>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Code input */}
          {!card && (
            <div className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') lookupCode(); }}
                placeholder="XXXX-XXXX"
                maxLength={9}
                className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-center text-2xl font-bold tracking-widest text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                autoFocus
              />
              <button
                onClick={lookupCode}
                disabled={looking || !code.trim()}
                className="w-full h-12 rounded-xl font-semibold text-base transition-all disabled:opacity-50 min-h-[48px]"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                {looking ? 'Looking up...' : 'Look Up'}
              </button>
            </div>
          )}

          {/* Card found */}
          {card && (
            <div className="space-y-4">
              <div className="bg-[var(--surface-subtle)] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    Gift Card
                  </span>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {card.formatted_code}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-[var(--text-secondary)]">Balance</span>
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    ${card.remaining_balance.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  For: {card.recipient_name}
                  {card.amount !== card.remaining_balance && (
                    <span> (original: ${card.amount.toFixed(2)})</span>
                  )}
                </div>
              </div>

              {/* Application preview */}
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Order Total</span>
                  <span className="text-[var(--text-primary)] font-medium">${orderTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Gift Card Applied</span>
                  <span className="text-[var(--accent-primary)] font-medium">-${amountToApply.toFixed(2)}</span>
                </div>
                {!coversFullAmount && (
                  <div className="flex justify-between text-sm border-t border-[var(--border-subtle)] pt-2">
                    <span className="text-[var(--text-primary)] font-semibold">Remaining Due</span>
                    <span className="text-[var(--text-primary)] font-bold">${remainingDue.toFixed(2)}</span>
                  </div>
                )}
                {coversFullAmount && (
                  <div className="border-t border-[var(--border-subtle)] pt-2">
                    <p className="text-sm text-[var(--accent-primary)] font-medium text-center">
                      Gift card covers the full amount
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setCard(null); setCode(''); setError(''); }}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
              >
                Try a different code
              </button>
            </div>
          )}
        </div>
      </ModalBody>

      {card && (
        <ModalFooter>
          <button
            onClick={handleApply}
            className="w-full h-12 rounded-xl font-semibold text-base transition-all min-h-[48px]"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {coversFullAmount
              ? `Apply $${amountToApply.toFixed(2)} — Full Amount`
              : `Apply $${amountToApply.toFixed(2)} from Gift Card`}
          </button>
        </ModalFooter>
      )}
    </Modal>
  );
}
