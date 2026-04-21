// ============================================================================
// Signup Route — src/app/api/signup/route.ts
// ============================================================================
// Creates tenant + tenant_member using service role (bypasses RLS).
// Sets 30-day Pro trial on new tenants.
// Stores first_name in auth user metadata.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { provisionPhoneNumber, sendSMS } from '@/lib/twilio';
import { sendReferralSignupEmail } from '@/lib/ambassador-emails';

const RATE_LIMIT = { prefix: 'signup', limit: 5, windowSeconds: 300 };

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (5 signups per 5 minutes)
    const ip = getClientIP(request);
    const rl = checkRateLimit(ip, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { userId, businessName, firstName, referralCode, email } = await request.json();

    if (!userId || !businessName) {
      return NextResponse.json(
        { error: 'Missing userId or businessName' },
        { status: 400 }
      );
    }

    // Use service role client — bypasses RLS entirely
    const supabase = await createServiceRoleClient();

    // ── Verify user exists in Supabase Auth via service role ──
    // When email confirmation is enabled, auth.signUp() does not create a session,
    // so cookie-based auth checks fail. Instead, verify userId via admin API.
    const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
    if (authLookupError || !authUser?.user) {
      console.error('[signup] User not found in auth:', userId, authLookupError);
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }

    // Security: if the client sent an email, verify it matches the auth record
    if (email && authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
      console.error('[signup] Email mismatch for userId:', userId);
      return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });
    }

    const user = authUser.user;

    // Create slug from business name
    const slug =
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 48) + `-${Date.now().toString(36)}`;

    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // 1. Create tenant with 30-day Pro trial
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        slug,
        owner_id: userId,
        // Subscription: 30-day Pro trial
        subscription_tier: 'pro',
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        platform_fee_percent: 1.5,
        // CRM: enabled during trial
        crm_enabled: true,
        crm_activated_at: new Date().toISOString(),
        crm_trial_start: new Date().toISOString(),
        crm_trial_end: trialEndsAt.toISOString(),
        // Onboarding
        onboarding_completed: false,
        onboarding_step: 0,
        onboarding_data: {},
      })
      .select('id')
      .single();

    if (tenantError) {
      console.error('Tenant creation failed:', tenantError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // 2. Create tenant member
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'admin',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Member creation failed:', memberError);
      // Non-fatal — use-tenant hook will auto-repair
    }

    // 3. Store name in auth user metadata (full name + parsed first name)
    if (firstName) {
      const parsedFirst = firstName.trim().split(/\s+/)[0] || firstName.trim();
      const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: firstName.trim(), first_name: parsedFirst },
      });
      if (metaError) {
        console.warn('Failed to set name metadata:', metaError.message);
      }
    }

    // 4. Referral attribution (non-blocking)
    if (referralCode) {
      try {
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('id, name, email, status')
          .eq('referral_code', referralCode.toLowerCase())
          .eq('status', 'active')
          .single();

        // Anti-self-referral: skip if ambassador email matches signup email
        if (ambassador && ambassador.email?.toLowerCase() !== user.email?.toLowerCase()) {
          // Update tenant with referral info
          await supabase
            .from('tenants')
            .update({
              referred_by_ambassador_id: ambassador.id,
              referral_code_used: referralCode.toLowerCase(),
              referral_cookie_data: { code: referralCode, signed_up_at: new Date().toISOString() },
            })
            .eq('id', tenant.id);

          // Update existing referral record (from link click) or create one
          const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('ambassador_id', ambassador.id)
            .eq('referral_code_used', referralCode.toLowerCase())
            .is('referred_tenant_id', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existingReferral) {
            await supabase
              .from('referrals')
              .update({
                referred_tenant_id: tenant.id,
                status: 'signed_up',
                signed_up_at: new Date().toISOString(),
              })
              .eq('id', existingReferral.id);
          } else {
            await supabase.from('referrals').insert({
              ambassador_id: ambassador.id,
              referred_tenant_id: tenant.id,
              referral_code_used: referralCode.toLowerCase(),
              attribution_source: 'manual_code',
              status: 'signed_up',
              signed_up_at: new Date().toISOString(),
            });
          }

          // Notify ambassador (non-blocking, fire-and-forget)
          sendReferralSignupEmail({
            ambassadorEmail: ambassador.email,
            ambassadorName: ambassador.name || 'Ambassador',
            referralCode: referralCode.toLowerCase(),
          }).catch(() => {});
        }
      } catch (refErr) {
        console.warn('[Signup] Referral attribution failed (non-fatal):', refErr);
      }
    }

    // 5. Auto-provision dedicated phone number (non-blocking)
    provisionPhoneNumber(tenant.id).catch(err =>
      console.warn('[Signup] Auto-provision phone failed:', err.message)
    );

    // 6. Welcome email is now sent after email confirmation (in /auth/callback)

    // 7. Send Sunny welcome SMS if artist has a phone number (non-blocking)
    const parsedFirst = firstName
      ? firstName.trim().split(/\s+/)[0] || firstName.trim()
      : null;
    const artistPhone = user.phone || (user.user_metadata?.phone as string);
    if (artistPhone) {
      (async () => {
        try {
          const sunnyName = parsedFirst || 'there';
          await sendSMS({
            to: artistPhone,
            body: `Hey ${sunnyName}! 👋 I'm Sunny, your AI assistant in Sunstone Studio. Anytime you have a question about welding, pricing, or running your business — just open the app and ask me. I'm here to help! - Sunny`,
            tenantId: tenant.id,
            skipConsentCheck: true,
          });
          console.log(`[Signup] Sunny welcome SMS sent to ${artistPhone}`);
        } catch (smsErr: any) {
          console.warn('[Signup] Sunny SMS failed (non-fatal):', smsErr.message);
        }
      })();
    }

    return NextResponse.json({ tenantId: tenant.id });
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
