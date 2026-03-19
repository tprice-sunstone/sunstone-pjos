// ============================================================================
// Mark Reorder Received — src/app/api/reorders/[id]/receive/route.ts
// ============================================================================
// PATCH: Mark a reorder as received and auto-restock inventory items.
// Creates inventory_movements with type 'restock'.
// Accepts optional quantity overrides for short/extra shipments.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    // Parse optional quantity overrides from body
    let quantityOverrides: Record<string, number> = {};
    try {
      const body = await request.json();
      if (body?.quantityOverrides) {
        quantityOverrides = body.quantityOverrides;
      }
    } catch {
      // No body or invalid JSON — use original quantities
    }

    // Fetch the reorder
    const { data: reorder, error: fetchErr } = await supabase
      .from('reorder_history')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', member.tenant_id)
      .single();

    if (fetchErr || !reorder) {
      return NextResponse.json({ error: 'Reorder not found' }, { status: 404 });
    }

    if (reorder.status === 'completed') {
      return NextResponse.json({ error: 'Reorder already marked as received' }, { status: 400 });
    }

    // Update reorder status
    const { error: updateErr } = await supabase
      .from('reorder_history')
      .update({
        status: 'completed',
        received_at: new Date().toISOString(),
        received_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      console.error('[Reorder Receive] Update error:', updateErr.message);
      return NextResponse.json({ error: 'Failed to update reorder' }, { status: 500 });
    }

    // Build order reference for movement notes
    const orderRef = reorder.shopify_order_name
      || (reorder.sf_opportunity_id ? `SF-${reorder.sf_opportunity_id.slice(0, 8)}` : `#${id.slice(0, 8)}`);

    // Auto-restock inventory items
    const items = (reorder.items as any[]) || [];
    const restocked: { name: string; quantity: number }[] = [];

    for (const item of items) {
      if (!item.inventory_item_id) continue;

      // Use override quantity if provided, otherwise use ordered quantity
      const restockQty = quantityOverrides[item.inventory_item_id] ?? item.quantity;
      if (restockQty <= 0) continue;

      // Get current stock
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('id, quantity_on_hand, name, unit')
        .eq('id', item.inventory_item_id)
        .eq('tenant_id', member.tenant_id)
        .single();

      if (!invItem) continue;

      const newQty = (invItem.quantity_on_hand || 0) + restockQty;

      // Update stock
      await supabase
        .from('inventory_items')
        .update({
          quantity_on_hand: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.inventory_item_id);

      // Create inventory movement
      await supabase
        .from('inventory_movements')
        .insert({
          tenant_id: member.tenant_id,
          inventory_item_id: item.inventory_item_id,
          type: 'restock',
          quantity: restockQty,
          notes: `Sunstone reorder ${orderRef}`,
        });

      restocked.push({ name: invItem.name, quantity: restockQty });
    }

    const restockSummary = restocked.map((r) => `${r.quantity} ${r.name}`).join(', ');

    return NextResponse.json({
      success: true,
      restocked: restocked.map((r) => r.name),
      message: restocked.length > 0
        ? `Inventory updated! Added ${restockSummary}.`
        : 'Reorder marked as received (no inventory items to restock)',
    });
  } catch (err: any) {
    console.error('[Reorder Receive] Error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
