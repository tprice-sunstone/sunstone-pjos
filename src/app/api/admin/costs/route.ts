// ============================================================================
// Admin Costs API — src/app/api/admin/costs/route.ts
// ============================================================================
// GET: Aggregated platform API cost data for the admin dashboard.
// Auth: admin role required (same as revenue page).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminRole('admin');

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date cutoff
    let cutoff: string | null = null;
    if (range !== 'all') {
      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      const d = new Date();
      d.setDate(d.getDate() - days);
      cutoff = d.toISOString();
    }

    const serviceClient = await createServiceRoleClient();

    // Build base query filter
    let baseQuery = serviceClient.from('platform_costs').select('*');
    if (cutoff) {
      baseQuery = baseQuery.gte('created_at', cutoff);
    }

    const { data: rows, error } = await baseQuery.order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Costs] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
    }

    const costs = rows || [];

    // ── Total cost ────────────────────────────────────────────────────────
    const totalCost = costs.reduce((s, r) => s + Number(r.estimated_cost), 0);

    // ── By service ────────────────────────────────────────────────────────
    const byService: Record<string, number> = { anthropic: 0, twilio: 0, resend: 0 };
    for (const r of costs) {
      byService[r.service] = (byService[r.service] || 0) + Number(r.estimated_cost);
    }

    // ── Daily breakdown ───────────────────────────────────────────────────
    const dailyMap: Record<string, { anthropic: number; twilio: number; resend: number }> = {};
    for (const r of costs) {
      const date = r.created_at.substring(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { anthropic: 0, twilio: 0, resend: 0 };
      dailyMap[date][r.service as 'anthropic' | 'twilio' | 'resend'] += Number(r.estimated_cost);
    }
    const daily = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    // ── By tenant ─────────────────────────────────────────────────────────
    const tenantMap: Record<string, { anthropic: number; twilio: number; resend: number; total: number }> = {};
    for (const r of costs) {
      const tid = r.tenant_id || '__platform__';
      if (!tenantMap[tid]) tenantMap[tid] = { anthropic: 0, twilio: 0, resend: 0, total: 0 };
      tenantMap[tid][r.service as 'anthropic' | 'twilio' | 'resend'] += Number(r.estimated_cost);
      tenantMap[tid].total += Number(r.estimated_cost);
    }

    // Look up tenant names
    const tenantIds = Object.keys(tenantMap).filter(id => id !== '__platform__');
    let tenantNameMap: Record<string, string> = {};
    if (tenantIds.length > 0) {
      const { data: tenants } = await serviceClient
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);
      tenantNameMap = (tenants || []).reduce((acc: Record<string, string>, t: any) => {
        acc[t.id] = t.name;
        return acc;
      }, {});
    }

    const byTenant = Object.entries(tenantMap)
      .map(([tid, data]) => ({
        tenant_id: tid,
        tenant_name: tid === '__platform__' ? 'Platform (no tenant)' : (tenantNameMap[tid] || 'Unknown'),
        ...data,
      }))
      .sort((a, b) => b.total - a.total);

    // ── By operation ──────────────────────────────────────────────────────
    const opMap: Record<string, { count: number; total_cost: number }> = {};
    for (const r of costs) {
      if (!opMap[r.operation]) opMap[r.operation] = { count: 0, total_cost: 0 };
      opMap[r.operation].count += 1;
      opMap[r.operation].total_cost += Number(r.estimated_cost);
    }
    const byOperation = Object.entries(opMap)
      .map(([operation, data]) => ({ operation, ...data }))
      .sort((a, b) => b.total_cost - a.total_cost);

    return NextResponse.json({
      totalCost,
      byService,
      daily,
      byTenant,
      byOperation,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[Admin Costs] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
