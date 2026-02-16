// src/app/api/receipts/config/route.ts
import { NextResponse } from 'next/server';

// Returns which receipt channels are available (env vars configured)
// Called once on mount so the UI can hide unavailable options
export async function GET() {
  return NextResponse.json({
    email: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    sms: !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ),
  });
}