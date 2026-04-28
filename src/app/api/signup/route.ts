// ============================================================================
// Signup Route — src/app/api/signup/route.ts
// ============================================================================
// Creates tenant + tenant_member using service role (bypasses RLS).
// Sets 30-day Pro trial on new tenants.
// Stores first_name in auth user metadata.
//
// HARDENED: If tenant or tenant_member creation fails, rolls back all prior
// steps (including deleting the auth user) so the user can retry cleanly.
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

    // ── Step 1: Create tenant ────────────────────────────────────────────
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
      console.error('[signup] FAILED at step 1 (tenant creation)', {
        userId,
        email: user.email,
        error: tenantError.message,
        code: tenantError.code,
      });
      // Rollback: delete the orphaned auth user so they can sign up again
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
      if (deleteErr) {
        console.error('[signup] ROLLBACK FAILED — could not delete auth user', {
          userId,
          deleteError: deleteErr.message,
        });
      } else {
        console.log('[signup] Rolled back auth user after tenant creation failure', { userId });
      }
      return NextResponse.json(
        { error: 'Account setup failed — please try signing up again. If this persists, contact support.' },
        { status: 500 }
      );
    }

    // ── Step 2: Create tenant member ─────────────────────────────────────
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'admin',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('[signup] FAILED at step 2 (tenant_members creation)', {
        userId,
        tenantId: tenant.id,
        error: memberError.message,
        code: memberError.code,
      });
      // Rollback: delete tenant, then delete auth user
      const { error: tenantDeleteErr } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);
      if (tenantDeleteErr) {
        console.error('[signup] ROLLBACK FAILED — could not delete tenant', {
          tenantId: tenant.id,
          error: tenantDeleteErr.message,
        });
      }
      const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(userId);
      if (authDeleteErr) {
        console.error('[signup] ROLLBACK FAILED — could not delete auth user', {
          userId,
          error: authDeleteErr.message,
        });
      } else {
        console.log('[signup] Rolled back auth user + tenant after member creation failure', {
          userId,
          tenantId: tenant.id,
        });
      }
      return NextResponse.json(
        { error: 'Account setup failed — please try signing up again. If this persists, contact support.' },
        { status: 500 }
      );
    }

    // ── Step 3: Store name in auth user metadata (non-fatal) ─────────────
    if (firstName) {
      const parsedFirst = firstName.trim().split(/\s+/)[0] || firstName.trim();
      const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: firstName.trim(), first_name: parsedFirst },
      });
      if (metaError) {
        console.warn('[signup] Non-fatal: failed to set name metadata', {
          userId,
          error: metaError.message,
        });
      }
    }

    // ── Step 4: Referral attribution (non-blocking) ──────────────────────
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
        console.warn('[signup] Referral attribution failed (non-fatal):', refErr);
      }
    }

    // ── Step 5: Auto-provision dedicated phone number (non-blocking) ─────
    provisionPhoneNumber(tenant.id).catch(err =>
      console.warn('[signup] Auto-provision phone failed:', err.message)
    );

    // 6. Welcome email is now sent after email confirmation (in /auth/callback)

    // ── Step 7: Send Sunny welcome SMS (non-blocking) ────────────────────
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
          console.log(`[signup] Sunny welcome SMS sent to ${artistPhone}`);
        } catch (smsErr: any) {
          console.warn('[signup] Sunny SMS failed (non-fatal):', smsErr.message);
        }
      })();
    }

    return NextResponse.json({ tenantId: tenant.id });
  } catch (error: any) {
    console.error('[signup] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during signup. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
