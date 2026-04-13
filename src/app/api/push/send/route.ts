// ============================================================================
// POST /api/push/send — Send a push notification
// ============================================================================
// Accepts { tenantId, userId?, title, body, data? }.
// - If userId is provided, sends only to that user's active tokens.
// - Otherwise, sends to all active tokens for the tenant.
// Only tenant owners/admins may send. Dead tokens are deactivated.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sendMulticastNotification } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { tenantId, userId, title, body: messageBody, data } = body || {};

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }
    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // Authorization — requester must own or be admin of the target tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, owner_id')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let authorized = tenant.owner_id === user.id;
    if (!authorized) {
      const { data: member } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .limit(1)
        .single();
      authorized = member?.role === 'admin';
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Look up active tokens via service role (needs to see tokens across users)
    const admin = await createServiceRoleClient();
    let query = admin
      .from('push_device_tokens')
      .select('token')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (userId) query = query.eq('user_id', userId);

    const { data: tokenRows, error: tokenErr } = await query;
    if (tokenErr) {
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    const tokens = (tokenRows || []).map((r: { token: string }) => r.token);
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, successCount: 0, failureCount: 0 });
    }

    const result = await sendMulticastNotification({
      tokens,
      title,
      body: messageBody,
      data,
    });

    // Deactivate dead tokens
    const deadTokens = result.results
      .filter((r) => r.errorCode === 'messaging/registration-token-not-registered')
      .map((r) => r.token);

    if (deadTokens.length > 0) {
      await admin
        .from('push_device_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('token', deadTokens);
    }

    return NextResponse.json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (err: any) {
    console.error('[push/send] Error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
