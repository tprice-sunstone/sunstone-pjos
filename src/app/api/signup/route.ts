// ============================================================================
// Signup Route — src/app/api/signup/route.ts
// ============================================================================
// Creates tenant + tenant_member using service role (bypasses RLS).
// Sets 60-day Pro trial on new tenants.
// Stores first_name in auth user metadata.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, businessName, firstName } = await request.json();

    if (!userId || !businessName) {
      return NextResponse.json(
        { error: 'Missing userId or businessName' },
        { status: 400 }
      );
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

    // Calculate trial end date (60 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 60);

    // 1. Create tenant with 60-day Pro trial
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        slug,
        owner_id: userId,
        // Subscription: 60-day Pro trial
        subscription_tier: 'pro',
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        platform_fee_percent: 1.5,
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
        { error: tenantError.message },
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

    // 3. Store first_name in auth user metadata
    if (firstName) {
      const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { first_name: firstName },
      });
      if (metaError) {
        console.warn('Failed to set first_name metadata:', metaError.message);
      }
    }

    return NextResponse.json({ tenantId: tenant.id });
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
