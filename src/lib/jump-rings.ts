// ============================================================================
// Shared Jump Ring Calculation Utilities — src/lib/jump-rings.ts
// ============================================================================
// Extracted from event-mode-page so both Event Mode and Store Mode POS
// pages can share identical jump ring logic without duplication.
// ============================================================================

import type { InventoryItem, JumpRingResolution } from '@/types';

/**
 * Calculate jump ring needs for all cart items.
 * Looks at _inventory_type and _jump_rings_required metadata on each cart item.
 * Attempts to match jump rings by material name (case-insensitive).
 */
export function calculateJumpRingNeeds(
  cartItems: Array<{
    id: string;
    name: string;
    quantity: number;
    inventory_item_id: string | null;
    _inventory_type?: string | null;
    _jump_rings_required?: number | null;
    _material?: string | null;
  }>,
  jumpRingInventory: InventoryItem[]
): JumpRingResolution[] {
  const resolutions: JumpRingResolution[] = [];

  for (const item of cartItems) {
    if (!item.inventory_item_id) continue;

    const invType = item._inventory_type;
    if (!invType) continue;

    let jumpRingsNeeded = 0;

    if (invType === 'chain') {
      // Chain product — use _jump_rings_required (from product type) or default to 1
      const perUnit = item._jump_rings_required ?? 1;
      jumpRingsNeeded = perUnit * item.quantity;
    } else if (invType === 'charm' || invType === 'connector') {
      // 1 jump ring per charm/connector
      jumpRingsNeeded = 1 * item.quantity;
    }

    if (jumpRingsNeeded === 0) continue;

    // Try to find a jump ring with matching material (case-insensitive)
    const itemMaterial = (item._material || '').toLowerCase().trim();
    const matchedJumpRing = itemMaterial
      ? jumpRingInventory.find(
          (jr) =>
            jr.is_active &&
            (jr.material || '').toLowerCase().trim() === itemMaterial
        )
      : null;

    resolutions.push({
      cart_item_id: item.id,
      cart_item_name: item.name,
      jump_rings_needed: jumpRingsNeeded,
      jump_ring_inventory_id: matchedJumpRing?.id || null,
      jump_ring_cost_each: matchedJumpRing ? Number(matchedJumpRing.cost_per_unit) : 0,
      material_name: item._material || 'Unknown',
      resolved: !!matchedJumpRing,
    });
  }

  return resolutions;
}

/**
 * Check for low stock warnings on jump rings needed for a sale.
 * Returns human-readable warning strings for any jump ring that doesn't
 * have enough quantity_on_hand to cover the sale.
 */
export function getLowStockWarnings(
  resolutions: JumpRingResolution[],
  jumpRingInventory: InventoryItem[]
): string[] {
  const warnings: string[] = [];
  const needsPerJR: Record<string, number> = {};

  for (const r of resolutions) {
    if (!r.jump_ring_inventory_id) continue;
    needsPerJR[r.jump_ring_inventory_id] =
      (needsPerJR[r.jump_ring_inventory_id] || 0) + r.jump_rings_needed;
  }

  for (const [jrId, needed] of Object.entries(needsPerJR)) {
    const jr = jumpRingInventory.find((i) => i.id === jrId);
    if (jr && jr.quantity_on_hand < needed) {
      warnings.push(
        `${jr.name} has ${jr.quantity_on_hand} left (need ${needed} for this sale)`
      );
    }
  }

  return warnings;
}