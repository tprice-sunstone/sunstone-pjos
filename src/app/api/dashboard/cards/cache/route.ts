// ============================================================================
// Dashboard Card Cache — DELETE /api/dashboard/cards/cache
// ============================================================================
// Deletes the tenant's cached dashboard cards so the next GET /api/dashboard/cards
// regenerates them fresh. Auth-gated: resolves tenant from the logged-in user.
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export async function DELETE() {
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
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    await db
      .from('dashboard_card_cache')
      .delete()
      .eq('tenant_id', membership.tenant_id);

    return NextResponse.json({ cleared: true });
  } catch (err: any) {
    console.error('Cache clear failed:', err);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
