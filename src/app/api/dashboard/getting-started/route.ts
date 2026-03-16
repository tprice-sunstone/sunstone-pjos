import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/dashboard/getting-started
// Actions: "dismiss" | "mark_theme_done"
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await createServiceRoleClient();

    const { data: membership } = await db
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No tenant' }, { status: 404 });
    }

    const tenantId = membership.tenant_id;
    const { action } = await request.json();

    // Fetch current onboarding_data
    const { data: tenant } = await db
      .from('tenants')
      .select('onboarding_data')
      .eq('id', tenantId)
      .single();

    const onboardingData = (tenant?.onboarding_data as Record<string, any>) || {};

    if (action === 'dismiss') {
      await db
        .from('tenants')
        .update({
          onboarding_data: { ...onboardingData, getting_started_dismissed: true },
        })
        .eq('id', tenantId);

      return NextResponse.json({ ok: true });
    }

    if (action === 'mark_theme_done') {
      await db
        .from('tenants')
        .update({
          onboarding_data: { ...onboardingData, theme_customized: true },
        })
        .eq('id', tenantId);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Getting started API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
