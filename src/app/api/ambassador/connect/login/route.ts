// ============================================================================
// Ambassador Connect Login Link — GET /api/ambassador/connect/login
// ============================================================================
// Generates a Stripe Express dashboard login link for the ambassador.
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
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!ambassador?.stripe_connect_account_id || !ambassador.stripe_connect_onboarded) {
      return NextResponse.json({ error: 'Connect account not set up' }, { status: 400 });
    }

    const loginLink = await stripe.accounts.createLoginLink(ambassador.stripe_connect_account_id);

    return NextResponse.json({ url: loginLink.url });
  } catch (error: any) {
    console.error('[Ambassador Connect Login] Error:', error);
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
  }
}
