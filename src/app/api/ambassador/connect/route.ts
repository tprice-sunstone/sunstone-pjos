// ============================================================================
// Ambassador Stripe Connect — POST /api/ambassador/connect
// ============================================================================
// Creates a Stripe Connect Express account for the ambassador and returns
// an onboarding link. If account already exists, returns a new onboarding link.
// ============================================================================

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sunstonepj.app';

export async function POST() {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createServiceRoleClient();

    // 2. Get ambassador record
    const { data: ambassador } = await admin
      .from('ambassadors')
      .select('id, email, name, type, status, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!ambassador) {
      return NextResponse.json({ error: 'No active ambassador record found' }, { status: 403 });
    }

    // 3. If already has a Connect account, check if onboarding is complete
    if (ambassador.stripe_connect_account_id) {
      const account = await stripe.accounts.retrieve(ambassador.stripe_connect_account_id);

      if (account.details_submitted) {
        // Already onboarded — update DB if needed and return dashboard link
        if (!ambassador.stripe_connect_onboarded) {
          await admin
            .from('ambassadors')
            .update({ stripe_connect_onboarded: true, updated_at: new Date().toISOString() })
            .eq('id', ambassador.id);
        }

        const loginLink = await stripe.accounts.createLoginLink(ambassador.stripe_connect_account_id);
        return NextResponse.json({ url: loginLink.url, alreadyOnboarded: true });
      }

      // Not yet onboarded — generate new onboarding link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: ambassador.stripe_connect_account_id,
        refresh_url: `${APP_URL}/dashboard/ambassador?connect=refresh`,
        return_url: `${APP_URL}/dashboard/ambassador?connect=complete`,
        type: 'account_onboarding',
      });

      return NextResponse.json({ url: accountLink.url });
    }

    // 4. Create new Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email: ambassador.email,
      metadata: {
        ambassador_id: ambassador.id,
        ambassador_type: ambassador.type,
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    // 5. Save Connect account ID
    await admin
      .from('ambassadors')
      .update({
        stripe_connect_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ambassador.id);

    // 6. Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_URL}/dashboard/ambassador?connect=refresh`,
      return_url: `${APP_URL}/dashboard/ambassador?connect=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('[Ambassador Connect] Error:', error);
    return NextResponse.json({ error: 'Failed to create Connect account' }, { status: 500 });
  }
}
