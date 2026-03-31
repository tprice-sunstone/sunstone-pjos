// ============================================================================
// Ambassador Connect Status — GET /api/ambassador/connect/status
// ============================================================================
// Checks if the ambassador's Stripe Connect onboarding is complete.
// ============================================================================

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createServiceRoleClient();

    const { data: ambassador } = await admin
      .from('ambassadors')
      .select('id, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', user.id)
      .single();

    if (!ambassador) {
      return NextResponse.json({ onboarded: false, hasAccount: false });
    }

    if (!ambassador.stripe_connect_account_id) {
      return NextResponse.json({ onboarded: false, hasAccount: false });
    }

    // Check with Stripe if onboarding is complete
    const account = await stripe.accounts.retrieve(ambassador.stripe_connect_account_id);

    if (account.details_submitted) {
      // Update DB if needed
      if (!ambassador.stripe_connect_onboarded) {
        await admin
          .from('ambassadors')
          .update({ stripe_connect_onboarded: true, updated_at: new Date().toISOString() })
          .eq('id', ambassador.id);
      }
      return NextResponse.json({ onboarded: true, hasAccount: true });
    }

    return NextResponse.json({ onboarded: false, hasAccount: true });
  } catch (error: any) {
    console.error('[Ambassador Connect Status] Error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
