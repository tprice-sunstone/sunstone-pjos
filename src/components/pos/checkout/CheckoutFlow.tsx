// ============================================================================
// CheckoutFlow — Checkout Step Orchestrator
// src/components/pos/checkout/CheckoutFlow.tsx
// ============================================================================
// Renders the active checkout step (tip → payment → confirmation).
// Shared by Store Mode and Event Mode POS. State lives in the parent page;
// this component is purely presentational + step routing.
// ============================================================================

'use client';

import { TipScreen } from './TipScreen';
import { PaymentScreen } from './PaymentScreen';
import { ReceiptScreen } from './ReceiptScreen';
import type { CompletedSaleData } from './ReceiptScreen';
import type { PaymentMethod } from '@/types';

export type CheckoutStep = 'items' | 'tip' | 'payment' | 'confirmation';

interface CheckoutFlowProps {
  step: CheckoutStep;
  // Cart values
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  // Tip
  onSetTip: (amount: number) => void;
  // Payment
  onSetPaymentMethod: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  processing: boolean;
  // Step navigation
  onContinueToPayment: () => void;
  // Confirmation / Receipt
  completedSale: CompletedSaleData | null;
  receiptConfig: { email: boolean; sms: boolean };
  receiptEmail: string;
  onSetReceiptEmail: (v: string) => void;
  onSendEmail: () => void;
  sendingEmail: boolean;
  emailSent: boolean;
  emailError: string;
  receiptPhone: string;
  onSetReceiptPhone: (v: string) => void;
  onSendSMS: () => void;
  sendingSMS: boolean;
  smsSent: boolean;
  smsError: string;
  onNewSale: () => void;
}

export function CheckoutFlow({
  step,
  subtotal,
  taxAmount,
  tipAmount,
  total,
  paymentMethod,
  onSetTip,
  onSetPaymentMethod,
  onCompleteSale,
  processing,
  onContinueToPayment,
  completedSale,
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
}: CheckoutFlowProps) {
  if (step === 'tip') {
    return (
      <TipScreen
        subtotalWithTax={subtotal + taxAmount}
        tipAmount={tipAmount}
        onSetTip={onSetTip}
        onContinue={onContinueToPayment}
      />
    );
  }

  if (step === 'payment') {
    return (
      <PaymentScreen
        selectedMethod={paymentMethod}
        onSelectMethod={onSetPaymentMethod}
        onCompleteSale={onCompleteSale}
        processing={processing}
        total={total}
      />
    );
  }

  if (step === 'confirmation' && completedSale) {
    return (
      <ReceiptScreen
        sale={completedSale}
        receiptConfig={receiptConfig}
        receiptEmail={receiptEmail}
        onSetReceiptEmail={onSetReceiptEmail}
        onSendEmail={onSendEmail}
        sendingEmail={sendingEmail}
        emailSent={emailSent}
        emailError={emailError}
        receiptPhone={receiptPhone}
        onSetReceiptPhone={onSetReceiptPhone}
        onSendSMS={onSendSMS}
        sendingSMS={sendingSMS}
        smsSent={smsSent}
        smsError={smsError}
        onNewSale={onNewSale}
      />
    );
  }

  return null;
}
