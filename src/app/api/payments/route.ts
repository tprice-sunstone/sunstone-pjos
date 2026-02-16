import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/payments — Process a card payment via Square or Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      provider,       // 'square' | 'stripe'
      amount_cents,    // total in cents
      source_id,       // card nonce (Square) or payment method id (Stripe)
      tip_cents,
      platform_fee_cents,
      idempotency_key,
    } = body;

    const supabase = await createServiceRoleClient();

    // Get tenant's payment credentials
    const { data: tenant } = await supabase
      .from('tenants')
      .select('square_access_token, square_location_id, stripe_account_id')
      .eq('id', tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (provider === 'square') {
      if (!tenant.square_access_token || !tenant.square_location_id) {
        return NextResponse.json({ error: 'Square not connected' }, { status: 400 });
      }

      const { Client, Environment } = require('square');
      const squareClient = new Client({
        accessToken: tenant.square_access_token,
        environment: process.env.SQUARE_ENVIRONMENT === 'production'
          ? Environment.Production
          : Environment.Sandbox,
      });

      const response = await squareClient.paymentsApi.createPayment({
        sourceId: source_id,
        idempotencyKey: idempotency_key || crypto.randomUUID(),
        amountMoney: { amount: BigInt(amount_cents), currency: 'USD' },
        tipMoney: tip_cents ? { amount: BigInt(tip_cents), currency: 'USD' } : undefined,
        locationId: tenant.square_location_id,
        // Application fee (platform fee) collected by Sunstone
        appFeeMoney: platform_fee_cents
          ? { amount: BigInt(platform_fee_cents), currency: 'USD' }
          : undefined,
      });

      return NextResponse.json({
        success: true,
        provider: 'square',
        payment_id: response.result.payment?.id,
        status: response.result.payment?.status,
      });
    }

    if (provider === 'stripe') {
      if (!tenant.stripe_account_id) {
        return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency: 'usd',
        payment_method: source_id,
        confirm: true,
        // Funds go directly to artist's connected account
        transfer_data: {
          destination: tenant.stripe_account_id,
        },
        // Platform fee collected by Sunstone
        application_fee_amount: platform_fee_cents || 0,
      });

      return NextResponse.json({
        success: true,
        provider: 'stripe',
        payment_id: paymentIntent.id,
        status: paymentIntent.status,
      });
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  } catch (error: any) {
    console.error('Payment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
