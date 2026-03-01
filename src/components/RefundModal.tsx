// ============================================================================
// RefundModal — src/components/RefundModal.tsx
// ============================================================================
// Shared modal for processing refunds from Reports or Client Profile.
// Supports full/partial refunds with amount validation and reason.
// ============================================================================

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Badge,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';

export interface RefundModalSaleSummary {
  total: number;
  refund_amount: number;
  refund_status: 'none' | 'partial' | 'full';
  payment_method: string;
  payment_provider: string | null;
  items: { name: string; quantity: number; line_total: number }[];
  created_at: string;
  client_name?: string;
}

interface RefundModalProps {
  saleId: string;
  saleSummary: RefundModalSaleSummary;
  onClose: () => void;
  onRefunded: () => void;
}

export default function RefundModal({ saleId, saleSummary, onClose, onRefunded }: RefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const remaining = saleSummary.total - saleSummary.refund_amount;
  const refundAmount = refundType === 'full' ? remaining : Number(amount) || 0;
  const isValid = refundAmount > 0 && refundAmount <= remaining + 0.01;

  const paymentLabel: Record<string, string> = {
    card_present: 'Card',
    card_not_present: 'Card (Remote)',
    cash: 'Cash',
    venmo: 'Venmo',
    other: 'Other',
  };

  const isCardPayment = saleSummary.payment_provider === 'stripe' || saleSummary.payment_provider === 'square';

  const handleSubmit = async () => {
    if (!isValid) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/sales/${saleId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(refundAmount * 100) / 100,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Refund failed');
        return;
      }
      toast.success(data.message || 'Refund processed');
      onRefunded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setProcessing(false);
    }
  };

  const saleDate = new Date(saleSummary.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Modal isOpen onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Process Refund</h2>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-5">
          {/* Sale summary */}
          <div className="rounded-lg border border-[var(--border-default)] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{saleDate}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                ${saleSummary.total.toFixed(2)}
              </span>
            </div>
            {saleSummary.client_name && (
              <p className="text-sm text-[var(--text-primary)]">{saleSummary.client_name}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {saleSummary.items.map((item, i) => (
                <span key={i} className="text-xs text-[var(--text-tertiary)]">
                  {item.name}{i < saleSummary.items.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">
                {paymentLabel[saleSummary.payment_method] || saleSummary.payment_method}
              </span>
              {saleSummary.payment_provider && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  via {saleSummary.payment_provider}
                </span>
              )}
            </div>
          </div>

          {/* Existing refund status */}
          {saleSummary.refund_status !== 'none' && (
            <div className="flex items-center gap-2">
              <Badge variant={saleSummary.refund_status === 'full' ? 'error' : 'warning'} size="sm">
                {saleSummary.refund_status === 'full' ? 'Fully Refunded' : 'Partially Refunded'}
              </Badge>
              <span className="text-sm text-[var(--text-secondary)]">
                ${saleSummary.refund_amount.toFixed(2)} refunded
              </span>
            </div>
          )}

          {/* Already fully refunded */}
          {remaining <= 0.01 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
              This sale has been fully refunded.
            </p>
          ) : (
            <>
              {/* Full / Partial toggle */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Refund Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefundType('full')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      refundType === 'full'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Full (${remaining.toFixed(2)})
                  </button>
                  <button
                    onClick={() => setRefundType('partial')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      refundType === 'partial'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Partial
                  </button>
                </div>
              </div>

              {/* Amount input (partial only) */}
              {refundType === 'partial' && (
                <Input
                  label="Refund Amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining.toFixed(2)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max: $${remaining.toFixed(2)}`}
                />
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={2}
                  placeholder="e.g. Customer dissatisfied, wrong item..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">{reason.length}/200</p>
              </div>

              {/* Payment method note */}
              <p className="text-xs text-[var(--text-tertiary)]">
                {isCardPayment
                  ? 'The refund will be automatically returned to the original card.'
                  : 'This is a record-only refund. Please return the cash/payment to the customer manually.'}
              </p>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {remaining > 0.01 && (
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={processing}
            disabled={!isValid}
          >
            Process Refund {isValid ? `($${refundAmount.toFixed(2)})` : ''}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
