// ============================================================================
// POST /api/push/register — Register a device push token
// ============================================================================
// Called by the Capacitor client after successful push registration.
// Upserts (token) so if the same device re-registers, user/tenant/platform
// are updated and is_active is reset to true.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token, platform } = body || {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Get user's tenant (via membership)
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .limit(1)
      .single();

    let tenantId: string | null = member?.tenant_id ?? null;

    // Fallback: owned tenant
    if (!tenantId) {
      const { data: owned } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();
      tenantId = owned?.id ?? null;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    // Use service role for upsert to avoid RLS edge cases when the token
    // previously belonged to a different user (e.g. shared device).
    const admin = await createServiceRoleClient();
    const { error: upsertError } = await admin
      .from('push_device_tokens')
      .upsert(
        {
          tenant_id: tenantId,
          user_id: user.id,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (upsertError) {
      console.error('[push/register] Upsert failed:', upsertError.message);
      return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[push/register] Error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
