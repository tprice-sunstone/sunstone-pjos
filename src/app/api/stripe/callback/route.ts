import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const settingsUrl = new URL('/dashboard/settings', request.url);

  // Handle Stripe denial (user clicked "Cancel" or denied access)
  if (error) {
    console.error('Stripe OAuth error:', error, errorDescription);
    settingsUrl.searchParams.set('stripe', 'error');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !stateParam) {
    settingsUrl.searchParams.set('stripe', 'error');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Decode state
    let state: { tenant_id: string; user_id: string; nonce: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      settingsUrl.searchParams.set('stripe', 'error');
      return NextResponse.redirect(settingsUrl);
    }

    // Exchange authorization code for connected account
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      console.error('Stripe OAuth: no stripe_user_id in response');
      settingsUrl.searchParams.set('stripe', 'error');
      return NextResponse.redirect(settingsUrl);
    }

    // Store connected account ID on the tenant using service role (bypasses RLS)
    const serviceClient = await createServiceRoleClient();

    const { error: updateError } = await serviceClient
      .from('tenants')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', state.tenant_id);

    if (updateError) {
      console.error('Failed to store Stripe account ID:', updateError);
      settingsUrl.searchParams.set('stripe', 'error');
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set('stripe', 'connected');
    return NextResponse.redirect(settingsUrl);

  } catch (err: any) {
    console.error('Stripe OAuth callback error:', err);
    settingsUrl.searchParams.set('stripe', 'error');
    return NextResponse.redirect(settingsUrl);
  }
}
