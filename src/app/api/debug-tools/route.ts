// TEMPORARY DEBUG ENDPOINT — DELETE AFTER DEBUGGING
// Tests Sunny tool execution directly to find the actual error
// Hit: /api/debug-tools in the browser while logged in

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { executeSunnyTool } from '@/lib/sunny-tools';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  try {
    // 1. Auth
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', detail: authError?.message }, { status: 401 });
    }
    results.user_id = user.id;

    // 2. Get tenant
    const serviceClient = await createServiceRoleClient();
    const { data: membership, error: memberError } = await serviceClient
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (memberError || !membership?.tenant_id) {
      return NextResponse.json({
        error: 'No tenant found',
        detail: memberError?.message,
        user_id: user.id,
      }, { status: 404 });
    }

    const tenantId = membership.tenant_id;
    results.tenant_id = tenantId;

    // 3. Test check_inventory
    const toolCtx = { serviceClient, tenantId, userId: user.id };

    try {
      const inventoryResult = await executeSunnyTool('check_inventory', {}, toolCtx);
      results.check_inventory = inventoryResult;
    } catch (err: any) {
      results.check_inventory = { threw: true, message: err?.message, stack: err?.stack };
    }

    // 4. Test search_clients
    try {
      const clientsResult = await executeSunnyTool('search_clients', { query: 'a' }, toolCtx);
      results.search_clients = clientsResult;
    } catch (err: any) {
      results.search_clients = { threw: true, message: err?.message, stack: err?.stack };
    }

    // 5. Test list_events
    try {
      const eventsResult = await executeSunnyTool('list_events', {}, toolCtx);
      results.list_events = eventsResult;
    } catch (err: any) {
      results.list_events = { threw: true, message: err?.message, stack: err?.stack };
    }

    // 6. Test get_revenue_report
    try {
      const revenueResult = await executeSunnyTool('get_revenue_report', { period: 'month' }, toolCtx);
      results.get_revenue_report = revenueResult;
    } catch (err: any) {
      results.get_revenue_report = { threw: true, message: err?.message, stack: err?.stack };
    }

    // 7. Test get_settings
    try {
      const settingsResult = await executeSunnyTool('get_settings', {}, toolCtx);
      results.get_settings = settingsResult;
    } catch (err: any) {
      results.get_settings = { threw: true, message: err?.message, stack: err?.stack };
    }

    // 8. Test get_client_stats
    try {
      const statsResult = await executeSunnyTool('get_client_stats', {}, toolCtx);
      results.get_client_stats = statsResult;
    } catch (err: any) {
      results.get_client_stats = { threw: true, message: err?.message, stack: err?.stack };
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: err?.message,
      stack: err?.stack,
      partial_results: results,
    }, { status: 500 });
  }
}
