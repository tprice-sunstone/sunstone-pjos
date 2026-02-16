import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, name, tenantName } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Only send if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[SMS Skipped] Would notify ${name} at ${phone}`);
      return NextResponse.json({ sent: false, reason: 'Twilio not configured' });
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      body: `Hi ${name}! You're next at the ${tenantName || 'Sunstone'} booth. Please head over now! 💎`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return NextResponse.json({ sent: true, sid: message.sid });
  } catch (error: any) {
    console.error('SMS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
