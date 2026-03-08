// ============================================================================
// Auth Reset Password API — POST /api/auth/reset-password
// ============================================================================
// Server-side password reset with IP-based rate limiting.
// 3 attempts per 15 minutes per IP address.
// ALWAYS returns 200 success to prevent email enumeration.
// ============================================================================

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const RESET_LIMIT = { prefix: 'auth-reset', limit: 3, windowSeconds: 900 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(ip, RESET_LIMIT);

  // Silently drop if rate limited — still return success to prevent enumeration
  if (!rl.allowed) {
    return NextResponse.json({ success: true });
  }

  let email: string;
  try {
    const body = await request.json();
    email = body.email;
  } catch {
    return NextResponse.json({ success: true });
  }

  if (!email) {
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = await createServerSupabase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sunstonepj.app';

    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${appUrl}/auth/update-password`,
    });
  } catch {
    // Swallow errors — always return success
  }

  return NextResponse.json({ success: true });
}
