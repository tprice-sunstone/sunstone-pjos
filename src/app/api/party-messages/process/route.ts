// ============================================================================
// Party Message Processor — POST /api/party-messages/process
// ============================================================================
// Finds pending party messages where scheduled_for <= now and sends them.
// Can be called by Vercel Cron or opportunistically from the dashboard.
// ============================================================================

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  // Simple auth: accept cron secret or authenticated user
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Cron-authenticated — proceed
  } else {
    // Fall back to user auth for manual triggers
    const { createServerSupabase } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = await createServiceRoleClient();

  // Find all pending messages that are due
  const { data: dueMessages, error } = await db
    .from('party_scheduled_messages')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error || !dueMessages) {
    return NextResponse.json({ error: 'Failed to fetch due messages' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const msg of dueMessages) {
    try {
      // Verify the party is still active (not cancelled)
      const { data: party } = await db
        .from('party_requests')
        .select('status')
        .eq('id', msg.party_request_id)
        .single();

      if (!party || party.status === 'cancelled') {
        // Cancel this message since the party was cancelled
        await db
          .from('party_scheduled_messages')
          .update({ status: 'cancelled' })
          .eq('id', msg.id);
        continue;
      }

      // Send the message
      await sendSMS({
        to: msg.recipient_phone,
        body: msg.message_body,
        tenantId: msg.tenant_id,
      });

      await db
        .from('party_scheduled_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', msg.id);

      sent++;
    } catch (err) {
      console.error(`[Party Messages] Failed to send ${msg.id}:`, err);

      await db
        .from('party_scheduled_messages')
        .update({ status: 'failed' })
        .eq('id', msg.id);

      failed++;
    }
  }

  return NextResponse.json({
    processed: dueMessages.length,
    sent,
    failed,
    skipped: dueMessages.length - sent - failed,
  });
}
