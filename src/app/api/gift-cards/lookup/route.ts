// ============================================================================
// Gift Card Lookup — POST /api/gift-cards/lookup
// src/app/api/gift-cards/lookup/route.ts
// ============================================================================
// POS code lookup: validates the code and returns card details + balance.
// Security: doesn't reveal if a code exists for a different tenant.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { normalizeGiftCardCode, formatGiftCardCode } from '@/lib/gift-cards';

export async function POST(request: NextRequest) {
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
  const rawCode = body.code?.trim();
  if (!rawCode) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  const code = normalizeGiftCardCode(rawCode);
  if (code.length !== 8) {
    return NextResponse.json({ error: 'Invalid gift card code' }, { status: 400 });
  }

  const { data: giftCard } = await supabase
    .from('gift_cards')
    .select('id, code, amount, remaining_balance, status, recipient_name, expires_at, purchased_at')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .single();

  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
  }

  // Validate card is usable
  if (giftCard.status === 'cancelled') {
    return NextResponse.json({ error: 'This gift card has been cancelled' }, { status: 400 });
  }
  if (giftCard.status === 'fully_redeemed') {
    return NextResponse.json({ error: 'This gift card has been fully redeemed' }, { status: 400 });
  }
  if (giftCard.status === 'expired' || (giftCard.expires_at && new Date(giftCard.expires_at) < new Date())) {
    return NextResponse.json({ error: 'This gift card has expired' }, { status: 400 });
  }
  if (Number(giftCard.remaining_balance) <= 0) {
    return NextResponse.json({ error: 'This gift card has no remaining balance' }, { status: 400 });
  }

  return NextResponse.json({
    id: giftCard.id,
    code: giftCard.code,
    formatted_code: formatGiftCardCode(giftCard.code),
    amount: Number(giftCard.amount),
    remaining_balance: Number(giftCard.remaining_balance),
    recipient_name: giftCard.recipient_name,
    purchased_at: giftCard.purchased_at,
  });
}
