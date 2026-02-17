// src/app/api/admin/check/route.ts
// Lightweight endpoint to check if the current user is a platform admin.
// Used by the dashboard layout to conditionally show the Admin nav link.
// Returns { isAdmin: true/false }

import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';

export async function GET() {
  try {
    await verifyPlatformAdmin();
    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      // Not admin or not authenticated — both are fine, just return false
      return NextResponse.json({ isAdmin: false });
    }
    // Unexpected error
    console.error('[Admin Check] Unexpected error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}