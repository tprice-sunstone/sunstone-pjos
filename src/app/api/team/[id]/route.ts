// ============================================================================
// Team Member API — src/app/api/team/[id]/route.ts
// ============================================================================
// PATCH: Update a team member's role (admin only, cannot demote owner)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { hasPermission, type TenantRole } from '@/lib/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    // Authenticate via user-scoped client
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role to bypass RLS for membership lookup
    const serviceClient = await createServiceRoleClient();

    // Get caller's membership and tenant
    const { data: callerMember } = await serviceClient
      .from('tenant_members')
      .select('*, tenants(owner_id)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!callerMember) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    const tenant = (callerMember as any).tenants;
    const isOwner = tenant.owner_id === user.id;
    const callerRole = isOwner ? 'admin' : (callerMember.role as TenantRole);

    if (!isOwner && !hasPermission(callerRole, 'team:manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { role } = body as { role: TenantRole };

    if (!role || !['admin', 'manager', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch target member
    const { data: targetMember } = await serviceClient
      .from('tenant_members')
      .select('id, user_id, tenant_id, role')
      .eq('id', memberId)
      .eq('tenant_id', callerMember.tenant_id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change the owner's role
    if (targetMember.user_id === tenant.owner_id) {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 403 });
    }

    // Cannot change your own role
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Update role
    const { error: updateError } = await serviceClient
      .from('tenant_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      console.error('Update role error:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error('Team member update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}