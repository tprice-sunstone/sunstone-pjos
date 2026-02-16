// ============================================================================
// Team API — src/app/api/team/route.ts
// ============================================================================
// GET:    List team members for current tenant (any member can view)
// DELETE: Remove a team member (admin only, cannot remove owner)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { hasPermission, type TenantRole } from '@/lib/permissions';

export async function GET() {
  try {
    // Authenticate via user-scoped client
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role to bypass RLS for membership lookup
    const serviceClient = await createServiceRoleClient();

    // Get caller's tenant
    const { data: callerMember } = await serviceClient
      .from('tenant_members')
      .select('tenant_id, tenants(owner_id)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!callerMember) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    const tenantId = callerMember.tenant_id;
    const ownerId = (callerMember as any).tenants?.owner_id;

    // Fetch all members for this tenant
    const { data: members, error: fetchError } = await serviceClient
      .from('tenant_members')
      .select('id, tenant_id, user_id, role, display_name, invited_email, accepted_at, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Fetch members error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    // Mark which one is the owner
    const enrichedMembers = (members || []).map((m) => ({
      ...m,
      is_owner: m.user_id === ownerId,
      is_pending: !m.accepted_at,
    }));

    return NextResponse.json({ members: enrichedMembers });
  } catch (err) {
    console.error('Team list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate via user-scoped client
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role to bypass RLS
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

    // Parse member ID to remove
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('id');
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Fetch the target member
    const { data: targetMember } = await serviceClient
      .from('tenant_members')
      .select('id, user_id, tenant_id')
      .eq('id', memberId)
      .eq('tenant_id', callerMember.tenant_id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the owner
    if (targetMember.user_id === tenant.owner_id) {
      return NextResponse.json({ error: 'Cannot remove the tenant owner' }, { status: 403 });
    }

    // Cannot remove yourself
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Delete the member
    const { error: deleteError } = await serviceClient
      .from('tenant_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Delete member error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Team delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}