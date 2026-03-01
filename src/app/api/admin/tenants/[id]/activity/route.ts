// src/app/api/admin/tenants/[id]/activity/route.ts
// GET: Returns tenant-level activity feed for admin dashboard

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface AdminActivityEntry {
  id: string;
  type: 'subscription_change' | 'admin_message' | 'tenant_message' | 'signup' | 'admin_note';
  date: string;
  summary: string;
  details?: string;
  metadata?: {
    channel?: string;
    count?: number;
    source?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyPlatformAdmin();
    const { id: tenantId } = await params;
    const serviceClient = await createServiceRoleClient();

    const [tenantRes, adminMessagesRes, clientMessagesRes, adminNotesRes] = await Promise.all([
      serviceClient
        .from('tenants')
        .select('name, subscription_tier, subscription_status, trial_ends_at, created_at')
        .eq('id', tenantId)
        .single(),

      serviceClient
        .from('message_log')
        .select('id, created_at, channel, body, source')
        .eq('tenant_id', tenantId)
        .eq('source', 'admin_broadcast')
        .order('created_at', { ascending: false })
        .limit(20),

      serviceClient
        .from('message_log')
        .select('id, created_at, channel, source')
        .eq('tenant_id', tenantId)
        .neq('source', 'admin_broadcast')
        .order('created_at', { ascending: false })
        .limit(200),

      serviceClient
        .from('admin_notes')
        .select('id, created_at, body')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ]);

    const entries: AdminActivityEntry[] = [];
    const tenant = tenantRes.data;

    if (tenant) {
      // Signup
      entries.push({
        id: 'signup',
        type: 'signup',
        date: tenant.created_at,
        summary: 'Account created',
      });

      // Current subscription state
      const tierLabel = tenant.subscription_tier === 'starter' ? 'Free' :
        tenant.subscription_tier.charAt(0).toUpperCase() + tenant.subscription_tier.slice(1);
      const statusLabel = tenant.subscription_status === 'trialing' ? 'Trial' :
        tenant.subscription_status === 'active' ? 'Active' :
        tenant.subscription_status === 'past_due' ? 'Past Due' : tenant.subscription_status || 'Unknown';
      entries.push({
        id: 'subscription',
        type: 'subscription_change',
        date: tenant.created_at,
        summary: `${tierLabel} plan — ${statusLabel}`,
      });
    }

    // Admin messages
    for (const msg of adminMessagesRes.data || []) {
      entries.push({
        id: `admin-msg-${msg.id}`,
        type: 'admin_message',
        date: msg.created_at,
        summary: `Admin ${msg.channel === 'sms' ? 'SMS' : 'email'} sent`,
        details: msg.body,
        metadata: { channel: msg.channel, source: msg.source },
      });
    }

    // Group client messages by day
    const msgsByDay = new Map<string, number>();
    for (const msg of clientMessagesRes.data || []) {
      const day = msg.created_at.split('T')[0];
      msgsByDay.set(day, (msgsByDay.get(day) || 0) + 1);
    }
    for (const [day, count] of msgsByDay.entries()) {
      entries.push({
        id: `tenant-msgs-${day}`,
        type: 'tenant_message',
        date: `${day}T23:59:59Z`,
        summary: `Sent ${count} client message${count !== 1 ? 's' : ''}`,
        metadata: { count },
      });
    }

    // Admin notes
    for (const note of adminNotesRes.data || []) {
      entries.push({
        id: `admin-note-${note.id}`,
        type: 'admin_note',
        date: note.created_at,
        summary: note.body,
        details: note.body,
      });
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ entries });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[Admin Activity Error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
