// src/app/api/admin/team/[id]/route.ts
// PATCH: Change a team member's role
// DELETE: Remove a team member

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole, AdminAuthError, VALID_ROLES } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminRole('super_admin');
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Cannot change own role
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Check target exists
    const { data: target } = await serviceClient
      .from('platform_admins')
      .select('user_id, role')
      .eq('user_id', id)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // If demoting from super_admin, ensure at least one remains
    if (target.role === 'super_admin' && role !== 'super_admin') {
      const { count } = await serviceClient
        .from('platform_admins')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last super admin' },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await serviceClient
      .from('platform_admins')
      .update({ role })
      .eq('user_id', id);

    if (updateError) {
      console.error('[Team PATCH] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Team PATCH] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminRole('super_admin');
    const { id } = await params;

    // Cannot remove self
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Check target exists and get role
    const { data: target } = await serviceClient
      .from('platform_admins')
      .select('user_id, role')
      .eq('user_id', id)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // If target is super_admin, ensure at least one remains
    if (target.role === 'super_admin') {
      const { count } = await serviceClient
        .from('platform_admins')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last super admin' },
          { status: 400 }
        );
      }
    }

    const { error: deleteError } = await serviceClient
      .from('platform_admins')
      .delete()
      .eq('user_id', id);

    if (deleteError) {
      console.error('[Team DELETE] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Team DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
