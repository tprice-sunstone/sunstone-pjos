// src/app/api/admin/team/route.ts
// GET: List all platform admins with email + role
// POST: Invite a new admin (must already have an account)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole, AdminAuthError, VALID_ROLES } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = await verifyAdminRole('super_admin');
    const serviceClient = await createServiceRoleClient();

    const { data: admins, error } = await serviceClient
      .from('platform_admins')
      .select('user_id, role, invited_by, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Team GET] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    // Resolve user_ids and invited_by to emails
    const allUserIds = new Set<string>();
    for (const a of admins || []) {
      allUserIds.add(a.user_id);
      if (a.invited_by) allUserIds.add(a.invited_by);
    }

    const emailMap: Record<string, string> = {};
    // Fetch in batches (listUsers paginates, but we likely have few admins)
    const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users) {
      if (allUserIds.has(u.id)) {
        emailMap[u.id] = u.email || '';
      }
    }

    const members = (admins || []).map(a => ({
      id: a.user_id,
      email: emailMap[a.user_id] || 'Unknown',
      role: a.role,
      invited_by: a.invited_by ? (emailMap[a.invited_by] || 'Unknown') : null,
      created_at: a.created_at,
      is_self: a.user_id === admin.id,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Team GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminRole('super_admin');
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Cannot invite as super_admin
    const invitableRoles = VALID_ROLES.filter(r => r !== 'super_admin');
    if (!invitableRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${invitableRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Find user by email
    const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found. They must create an account first.' },
        { status: 400 }
      );
    }

    // Check not already an admin
    const { data: existing } = await serviceClient
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', targetUser.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This user is already a platform admin' },
        { status: 409 }
      );
    }

    // Insert
    const { error: insertError } = await serviceClient
      .from('platform_admins')
      .insert({
        user_id: targetUser.id,
        role,
        invited_by: admin.id,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Team POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to invite admin' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: {
        id: targetUser.id,
        email: targetUser.email,
        role,
        invited_by: admin.email,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Team POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
