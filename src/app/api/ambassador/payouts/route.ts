// ============================================================================
// Ambassador Payouts — GET /api/ambassador/payouts
// ============================================================================
// Returns the ambassador's payout history and lifetime stats.
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { getPendingCommissions } from '@/lib/commission-engine';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createServiceRoleClient();

    const { data: ambassador } = await admin
      .from('ambassadors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!ambassador) {
      return NextResponse.json({
        payouts: [],
        lifetime: { total_paid: 0, total_pending: 0, next_payout_date: '' },
      });
    }

    // Get all payouts
    const { data: payouts } = await admin
      .from('ambassador_payouts')
      .select('id, amount, commission_count, status, scheduled_for, processed_at, created_at')
      .eq('ambassador_id', ambassador.id)
      .order('created_at', { ascending: false });

    // Calculate lifetime stats
    const allPayouts = payouts || [];
    const totalPaid = allPayouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pending = await getPendingCommissions(ambassador.id);

    // Next payout date (15th of current or next month)
    const now = new Date();
    let nextPayoutDate: string;
    if (now.getDate() < 15) {
      const d = new Date(now.getFullYear(), now.getMonth(), 15);
      nextPayoutDate = d.toISOString().split('T')[0];
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      nextPayoutDate = d.toISOString().split('T')[0];
    }

    return NextResponse.json({
      payouts: allPayouts.map((p) => ({
        id: p.id,
        total_amount: Number(p.amount),
        commission_count: p.commission_count,
        status: p.status,
        scheduled_for: p.scheduled_for,
        processed_at: p.processed_at,
        created_at: p.created_at,
      })),
      lifetime: {
        total_paid: totalPaid,
        total_pending: pending.total,
        next_payout_date: nextPayoutDate,
      },
    });
  } catch (error: any) {
    console.error('[Ambassador Payouts] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
