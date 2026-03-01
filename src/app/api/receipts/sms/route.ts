// src/app/api/receipts/sms/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface ReceiptSmsBody {
  to: string;
  tenantName: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  footer?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      return NextResponse.json(
        { sent: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    const body: ReceiptSmsBody = await request.json();

    if (!body.to || !body.tenantName || body.total == null) {
      return NextResponse.json(
        { sent: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paymentLabel: Record<string, string> = {
      card_present: 'Card',
      card_not_present: 'Card (Online)',
      cash: 'Cash',
      venmo: 'Venmo',
      other: 'Other',
    };

    let smsBody = `Receipt from ${body.tenantName}\n${body.itemCount} item${body.itemCount !== 1 ? 's' : ''} — $${body.total.toFixed(2)}\nPaid with ${paymentLabel[body.paymentMethod] || body.paymentMethod}\nThank you for your purchase!`;

    if (body.footer) {
      smsBody += `\n${body.footer}`;
    }

    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: body.to,
    });

    return NextResponse.json({ sent: true, sid: message.sid });
  } catch (err: any) {
    console.error('[Receipt SMS Error]', err);
    return NextResponse.json(
      { sent: false, error: err?.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
