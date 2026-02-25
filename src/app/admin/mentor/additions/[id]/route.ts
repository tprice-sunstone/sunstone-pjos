// src/app/api/admin/mentor/additions/[id]/route.ts
// PATCH: Edit or deactivate an addition
// Admin-only

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyPlatformAdmin();
    const { id } = await params;
    const body = await request.json();
    const serviceClient = await createServiceRoleClient();

    const updates: Record<string, any> = {};

    if (body.answer !== undefined) updates.answer = body.answer;
    if (body.question !== undefined) updates.question = body.question;
    if (body.category !== undefined) updates.category = body.category;
    if (body.keywords !== undefined) updates.keywords = body.keywords;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('mentor_knowledge_additions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Mentor Additions] Update error:', error);
      return NextResponse.json({ error: 'Failed to update addition' }, { status: 500 });
    }

    return NextResponse.json({ addition: data });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}