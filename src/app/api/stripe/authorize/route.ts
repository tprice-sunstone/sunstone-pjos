import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Get tenant for the current user
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.redirect(new URL('/dashboard/settings?stripe=error', request.url));
    }

    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      console.error('STRIPE_CLIENT_ID not configured');
      return NextResponse.redirect(new URL('/dashboard/settings?stripe=error', request.url));
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/callback`;

    // State parameter includes tenant ID for CSRF protection
    const state = Buffer.from(JSON.stringify({
      tenant_id: member.tenant_id,
      user_id: user.id,
      nonce: Math.random().toString(36).substring(2, 15),
    })).toString('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state,
    });

    const authUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Stripe OAuth initiation error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?stripe=error', request.url));
  }
}