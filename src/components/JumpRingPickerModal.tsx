// ============================================================================
// JumpRingPickerModal — src/components/JumpRingPickerModal.tsx
// ============================================================================
// Shows when a cart item needs jump rings but no material-matched jump ring
// exists in inventory. Lets the artist pick an alternative or skip.
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import type { InventoryItem, JumpRingResolution } from '@/types';

interface JumpRingPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (updatedResolutions: JumpRingResolution[]) => void;
  unresolvedResolutions: JumpRingResolution[];
  jumpRingInventory: InventoryItem[];
  lowStockWarnings: string[]; // e.g., ["Sterling Silver has 3 left (need 4)"]
}

export default function JumpRingPickerModal({
  open,
  onClose,
  onConfirm,
  unresolvedResolutions,
  jumpRingInventory,
  lowStockWarnings,
}: JumpRingPickerModalProps) {
  // Group unresolved items by material to avoid asking the same question twice
  const groupedByMaterial = useMemo(() => {
    const groups: Record<string, JumpRingResolution[]> = {};
    for (const res of unresolvedResolutions) {
      const key = res.material_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(res);
    }
    return groups;
  }, [unresolvedResolutions]);

  // Track selection per material group: jump_ring_inventory_id or 'skip'
  const [selections, setSelections] = useState<Record<string, string>>({});

  const allResolved = Object.keys(groupedByMaterial).every(
    (mat) => selections[mat] !== undefined
  );

  const handleSelect = (material: string, jumpRingId: string) => {
    setSelections((prev) => ({ ...prev, [material]: jumpRingId }));
  };

  const handleConfirm = () => {
    // Build updated resolutions with user selections
    const updated: JumpRingResolution[] = unresolvedResolutions.map((res) => {
      const material = res.material_name || 'Unknown';
      const selection = selections[material];

      if (!selection || selection === 'skip') {
        return { ...res, jump_ring_inventory_id: null, jump_ring_cost_each: 0, resolved: true };
      }

      const selectedJR = jumpRingInventory.find((jr) => jr.id === selection);
      return {
        ...res,
        jump_ring_inventory_id: selection,
        jump_ring_cost_each: selectedJR ? Number(selectedJR.cost_per_unit) : 0,
        resolved: true,
      };
    });

    onConfirm(updated);
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Jump Ring Selection</h2>
      </ModalHeader>

      <ModalBody>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Some items need jump rings that we couldn't auto-match by material. Please select which jump rings to use.
        </p>

        {/* Low stock warnings */}
        {lowStockWarnings.length > 0 && (
          <div className="mb-4 space-y-1">
            {lowStockWarnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(groupedByMaterial).map(([material, resolutions]) => {
            const totalNeeded = resolutions.reduce((sum, r) => sum + r.jump_rings_needed, 0);
            const itemNames = resolutions.map((r) => r.cart_item_name).join(', ');
            const selected = selections[material];

            return (
              <div
                key={material}
                className="border border-[var(--border-default)] rounded-xl p-4 space-y-3"
              >
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{itemNames}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Needs: {totalNeeded} jump ring{totalNeeded !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-red-500 mt-0.5">
                    No "{material}" jump ring in inventory
                  </div>
                </div>

                <div className="text-xs font-medium text-[var(--text-secondary)] mt-2">
                  Select jump ring to use:
                </div>

                <div className="space-y-1.5">
                  {jumpRingInventory.map((jr) => {
                    const isSelected = selected === jr.id;
                    const stock = jr.quantity_on_hand;
                    const isLow = stock < totalNeeded;

                    return (
                      <button
                        key={jr.id}
                        onClick={() => handleSelect(material, jr.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all min-h-[44px] ${
                          isSelected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent-primary)]'
                            : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-base)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                                : 'border-[var(--border-strong)]'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm text-[var(--text-primary)]">{jr.name}</span>
                        </div>
                        <span className={`text-xs  ${isLow ? 'text-amber-600' : 'text-[var(--text-tertiary)]'}`}>
                          {stock} left
                        </span>
                      </button>
                    );
                  })}

                  {/* Skip option */}
                  <button
                    onClick={() => handleSelect(material, 'skip')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all min-h-[44px] ${
                      selected === 'skip'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent-primary)]'
                        : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-base)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected === 'skip'
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                            : 'border-[var(--border-strong)]'
                        }`}
                      >
                        {selected === 'skip' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">Skip — don't deduct</span>
                    </div>
                  </button>

                  {selected === 'skip' && (
                    <p className="text-xs text-[var(--text-tertiary)] px-1 flex items-start gap-1">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      Skipping means inventory won't be updated for this jump ring.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel Sale
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!allResolved}>
          Continue to Payment
        </Button>
      </ModalFooter>
    </Modal>
  );
}