// src/app/api/demo/credentials/route.ts
// Returns demo credentials when DEMO_RESET_ENABLED=true

import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.DEMO_RESET_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Demo system not enabled' }, { status: 403 });
  }

  return NextResponse.json({
    personas: [
      {
        key: 'newbie',
        email: process.env.DEMO_NEWBIE_EMAIL || '',
        password: process.env.DEMO_NEWBIE_PASSWORD || '',
        tenantId: process.env.NEXT_PUBLIC_DEMO_NEWBIE_TENANT_ID || '',
      },
      {
        key: 'mid',
        email: process.env.DEMO_MID_EMAIL || '',
        password: process.env.DEMO_MID_PASSWORD || '',
        tenantId: process.env.NEXT_PUBLIC_DEMO_MID_TENANT_ID || '',
      },
      {
        key: 'pro',
        email: process.env.DEMO_PRO_EMAIL || '',
        password: process.env.DEMO_PRO_PASSWORD || '',
        tenantId: process.env.NEXT_PUBLIC_DEMO_PRO_TENANT_ID || '',
      },
    ],
  });
}
