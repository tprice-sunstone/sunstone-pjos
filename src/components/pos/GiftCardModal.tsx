// ============================================================================
// GiftCardModal — Sell Gift Card from POS
// src/components/pos/GiftCardModal.tsx
// ============================================================================

'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { GIFT_CARD_PRESETS, formatGiftCardCode } from '@/lib/gift-cards';
import type { GiftCardDeliveryMethod } from '@/types';

interface GiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  stripeConnected: boolean;
  onGiftCardSold?: (giftCard: any) => void;
}

type ModalStep = 'form' | 'processing' | 'success';

export function GiftCardModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  stripeConnected,
  onGiftCardSold,
}: GiftCardModalProps) {
  const [step, setStep] = useState<ModalStep>('form');
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<GiftCardDeliveryMethod>('sms');
  const [processing, setProcessing] = useState(false);
  const [createdCard, setCreatedCard] = useState<any>(null);
  const [error, setError] = useState('');

  const effectiveAmount = useCustom ? Number(customAmount) || 0 : amount;

  const resetForm = () => {
    setStep('form');
    setAmount(50);
    setCustomAmount('');
    setUseCustom(false);
    setRecipientName('');
    setRecipientPhone('');
    setRecipientEmail('');
    setPurchaserName('');
    setPersonalMessage('');
    setDeliveryMethod('sms');
    setProcessing(false);
    setCreatedCard(null);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const createGiftCard = async (paymentMethod: string) => {
    if (effectiveAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!recipientName.trim()) {
      setError('Recipient name is required');
      return;
    }
    if (deliveryMethod === 'sms' && !recipientPhone.trim()) {
      setError('Phone number is required for text delivery');
      return;
    }
    if (deliveryMethod === 'email' && !recipientEmail.trim()) {
      setError('Email is required for email delivery');
      return;
    }

    setError('');
    setProcessing(true);
    setStep('processing');

    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmount,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim() || null,
          recipientEmail: recipientEmail.trim() || null,
          purchaserName: purchaserName.trim() || null,
          personalMessage: personalMessage.trim() || null,
          deliveryMethod,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create gift card');

      setCreatedCard(data);
      setStep('success');
      onGiftCardSold?.(data);
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {step === 'success' ? 'Gift Card Created!' : 'Sell Gift Card'}
        </h2>
      </ModalHeader>

      <ModalBody>
        {/* ── Success screen ── */}
        {step === 'success' && createdCard && (
          <div className="text-center py-4">
            <div className="text-[var(--accent-primary)] mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              ${Number(createdCard.amount).toFixed(2)}
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              Gift card for {createdCard.recipient_name}
            </p>
            <div className="bg-[var(--surface-subtle)] rounded-2xl p-5 mb-4 inline-block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">
                Code
              </p>
              <p className="text-3xl font-bold text-[var(--text-primary)] tracking-widest">
                {createdCard.formatted_code || formatGiftCardCode(createdCard.code)}
              </p>
            </div>
            {createdCard.delivery_method === 'sms' && (
              <p className="text-sm text-[var(--text-secondary)]">
                Sent via text to {createdCard.recipient_phone}
              </p>
            )}
            {createdCard.delivery_method === 'email' && (
              <p className="text-sm text-[var(--text-secondary)]">
                Sent via email to {createdCard.recipient_email}
              </p>
            )}
            {createdCard.delivery_method === 'print' && (
              <p className="text-sm text-[var(--text-secondary)]">
                Write down or print this code for the customer
              </p>
            )}
          </div>
        )}

        {/* ── Processing screen ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent mb-4" />
            <p className="text-sm text-[var(--text-tertiary)]">Creating gift card...</p>
          </div>
        )}

        {/* ── Form ── */}
        {step === 'form' && (
          <div className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            {/* Amount selection */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
                Amount
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {GIFT_CARD_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setAmount(preset); setUseCustom(false); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                      !useCustom && amount === preset
                        ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                        : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    useCustom
                      ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustom && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-medium">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full h-12 pl-8 pr-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Recipient info */}
            <div className="space-y-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                Recipient
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient name *"
                className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Phone (for text delivery)"
                className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Email (for email delivery)"
                className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>

            {/* Purchaser name */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
                From (optional)
              </label>
              <input
                type="text"
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                placeholder="Purchaser name"
                className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>

            {/* Personal message */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
                Personal Message (optional)
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={2}
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-base resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>

            {/* Delivery method */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
                Delivery
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'sms' as GiftCardDeliveryMethod, label: 'Text' },
                  { value: 'email' as GiftCardDeliveryMethod, label: 'Email' },
                  { value: 'print' as GiftCardDeliveryMethod, label: 'Print / Tell' },
                  { value: 'none' as GiftCardDeliveryMethod, label: 'None' },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDeliveryMethod(value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      deliveryMethod === value
                        ? 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                        : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'success' ? (
          <button
            onClick={handleClose}
            className="w-full h-12 rounded-xl font-semibold text-base transition-all min-h-[48px]"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            Done
          </button>
        ) : step === 'form' ? (
          <div className="w-full space-y-3">
            {/* Record External Payment (always available) */}
            <button
              onClick={() => createGiftCard('external')}
              disabled={processing || effectiveAmount <= 0}
              className="w-full h-12 rounded-xl font-semibold text-base transition-all border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50 min-h-[48px]"
            >
              Record External Payment — ${effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '0.00'}
            </button>
          </div>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}
