// ============================================================================
// Team Accept API — src/app/api/team/accept/route.ts
// ============================================================================
// POST: Accept pending team invites for the authenticated user.
// Called by use-tenant on login — finds any pending invites matching the
// user's email and marks them accepted (sets user_id + accepted_at).
// Uses service role client to bypass RLS (new users won't have membership yet).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate via user-scoped client
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400 });
    }

    // Use service role to bypass RLS — the user may not be a member yet
    const serviceClient = await createServiceRoleClient();

    // Find pending invites matching this user's email
    const { data: pendingInvites, error: lookupError } = await serviceClient
      .from('tenant_members')
      .select('id, tenant_id, role, invited_email, display_name')
      .ilike('invited_email', userEmail)
      .is('accepted_at', null);

    if (lookupError) {
      console.error('Pending invite lookup error:', lookupError);
      return NextResponse.json({ error: 'Failed to look up invites' }, { status: 500 });
    }

    if (!pendingInvites || pendingInvites.length === 0) {
      return NextResponse.json({ accepted: [], message: 'No pending invites found' });
    }

    // Accept each pending invite
    const accepted: Array<{ tenant_id: string; role: string }> = [];

    for (const invite of pendingInvites) {
      // Check if user is already a member of this tenant (prevent duplicates)
      const { data: existingMember } = await serviceClient
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', invite.tenant_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        // Already a member — just clean up the pending invite row
        await serviceClient
          .from('tenant_members')
          .delete()
          .eq('id', invite.id);
        continue;
      }

      // Accept the invite: set user_id and accepted_at
      const { error: updateError } = await serviceClient
        .from('tenant_members')
        .update({
          user_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (updateError) {
        console.error(`Failed to accept invite ${invite.id}:`, updateError);
        continue;
      }

      accepted.push({
        tenant_id: invite.tenant_id,
        role: invite.role,
      });
    }

    return NextResponse.json({
      accepted,
      message:
        accepted.length > 0
          ? `Accepted ${accepted.length} invite(s)`
          : 'No new invites to accept',
    });
  } catch (err) {
    console.error('Team accept error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}