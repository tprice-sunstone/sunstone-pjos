// src/app/api/admin/mentor/additions/route.ts
// GET: List active knowledge additions
// POST: Create new addition (from gap approval or manual)
// Admin-only

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    await verifyPlatformAdmin();
    const serviceClient = await createServiceRoleClient();

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') !== 'false';

    let query = serviceClient
      .from('mentor_knowledge_additions')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: additions, error } = await query;

    if (error) {
      console.error('[Admin Mentor Additions] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch additions' }, { status: 500 });
    }

    return NextResponse.json({ additions: additions || [] });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyPlatformAdmin();
    const serviceClient = await createServiceRoleClient();
    const body = await request.json();

    const { category, question, answer, keywords, source_gap_id } = body as {
      category: string;
      question: string;
      answer: string;
      keywords?: string[];
      source_gap_id?: string;
    };

    if (!category || !question || !answer) {
      return NextResponse.json({ error: 'Category, question, and answer are required' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('mentor_knowledge_additions')
      .insert({
        category,
        question: question.trim(),
        answer: answer.trim(),
        keywords: keywords || [],
        source_gap_id: source_gap_id || null,
        created_by: admin.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Mentor Additions] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create addition' }, { status: 500 });
    }

    // If this came from a gap, mark the gap as approved
    if (source_gap_id) {
      await serviceClient
        .from('mentor_knowledge_gaps')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.id,
        })
        .eq('id', source_gap_id);
    }

    return NextResponse.json({ addition: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Mentor Additions] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}