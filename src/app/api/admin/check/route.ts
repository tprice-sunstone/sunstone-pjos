// src/app/api/admin/check/route.ts
// Lightweight endpoint to check if the current user is a platform admin.
// Used by the dashboard layout to conditionally show the Admin nav link.
// Returns { isAdmin: true/false, role? }

import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';

export async function GET() {
  try {
    const admin = await verifyPlatformAdmin();
    return NextResponse.json({ isAdmin: true, role: admin.role });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ isAdmin: false });
    }
    console.error('[Admin Check] Unexpected error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
