// ============================================================================
// Stripe Session Status — GET /api/stripe/session-status
// ============================================================================
// Polls a Stripe Checkout Session's payment_status directly from Stripe.
// Used by the POS to detect payment completion without relying solely on
// webhooks.
//
// PUBLIC — no auth required. Security model: the caller must know the
// unguessable Stripe session ID (cs_live_xxx / cs_test_xxx) to query it.
// Only the POS that created the session knows that ID.
// ============================================================================

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function GET(request: NextRequest) {
  try {
    // ── Get sessionId from query params ─────────────────────────────────
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // ── Look up stripe_account_id from checkout_sessions table ──────────
    const db = await createServiceRoleClient();

    const { data: checkoutRecord } = await db
      .from('checkout_sessions')
      .select('stripe_account_id')
      .eq('session_id', sessionId)
      .single();

    if (!checkoutRecord?.stripe_account_id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // ── Retrieve session from connected account ─────────────────────────
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: checkoutRecord.stripe_account_id }
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
