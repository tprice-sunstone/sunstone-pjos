// ============================================================================
// ReceiptScreen — Post-Sale Confirmation + Receipt Sending
// src/components/pos/checkout/ReceiptScreen.tsx
// ============================================================================
// Shows sale summary, email + SMS receipt sending, and "New Sale" button.
// Shared by Store Mode and Event Mode POS.
// ============================================================================

'use client';

import { Button } from '@/components/ui/Button';

export interface CompletedSaleData {
  saleId: string;
  saleDate: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  tipAmount: number;
  total: number;
  paymentMethod: string;
  clientId?: string | null;
}

interface ReceiptScreenProps {
  sale: CompletedSaleData;
  receiptConfig: { email: boolean; sms: boolean };
  // Email
  receiptEmail: string;
  onSetReceiptEmail: (v: string) => void;
  onSendEmail: () => void;
  sendingEmail: boolean;
  emailSent: boolean;
  emailError: string;
  // SMS
  receiptPhone: string;
  onSetReceiptPhone: (v: string) => void;
  onSendSMS: () => void;
  sendingSMS: boolean;
  smsSent: boolean;
  smsError: string;
  // Action
  onNewSale: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  card_present: 'Card',
  card_not_present: 'Card (Online)',
  cash: 'Cash',
  venmo: 'Venmo',
  other: 'Other',
};

export function ReceiptScreen({
  sale,
  receiptConfig,
  receiptEmail,
  onSetReceiptEmail,
  onSendEmail,
  sendingEmail,
  emailSent,
  emailError,
  receiptPhone,
  onSetReceiptPhone,
  onSendSMS,
  sendingSMS,
  smsSent,
  smsError,
  onNewSale,
}: ReceiptScreenProps) {
  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      {/* Success header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-50 mb-2">
          <svg
            className="w-8 h-8 text-success-600"
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
        <h2 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight font-[var(--font-heading)]">
          Sale Complete
        </h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
        </p>
      </div>

      {/* Receipt summary card */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-5 space-y-3 shadow-[var(--shadow-card)]">
        {/* Line items */}
        <div className="space-y-2">
          {sale.items.map((item, i) => (
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
            <span>${sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-[var(--text-tertiary)]">
              <span>
                Tax ({(sale.taxRate * 100).toFixed(1)}%)
              </span>
              <span>${sale.taxAmount.toFixed(2)}</span>
            </div>
          )}
          {sale.tipAmount > 0 && (
            <div className="flex justify-between text-sm text-[var(--text-tertiary)]">
              <span>Tip</span>
              <span>${sale.tipAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="border-t-2 border-[var(--text-primary)] pt-4 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            Total
          </span>
          <span className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
            ${sale.total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Receipt sending */}
      {(receiptConfig.email || receiptConfig.sms) && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            Send Receipt
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            {receiptConfig.email && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  <input
                    className="flex-1 h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                    type="email"
                    value={receiptEmail}
                    onChange={(e) => onSetReceiptEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
                {emailSent ? (
                  <div className="flex items-center gap-1.5 text-success-600 text-sm">
                    <svg
                      className="w-4 h-4"
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
                    Sent
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSendEmail}
                    disabled={!receiptEmail || sendingEmail}
                    className="w-full min-h-[44px]"
                  >
                    {sendingEmail ? 'Sending...' : 'Email Receipt'}
                  </Button>
                )}
                {emailError && (
                  <p className="text-xs text-error-500">{emailError}</p>
                )}
              </div>
            )}

            {/* SMS */}
            {receiptConfig.sms && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                    />
                  </svg>
                  <input
                    className="flex-1 h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                    type="tel"
                    value={receiptPhone}
                    onChange={(e) => onSetReceiptPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                {smsSent ? (
                  <div className="flex items-center gap-1.5 text-success-600 text-sm">
                    <svg
                      className="w-4 h-4"
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
                    Sent
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSendSMS}
                    disabled={!receiptPhone || sendingSMS}
                    className="w-full min-h-[44px]"
                  >
                    {sendingSMS ? 'Sending...' : 'Text Receipt'}
                  </Button>
                )}
                {smsError && (
                  <p className="text-xs text-error-500">{smsError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Sale */}
      <button
        onClick={onNewSale}
        className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm"
        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
      >
        New Sale
      </button>
    </div>
  );
}
