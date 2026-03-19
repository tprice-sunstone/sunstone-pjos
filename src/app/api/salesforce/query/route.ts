// TEMPORARY DEBUG ENDPOINT — DELETE AFTER TESTING
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sfQuery } from '@/lib/salesforce';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin/owner check
    const serviceClient = await createServiceRoleClient();
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('owner_id')
      .eq('id', member.tenant_id)
      .single();

    if (member.role !== 'admin' && tenant?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const soql = request.nextUrl.searchParams.get('soql');
    if (!soql) {
      return NextResponse.json({ error: 'Missing ?soql= parameter' }, { status: 400 });
    }

    const records = await sfQuery(soql);
    return NextResponse.json({ count: records.length, records });
  } catch (err: any) {
    console.error('[SF Query Debug]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
