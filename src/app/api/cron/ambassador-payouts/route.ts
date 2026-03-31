// ============================================================================
// Ambassador Payouts Cron — GET /api/cron/ambassador-payouts
// ============================================================================
// Vercel cron job: runs at 8am UTC on the 14th of each month.
// Processes all pending ambassador commissions and executes Stripe Transfers.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processMonthlyPayouts } from '@/lib/commission-engine';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Ambassador Payouts] Starting monthly payout processing...');

  try {
    const results = await processMonthlyPayouts();

    console.log(
      `[Ambassador Payouts] Complete: ${results.processed} paid, ${results.failed} failed, $${results.totalPaid.toFixed(2)} total`
    );

    if (results.errors.length > 0) {
      console.error('[Ambassador Payouts] Errors:', results.errors);
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error('[Ambassador Payouts] Fatal error:', error);
    return NextResponse.json({ error: 'Payout processing failed' }, { status: 500 });
  }
}
