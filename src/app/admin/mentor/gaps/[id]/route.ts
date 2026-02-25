// src/app/api/admin/mentor/gaps/[id]/route.ts
// PATCH: Update gap status (approve/dismiss)
// Admin-only

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyPlatformAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status, admin_notes } = body as { status: 'approved' | 'dismissed'; admin_notes?: string };

    if (!['approved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('mentor_knowledge_gaps')
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Mentor Gaps] Update error:', error);
      return NextResponse.json({ error: 'Failed to update gap' }, { status: 500 });
    }

    return NextResponse.json({ gap: data });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Mentor Gaps] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}