// ============================================================================
// Customize Referral Code — POST /api/ambassador/customize-code
// ============================================================================
// Allows an ambassador to set a custom referral code.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { getReferralLink, isValidReferralCode } from '@/lib/ambassador-utils';

const RESERVED_WORDS = [
  'admin', 'api', 'app', 'dashboard', 'join', 'ambassador', 'sunstone',
  'signup', 'login', 'auth', 'settings', 'billing', 'support', 'help',
  'demo', 'test', 'www', 'mail', 'email', 'blog', 'docs',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createServiceRoleClient();

    const { data: ambassador } = await admin
      .from('ambassadors')
      .select('id, referral_code')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!ambassador) {
      return NextResponse.json({ error: 'No active ambassador record' }, { status: 403 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Normalize
    const normalized = code.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    // Validate length
    if (normalized.length < 3 || normalized.length > 50) {
      return NextResponse.json({ error: 'Code must be 3-50 characters' }, { status: 400 });
    }

    // Validate format
    if (!isValidReferralCode(normalized)) {
      return NextResponse.json({ error: 'Code can only contain lowercase letters, numbers, and hyphens' }, { status: 400 });
    }

    // Check reserved words
    if (RESERVED_WORDS.includes(normalized)) {
      return NextResponse.json({ error: 'This code is reserved. Please choose another.' }, { status: 400 });
    }

    // Check if already taken
    const { data: existing } = await admin
      .from('ambassadors')
      .select('id')
      .eq('referral_code', normalized)
      .neq('id', ambassador.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This code is already taken. Please choose another.' }, { status: 409 });
    }

    // Update the code
    await admin
      .from('ambassadors')
      .update({ referral_code: normalized, updated_at: new Date().toISOString() })
      .eq('id', ambassador.id);

    return NextResponse.json({
      success: true,
      code: normalized,
      link: getReferralLink(normalized),
    });
  } catch (error: any) {
    console.error('[Ambassador Customize Code] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
