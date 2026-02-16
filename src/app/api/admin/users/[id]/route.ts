// src/app/api/admin/users/[id]/route.ts
// POST: User actions (reset-password, ban, unban)
// All actions use Supabase Auth Admin API (requires service role key)

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyPlatformAdmin();
    const { id } = await params;
    const { action } = await request.json();
    const serviceClient = await createServiceRoleClient();

    switch (action) {
      case 'reset-password': {
        // Get user email first
        const { data: { user }, error: getUserError } = await serviceClient.auth.admin.getUserById(id);
        if (getUserError || !user?.email) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { data, error } = await serviceClient.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
        });

        if (error) {
          console.error('Password reset error:', error);
          return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Password reset link generated for ${user.email}`,
          // In production, you'd email this. For now, return the link.
          action_url: data?.properties?.action_link || null,
        });
      }

      case 'ban': {
        const { error } = await serviceClient.auth.admin.updateUserById(id, {
          ban_duration: '876000h', // ~100 years = effectively permanent
        });

        if (error) {
          console.error('Ban user error:', error);
          return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User banned' });
      }

      case 'unban': {
        const { error } = await serviceClient.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        });

        if (error) {
          console.error('Unban user error:', error);
          return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User unbanned' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Admin user action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}