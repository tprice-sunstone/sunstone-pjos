// ============================================================================
// Stripe Session Status — GET /api/stripe/session-status
// ============================================================================
// Polls a Stripe Checkout Session's payment_status directly from Stripe.
// Used by the POS to detect payment completion without relying solely on
// webhooks. Auth required.
// ============================================================================

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function GET(request: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Get sessionId from query params ─────────────────────────────────
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // ── Look up stripe_account_id from checkout_sessions table ──────────
    const db = await createServiceRoleClient();

    let stripeAccountId: string | null = null;

    const { data: checkoutRecord } = await db
      .from('checkout_sessions')
      .select('stripe_account_id')
      .eq('session_id', sessionId)
      .single();

    if (checkoutRecord?.stripe_account_id) {
      stripeAccountId = checkoutRecord.stripe_account_id;
    }

    // Fallback: look up via tenant membership
    if (!stripeAccountId) {
      const { data: member } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (member) {
        const { data: tenant } = await db
          .from('tenants')
          .select('stripe_account_id')
          .eq('id', member.tenant_id)
          .single();
        stripeAccountId = tenant?.stripe_account_id || null;
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 });
    }

    // ── Retrieve session from connected account ─────────────────────────
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: stripeAccountId }
    );

    return NextResponse.json({
      status: session.payment_status,
      sessionStatus: session.status,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('[Session Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
