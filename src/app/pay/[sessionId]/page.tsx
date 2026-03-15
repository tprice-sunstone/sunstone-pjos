// ============================================================================
// Payment Redirect — /pay/[sessionId]
// ============================================================================
// Clean redirect URL for SMS payment links. iOS Messages truncates URLs at #
// fragments, and Stripe Checkout URLs contain #. This page provides a clean
// /pay/cs_live_xxx URL that redirects to the full Stripe Checkout URL.
//
// PUBLIC — no auth required. The sessionId is opaque and short-lived.
// ============================================================================

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export default async function PayRedirectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Resolve the Stripe checkout URL — redirect() must be called OUTSIDE
  // try/catch because Next.js redirect() throws internally.
  let redirectUrl: string | null = null;

  try {
    const db = await createServiceRoleClient();

    let stripeAccountId: string | null = null;

    // 1. Primary lookup: checkout_sessions table
    const { data: checkoutRecord, error: csError } = await db
      .from('checkout_sessions')
      .select('stripe_account_id')
      .eq('session_id', sessionId)
      .single();

    if (csError) {
      console.log('[Pay Redirect] checkout_sessions lookup:', csError.message);
    }

    if (checkoutRecord?.stripe_account_id) {
      stripeAccountId = checkoutRecord.stripe_account_id;
    }

    // 2. Fallback: sales table
    if (!stripeAccountId) {
      const { data: sale } = await db
        .from('sales')
        .select('tenant_id')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (sale) {
        const { data: tenant } = await db
          .from('tenants')
          .select('stripe_account_id')
          .eq('id', sale.tenant_id)
          .single();
        stripeAccountId = tenant?.stripe_account_id || null;
      }
    }

    // 3. Fallback: party_requests table
    if (!stripeAccountId) {
      const { data: partyReq } = await db
        .from('party_requests')
        .select('tenant_id')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (partyReq) {
        const { data: tenant } = await db
          .from('tenants')
          .select('stripe_account_id')
          .eq('id', partyReq.tenant_id)
          .single();
        stripeAccountId = tenant?.stripe_account_id || null;
      }
    }

    if (!stripeAccountId) {
      console.error('[Pay Redirect] No stripe_account_id found for session:', sessionId);
      return <ExpiredPage />;
    }

    // Retrieve the session from the connected account
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: stripeAccountId }
    );

    if (session.status === 'open' && session.url) {
      redirectUrl = session.url;
    }
  } catch (error) {
    console.error('[Pay Redirect] Error:', error);
  }

  // redirect() called outside try/catch — it throws internally in Next.js
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return <ExpiredPage />;
}

function ExpiredPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
          Link Expired
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: 1.5 }}>
          This payment link has expired. Please ask your artist to send a new one.
        </p>
      </div>
    </div>
  );
}
