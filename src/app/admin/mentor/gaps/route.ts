// src/app/api/admin/mentor/gaps/route.ts
// GET: List knowledge gaps with filtering
// Admin-only — uses verifyPlatformAdmin()

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyPlatformAdmin();
    const serviceClient = await createServiceRoleClient();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = serviceClient
      .from('mentor_knowledge_gaps')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: gaps, count, error } = await query;

    if (error) {
      console.error('[Admin Mentor Gaps] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch gaps' }, { status: 500 });
    }

    // Enrich with tenant names
    const tenantIds = [...new Set((gaps || []).map(g => g.tenant_id).filter(Boolean))];
    let tenantMap: Record<string, string> = {};

    if (tenantIds.length > 0) {
      const { data: tenants } = await serviceClient
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);

      tenantMap = (tenants || []).reduce((acc: Record<string, string>, t: any) => {
        acc[t.id] = t.name;
        return acc;
      }, {});
    }

    const enrichedGaps = (gaps || []).map(gap => ({
      ...gap,
      tenant_name: gap.tenant_id ? tenantMap[gap.tenant_id] || 'Unknown' : 'Unknown',
    }));

    return NextResponse.json({
      gaps: enrichedGaps,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Mentor Gaps] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}