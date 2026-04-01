// ============================================================================
// Ambassador Referrals — GET /api/ambassador/referrals
// ============================================================================
// Returns the ambassador's referral list with privacy-safe tenant details.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

/** Privacy-safe name: first word + last initial. e.g. "Golden P." */
function safeName(fullName: string | null): string {
  if (!fullName) return 'Artist';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createServiceRoleClient();

    // Get ambassador record
    const { data: ambassador } = await admin
      .from('ambassadors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!ambassador) {
      return NextResponse.json({ referrals: [], summary: { total: 0, signed_up: 0, converted: 0, churned: 0, expired: 0 } });
    }

    // Get filter from query param
    const statusFilter = request.nextUrl.searchParams.get('status') || 'all';

    // Get all referrals for this ambassador
    let query = admin
      .from('referrals')
      .select('*')
      .eq('ambassador_id', ambassador.id)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: referrals } = await query;
    const allReferrals = referrals || [];

    // Get tenant details for referrals that have a referred_tenant_id
    const tenantIds = allReferrals
      .filter((r) => r.referred_tenant_id)
      .map((r) => r.referred_tenant_id);

    let tenantMap: Record<string, { name: string; subscription_tier: string }> = {};
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin
        .from('tenants')
        .select('id, name, subscription_tier')
        .in('id', tenantIds);

      for (const t of tenants || []) {
        tenantMap[t.id] = { name: t.name, subscription_tier: t.subscription_tier };
      }
    }

    // Calculate months remaining for each referral
    const now = new Date();
    const enrichedReferrals = allReferrals.map((r) => {
      const tenant = r.referred_tenant_id ? tenantMap[r.referred_tenant_id] : null;
      let monthsRemaining: number | null = null;

      if (r.commission_expires_at && r.status === 'converted') {
        const expires = new Date(r.commission_expires_at);
        const diffMs = expires.getTime() - now.getTime();
        monthsRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
      }

      return {
        id: r.id,
        status: r.status,
        signed_up_at: r.signed_up_at,
        converted_at: r.converted_at,
        churned_at: r.churned_at,
        commission_expires_at: r.commission_expires_at,
        total_commission_earned: Number(r.total_commission_earned || 0),
        total_commission_paid: Number(r.total_commission_paid || 0),
        months_remaining: monthsRemaining,
        referred_business_name: tenant ? safeName(tenant.name) : null,
        referred_plan: tenant?.subscription_tier || null,
        referral_code_used: r.referral_code_used || '',
        created_at: r.created_at,
      };
    });

    // Get all referrals (unfiltered) for summary counts
    const { data: allForSummary } = await admin
      .from('referrals')
      .select('status')
      .eq('ambassador_id', ambassador.id);

    const all = allForSummary || [];
    const summary = {
      total: all.length,
      signed_up: all.filter((r) => r.status === 'signed_up').length,
      converted: all.filter((r) => r.status === 'converted').length,
      churned: all.filter((r) => r.status === 'churned').length,
      expired: all.filter((r) => r.status === 'expired').length,
    };

    return NextResponse.json({ referrals: enrichedReferrals, summary });
  } catch (error: any) {
    console.error('[Ambassador Referrals] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
