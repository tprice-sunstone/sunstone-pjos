// ============================================================================
// Warranty Utilities — src/lib/warranty.ts
// ============================================================================
// Post-sale warranty record creation shared by Store Mode and Event Mode POS.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CartItem } from '@/types';

interface CreateWarrantiesParams {
  supabase: SupabaseClient;
  saleId: string;
  tenantId: string;
  clientId: string | null;
  cartItems: CartItem[];
  cartWarrantyAmount: number;
  coverageTerms: string | null;
  durationDays: number | null;
}

/**
 * After a sale is created, update warranty amounts on sale/sale_items
 * and create warranty records in the warranties table.
 */
export async function createWarrantyRecords({
  supabase,
  saleId,
  tenantId,
  clientId,
  cartItems,
  cartWarrantyAmount,
  coverageTerms,
  durationDays,
}: CreateWarrantiesParams) {
  const itemWarrantyTotal = cartItems.reduce((sum, i) => sum + (i.warranty_amount || 0), 0);
  const totalWarranty = itemWarrantyTotal + cartWarrantyAmount;

  if (totalWarranty <= 0) return;

  // Update the sale's warranty_amount
  await supabase
    .from('sales')
    .update({ warranty_amount: totalWarranty })
    .eq('id', saleId);

  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Handle per-item warranties
  const itemsWithWarranty = cartItems.filter((i) => (i.warranty_amount || 0) > 0);
  if (itemsWithWarranty.length > 0) {
    // Fetch the sale_items to get their IDs
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('id, inventory_item_id, name')
      .eq('sale_id', saleId)
      .eq('tenant_id', tenantId);

    if (saleItems) {
      for (const cartItem of itemsWithWarranty) {
        // Match sale_item by inventory_item_id and name
        const saleItem = saleItems.find(
          (si) => si.inventory_item_id === cartItem.inventory_item_id && si.name === cartItem.name
        );

        if (saleItem) {
          // Update sale_item warranty_amount
          await supabase
            .from('sale_items')
            .update({ warranty_amount: cartItem.warranty_amount })
            .eq('id', saleItem.id);

          // Create per_item warranty record
          await supabase.from('warranties').insert({
            tenant_id: tenantId,
            sale_id: saleId,
            sale_item_id: saleItem.id,
            client_id: clientId,
            scope: 'per_item',
            amount: cartItem.warranty_amount,
            coverage_terms: coverageTerms,
            status: 'active',
            expires_at: expiresAt,
          });
        }
      }
    }
  }

  // Handle per-invoice (cart-level) warranty
  if (cartWarrantyAmount > 0) {
    await supabase.from('warranties').insert({
      tenant_id: tenantId,
      sale_id: saleId,
      sale_item_id: null,
      client_id: clientId,
      scope: 'per_invoice',
      amount: cartWarrantyAmount,
      coverage_terms: coverageTerms,
      status: 'active',
      expires_at: expiresAt,
    });
  }
}
