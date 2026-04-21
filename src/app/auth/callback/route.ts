// ============================================================================
// Auth Callback — src/app/auth/callback/route.ts
// ============================================================================
// Handles Supabase email confirmation redirect (PKCE code exchange).
// Sends the welcome onboarding email on first-time confirmation.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  // No code — nothing to exchange, send to root
  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Route handler — ignore read-only cookie errors
          }
        },
      },
    }
  );

  // Exchange the PKCE code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Code exchange failed:', error.message);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // ── Send welcome email on first confirmation ──────────────────────────────
  // Check if the user's tenant has already received the welcome email.
  // If onboarding_welcome_sent_at is null, this is their first confirmation.
  try {
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id, tenants(id, name, onboarding_completed, onboarding_welcome_sent_at)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const tenant = (member as any)?.tenants;

    if (tenant && !tenant.onboarding_welcome_sent_at) {
      // First-time confirmation — send welcome email (non-blocking)
      const firstName =
        (user.user_metadata?.first_name as string) ||
        (user.user_metadata?.full_name as string)?.split(/\s+/)[0] ||
        null;

      sendWelcomeEmail({
        tenantId: tenant.id,
        businessName: tenant.name || 'Your Business',
        ownerEmail: user.email!,
        ownerFirstName: firstName,
      }).catch((err) =>
        console.warn('[auth/callback] Welcome email failed (non-fatal):', err.message)
      );
    }

    // Redirect based on onboarding status
    if (tenant && tenant.onboarding_completed) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (err) {
    // Non-fatal — tenant lookup can fail for edge cases
    console.warn('[auth/callback] Tenant lookup failed:', err);
  }

  // Default: send to onboarding (new users)
  return NextResponse.redirect(new URL(next, request.url));
}

// ── Welcome email helper (fire-and-forget) ──────────────────────────────────

async function sendWelcomeEmail(params: {
  tenantId: string;
  businessName: string;
  ownerEmail: string;
  ownerFirstName: string | null;
}) {
  const { sendOnboardingEmail } = await import('@/lib/emails/onboarding-emails');
  const { createServiceRoleClient } = await import('@/lib/supabase/server');

  await sendOnboardingEmail(
    {
      businessName: params.businessName,
      ownerEmail: params.ownerEmail,
      ownerFirstName: params.ownerFirstName,
      tenantCreatedAt: new Date(),
    },
    'welcome'
  );

  // Mark as sent so cron doesn't re-send
  const serviceClient = await createServiceRoleClient();
  await serviceClient
    .from('tenants')
    .update({ onboarding_welcome_sent_at: new Date().toISOString() })
    .eq('id', params.tenantId);

  console.log(`[auth/callback] Welcome email sent to ${params.ownerEmail}`);
}
