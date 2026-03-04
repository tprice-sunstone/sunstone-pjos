// ============================================================================
// Gift Card Redeem — POST /api/gift-cards/[id]/redeem
// src/app/api/gift-cards/[id]/redeem/route.ts
// ============================================================================
// Apply gift card balance to a sale. Deducts from remaining_balance,
// creates a redemption record, and updates the sale.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!member) return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
  const tenantId = member.tenant_id;

  const body = await request.json();
  const { saleId, amount } = body;

  if (!saleId) return NextResponse.json({ error: 'saleId is required' }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });

  // Fetch the gift card
  const { data: giftCard } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!giftCard) return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });

  if (giftCard.status !== 'active') {
    return NextResponse.json({ error: 'Gift card is not active' }, { status: 400 });
  }
  if (Number(giftCard.remaining_balance) < amount) {
    return NextResponse.json({ error: 'Insufficient gift card balance' }, { status: 400 });
  }

  // Verify sale belongs to the same tenant
  const { data: sale } = await supabase
    .from('sales')
    .select('id, tenant_id')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

  try {
    const newBalance = Number(giftCard.remaining_balance) - amount;
    const newStatus = newBalance <= 0 ? 'fully_redeemed' : 'active';

    // Update gift card balance
    const { error: updateErr } = await supabase
      .from('gift_cards')
      .update({
        remaining_balance: newBalance,
        status: newStatus,
      })
      .eq('id', id);
    if (updateErr) throw updateErr;

    // Create redemption record
    const { error: redeemErr } = await supabase
      .from('gift_card_redemptions')
      .insert({
        gift_card_id: id,
        sale_id: saleId,
        tenant_id: tenantId,
        amount,
        redeemed_by: user.id,
      });
    if (redeemErr) throw redeemErr;

    // Update sale with gift card reference
    const { error: saleErr } = await supabase
      .from('sales')
      .update({
        gift_card_id: id,
        gift_card_amount_applied: amount,
      })
      .eq('id', saleId);
    if (saleErr) throw saleErr;

    return NextResponse.json({
      success: true,
      remaining_balance: newBalance,
      status: newStatus,
    });
  } catch (err: any) {
    console.error('[GiftCard Redeem] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to redeem gift card' }, { status: 500 });
  }
}
