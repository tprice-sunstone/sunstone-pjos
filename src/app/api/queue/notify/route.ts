import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, tenantName, tenantId, smsConsent } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Check SMS consent — if explicitly false, skip sending
    if (smsConsent === false) {
      console.log(`[SMS Skipped] ${name} did not consent to SMS`);
      return NextResponse.json({ sent: false, reason: 'no_sms_consent' });
    }

    // Only send if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[SMS Skipped] Would notify ${name} at ${phone}`);
      return NextResponse.json({ sent: false, reason: 'Twilio not configured' });
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      body: `Hi ${name}! You're next at the ${tenantName || 'Sunstone'} booth. Please head over now!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    // Log to message_log (fire-and-forget)
    if (tenantId) {
      import('@/lib/supabase/server').then(({ createServiceRoleClient }) =>
        createServiceRoleClient().then(svc =>
          svc.from('message_log').insert({
            tenant_id: tenantId,
            direction: 'outbound',
            channel: 'sms',
            recipient_phone: phone,
            body: `Hi ${name}! You're next at the ${tenantName || 'Sunstone'} booth. Please head over now!`,
            source: 'queue_notify',
            status: 'sent',
          })
        )
      ).catch(() => {});
    }

    return NextResponse.json({ sent: true, sid: message.sid });
  } catch (error: any) {
    console.error('SMS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
