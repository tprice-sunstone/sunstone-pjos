import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const settingsUrl = new URL('/dashboard/settings', request.url);

  // Handle Square denial
  if (error) {
    console.error('Square OAuth error:', error, errorDescription);
    settingsUrl.searchParams.set('error', 'square_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !stateParam) {
    settingsUrl.searchParams.set('error', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Decode state
    let state: { tenant_id: string; user_id: string; nonce: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      settingsUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(settingsUrl);
    }

    const applicationId = process.env.SQUARE_APPLICATION_ID!;
    const applicationSecret = process.env.SQUARE_APPLICATION_SECRET!;
    const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

    const squareBaseUrl = environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(`${squareBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Square token exchange failed:', tokenResponse.status, errBody);
      settingsUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(settingsUrl);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, merchant_id } = tokenData;

    if (!access_token || !merchant_id) {
      settingsUrl.searchParams.set('error', 'incomplete_response');
      return NextResponse.redirect(settingsUrl);
    }

    // Fetch merchant's primary location
    let locationId: string | null = null;
    try {
      const locRes = await fetch(`${squareBaseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (locRes.ok) {
        const locData = await locRes.json();
        const locations = locData.locations || [];
        const active = locations.find((l: any) => l.status === 'ACTIVE');
        locationId = active?.id || locations[0]?.id || null;
      }
    } catch (locErr) {
      console.warn('Could not fetch Square locations:', locErr);
    }

    // Store tokens on the tenant using service role (bypasses RLS)
    const serviceClient = await createServiceRoleClient();

    const { error: updateError } = await serviceClient
      .from('tenants')
      .update({
        square_merchant_id: merchant_id,
        square_access_token: access_token,
        square_refresh_token: refresh_token || null,
        square_location_id: locationId,
      })
      .eq('id', state.tenant_id);

    if (updateError) {
      console.error('Failed to store Square tokens:', updateError);
      settingsUrl.searchParams.set('error', 'storage_failed');
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set('success', 'square_connected');
    return NextResponse.redirect(settingsUrl);

  } catch (err: any) {
    console.error('Square OAuth callback error:', err);
    settingsUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(settingsUrl);
  }
}