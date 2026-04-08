// ============================================================================
// Track Login — POST /api/track-login
// ============================================================================
// Updates last_owner_login_at on the tenant. Called once per browser session
// from the dashboard layout via sessionStorage guard.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated user
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await request.json();
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    // Verify user is a member of this tenant
    const supabase = await createServiceRoleClient();
    const { data: member } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update last login timestamp
    await supabase
      .from('tenants')
      .update({ last_owner_login_at: new Date().toISOString() })
      .eq('id', tenantId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Track Login] Error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
