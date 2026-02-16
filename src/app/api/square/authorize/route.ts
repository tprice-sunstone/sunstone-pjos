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
      return NextResponse.redirect(new URL('/dashboard/settings?error=no_tenant', request.url));
    }

    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

    if (!applicationId) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=square_not_configured', request.url));
    }

    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`;

    // State parameter includes tenant ID for the callback to know which tenant to update
    const state = Buffer.from(JSON.stringify({
      tenant_id: member.tenant_id,
      user_id: user.id,
      nonce: Math.random().toString(36).substring(2, 15),
    })).toString('base64url');

    const scopes = [
      'MERCHANT_PROFILE_READ',
      'PAYMENTS_WRITE',
      'PAYMENTS_READ',
      'ORDERS_WRITE',
      'ORDERS_READ',
    ].join('+');

    const authUrl = `${baseUrl}/oauth2/authorize?client_id=${applicationId}&scope=${scopes}&session=false&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Square OAuth initiation error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
  }
}