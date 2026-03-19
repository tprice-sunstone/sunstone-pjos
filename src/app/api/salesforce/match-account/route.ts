// ============================================================================
// SF Account Match — src/app/api/salesforce/match-account/route.ts
// ============================================================================
// GET: Match the authenticated artist's email to a Salesforce Account
// via the StudioReorderAPI Apex REST endpoint. Returns account info,
// shipping address, and saved payment methods.
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sfFindAccount, sfGetPaymentMethods } from '@/lib/salesforce';

export async function GET() {
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

    const email = user.email;
    if (!email) {
      return NextResponse.json({ matched: false, reason: 'No email on account' });
    }

    const serviceClient = await createServiceRoleClient();

    // Call SF Apex REST to find account by email
    let accountData: any;
    try {
      accountData = await sfFindAccount(email);
    } catch (err: any) {
      console.error('[SF Match Account] findAccount error:', err);
      return NextResponse.json({ matched: false, error: 'Failed to look up Salesforce account' });
    }

    if (!accountData || !accountData.accountId) {
      return NextResponse.json({ matched: false });
    }

    // Cache sf_account_id on tenant
    await serviceClient
      .from('tenants')
      .update({ sf_account_id: accountData.accountId })
      .eq('id', member.tenant_id);

    // Fetch saved payment methods
    let paymentMethods: any[] = [];
    try {
      const pmResult = await sfGetPaymentMethods(accountData.accountId);
      paymentMethods = pmResult?.paymentMethods || pmResult?.cards || [];
    } catch (err) {
      console.warn('[SF Match Account] getPaymentMethods error:', err);
      // Non-critical — proceed without payment methods
    }

    return NextResponse.json({
      matched: true,
      accountId: accountData.accountId,
      accountName: accountData.accountName || accountData.name || '',
      contactId: accountData.contactId || null,
      shippingAddress: {
        street: accountData.shippingStreet || accountData.shippingAddress?.street || '',
        city: accountData.shippingCity || accountData.shippingAddress?.city || '',
        state: accountData.shippingState || accountData.shippingAddress?.state || '',
        postalCode: accountData.shippingPostalCode || accountData.shippingAddress?.postalCode || '',
        country: accountData.shippingCountry || accountData.shippingAddress?.country || 'US',
      },
      paymentMethods,
    });
  } catch (err: any) {
    console.error('[SF Match Account] Error:', err);
    return NextResponse.json({ error: 'Failed to match account' }, { status: 500 });
  }
}
