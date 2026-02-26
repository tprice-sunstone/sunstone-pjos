// ============================================================================
// Jump Ring Confirmation Component — src/components/JumpRingConfirmation.tsx
// ============================================================================
// Post-sale inline confirmation that shows which jump rings were auto-deducted
// and lets the artist adjust counts (e.g., extra jump ring due to failed weld).
// Used by both Event Mode and Store Mode POS pages.
//
// Phase 1 (auto-deduction) has already happened by the time this renders.
// This component handles Phase 2 (correction adjustments).
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { JumpRingConfirmation as JumpRingConfirmationData } from '@/types';

interface Props {
  confirmations: JumpRingConfirmationData[];
  saleId: string;
  tenantId: string;
  userId?: string;
  onConfirmed: () => void;
}

// Ring icon SVG
const RingIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 3.134 9 7s-4.03 7-9 7-9-3.134-9-7 4.03-7 9-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10c4.97 0 9 3.134 9 7s-4.03 7-9 7-9-3.134-9-7 4.03-7 9-7z" opacity={0.4} />
  </svg>
);

export default function JumpRingConfirmation({ confirmations, saleId, tenantId, userId, onConfirmed }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState<JumpRingConfirmationData[]>(confirmations);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Calculate totals and deltas
  const totalDefault = useMemo(() => items.reduce((s, i) => s + i.default_count, 0), [items]);
  const totalActual = useMemo(() => items.reduce((s, i) => s + i.actual_count, 0), [items]);
  const delta = totalActual - totalDefault;
  const hasChanges = items.some((i) => i.actual_count !== i.default_count);

  const updateCount = (cartItemId: string, newCount: number) => {
    const clamped = Math.max(0, Math.min(10, newCount));
    setItems((prev) =>
      prev.map((i) => (i.cart_item_id === cartItemId ? { ...i, actual_count: clamped } : i))
    );
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // Write correction movements for any changed items
      for (const item of items) {
        const itemDelta = item.actual_count - item.default_count;
        if (itemDelta === 0) continue;
        if (!item.jump_ring_inventory_id) continue;

        // Write correction movement
        await supabase.from('inventory_movements').insert({
          tenant_id: tenantId,
          inventory_item_id: item.jump_ring_inventory_id,
          movement_type: 'adjustment',
          quantity: -itemDelta, // negative = more used, positive = fewer used
          reference_id: saleId,
          notes: `Jump ring correction: ${item.item_name} (${item.default_count} → ${item.actual_count})`,
          performed_by: userId || null,
        });

        // Update quantity_on_hand
        // Fetch current qty to avoid race conditions
        const { data: current } = await supabase
          .from('inventory_items')
          .select('quantity_on_hand')
          .eq('id', item.jump_ring_inventory_id)
          .single();

        if (current) {
          await supabase
            .from('inventory_items')
            .update({ quantity_on_hand: Math.max(0, current.quantity_on_hand - itemDelta) })
            .eq('id', item.jump_ring_inventory_id);
        }
      }

      if (hasChanges) {
        toast.success('Jump ring inventory updated');
      }

      setConfirmed(true);
      onConfirmed();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update jump rings');
    } finally {
      setProcessing(false);
    }
  };

  // If no items need jump rings, don't render
  if (items.length === 0) return null;

  // Collapsed confirmed state
  if (confirmed || collapsed) {
    return (
      <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[var(--text-secondary)]">
            {confirmed ? 'Jump rings confirmed' : `${totalDefault} jump ring${totalDefault !== 1 ? 's' : ''} deducted (default)`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)]"><RingIcon /></span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            Jump Rings Used
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-3">
        {items.map((item) => (
          <div key={item.cart_item_id} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text-primary)] font-medium truncate">{item.item_name}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{item.jump_ring_name}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-tertiary)] mr-1">
                {item.default_count} default
              </span>
              {/* Compact stepper */}
              <button
                onClick={() => updateCount(item.cart_item_id, item.actual_count - 1)}
                disabled={item.actual_count <= 0}
                className="w-8 h-8 rounded-lg border border-[var(--border-default)] bg-white flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                </svg>
              </button>
              <span className={`w-8 text-center text-sm  font-semibold ${
                item.actual_count !== item.default_count ? 'text-amber-600' : 'text-[var(--text-primary)]'
              }`}>
                {item.actual_count}
              </span>
              <button
                onClick={() => updateCount(item.cart_item_id, item.actual_count + 1)}
                disabled={item.actual_count >= 10}
                className="w-8 h-8 rounded-lg border border-[var(--border-default)] bg-white flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)] space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            Total: {totalActual} jump ring{totalActual !== 1 ? 's' : ''}
          </span>
          {hasChanges ? (
            <span className="text-amber-600 text-xs font-medium">
              {delta > 0 ? `${delta} extra` : `${Math.abs(delta)} fewer`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Matches default
            </span>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-[var(--text-tertiary)]">
          Had to redo a weld? Adjust the count above and we'll update your inventory.
        </p>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={processing}
          className={`w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60 ${
            hasChanges
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-[var(--text-primary)] text-white'
          }`}
        >
          {processing
            ? 'Updating...'
            : hasChanges
              ? 'Update Jump Rings'
              : 'Confirm Jump Rings'
          }
        </button>
      </div>
    </div>
  );
}