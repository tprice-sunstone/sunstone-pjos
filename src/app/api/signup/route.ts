// ============================================================================
// Signup Route — src/app/api/signup/route.ts
// ============================================================================
// Creates tenant + tenant_member using service role (bypasses RLS).
// Sets 30-day Pro trial on new tenants.
// Stores first_name in auth user metadata.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { provisionPhoneNumber, sendSMS } from '@/lib/twilio';
import { sendReferralSignupEmail } from '@/lib/ambassador-emails';
import { sendOnboardingEmail } from '@/lib/emails/onboarding-emails';

const RATE_LIMIT = { prefix: 'signup', limit: 5, windowSeconds: 300 };

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (5 signups per 5 minutes)
    const ip = getClientIP(request);
    const rl = checkRateLimit(ip, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { userId, businessName, firstName, referralCode } = await request.json();

    if (!userId || !businessName) {
      return NextResponse.json(
        { error: 'Missing userId or businessName' },
        { status: 400 }
      );
    }

    // ── Verify caller identity — userId must match the authenticated user ──
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client — bypasses RLS entirely
    const supabase = await createServiceRoleClient();

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

    // 6. Send welcome onboarding email immediately (non-blocking)
    const parsedFirst = firstName
      ? firstName.trim().split(/\s+/)[0] || firstName.trim()
      : null;
    const ownerEmail = user.email;

    if (ownerEmail) {
      (async () => {
        try {
          await sendOnboardingEmail(
            {
              businessName,
              ownerEmail,
              ownerFirstName: parsedFirst,
              tenantCreatedAt: new Date(),
            },
            'welcome'
          );
          // Mark as sent so cron doesn't re-send
          await supabase
            .from('tenants')
            .update({ onboarding_welcome_sent_at: new Date().toISOString() })
            .eq('id', tenant.id);
          console.log(`[Signup] Welcome email sent to ${ownerEmail}`);
        } catch (emailErr: any) {
          console.warn('[Signup] Welcome email failed (non-fatal):', emailErr.message);
        }
      })();
    }

    // 7. Send Sunny welcome SMS if artist has a phone number (non-blocking)
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
