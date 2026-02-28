import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { queueEntryId, tenantId } = await request.json();

    if (!queueEntryId || !tenantId) {
      return NextResponse.json(
        { error: 'queueEntryId and tenantId are required' },
        { status: 400 }
      );
    }

    // Look up the queue entry
    const { data: entry, error: entryErr } = await supabaseAdmin
      .from('queue_entries')
      .select('id, name, phone, sms_consent, event_id, created_at')
      .eq('id', queueEntryId)
      .single();

    if (entryErr || !entry) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    // Skip if no SMS consent or no phone
    if (!entry.sms_consent) {
      return NextResponse.json({ sent: false, reason: 'no_sms_consent' });
    }
    if (!entry.phone) {
      return NextResponse.json({ sent: false, reason: 'no_phone' });
    }

    // Calculate position: count waiting entries ahead of this one
    let positionQuery = supabaseAdmin
      .from('queue_entries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'waiting')
      .lt('created_at', entry.created_at);

    if (entry.event_id) {
      positionQuery = positionQuery.eq('event_id', entry.event_id);
    } else {
      positionQuery = positionQuery.is('event_id', null);
    }

    const { count } = await positionQuery;
    const position = (count || 0) + 1; // +1 because they are after the ones ahead

    // Get tenant's avg_service_minutes
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, avg_service_minutes')
      .eq('id', tenantId)
      .single();

    const avgMinutes = tenant?.avg_service_minutes || 10;
    const estimatedWait = position * avgMinutes;
    const firstName = entry.name.split(' ')[0];

    // Build message
    let message: string;
    if (position === 1) {
      message = `Hi ${firstName}! You're checked in and next up! We'll text you the moment we're ready for you.`;
    } else {
      message = `Hi ${firstName}! You're checked in and #${position} in line. Estimated wait: about ${estimatedWait} minutes. We'll text you when it's your turn!`;
    }

    // Only send if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[SMS Skipped] Would send position SMS to ${firstName} at ${entry.phone}: ${message}`);
      return NextResponse.json({ sent: false, reason: 'twilio_not_configured', position, estimatedWait });
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: entry.phone,
    });

    return NextResponse.json({
      sent: true,
      sid: result.sid,
      position,
      estimatedWait,
    });
  } catch (error: any) {
    console.error('Position SMS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
