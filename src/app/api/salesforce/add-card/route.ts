// ============================================================================
// SF Add Card — src/app/api/salesforce/add-card/route.ts
// ============================================================================
// POST: Add a new card to an SF Account via Authorize.net.
// Card data is passed through to SF — NOT stored on our side.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sfAddCard } from '@/lib/salesforce';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { accountId, nameOnCard, cardNumber, expirationMonth, expirationYear, cvv } = body;

    if (!accountId || !nameOnCard || !cardNumber || !expirationMonth || !expirationYear || !cvv) {
      return NextResponse.json({ error: 'All card fields are required' }, { status: 400 });
    }

    // Verify the account belongs to this tenant
    const serviceClient = await createServiceRoleClient();
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('sf_account_id')
      .eq('id', member.tenant_id)
      .single();

    if (tenant?.sf_account_id !== accountId) {
      return NextResponse.json({ error: 'Account mismatch' }, { status: 403 });
    }

    // Call SF to add the card via Authorize.net
    const result = await sfAddCard(accountId, {
      nameOnCard,
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
    });

    if (result.success === false || result.error) {
      return NextResponse.json({
        success: false,
        error: result.error || result.message || 'Failed to add card',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      cardId: result.cardId || result.paymentMethodId || null,
      brand: result.brand || null,
      last4: result.last4 || null,
    });
  } catch (err: any) {
    console.error('[SF Add Card] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to add card',
    }, { status: 500 });
  }
}
