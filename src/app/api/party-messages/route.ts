// ============================================================================
// Party Messages API — GET + POST /api/party-messages
// ============================================================================
// GET: List messages for a party request (sent + scheduled)
// POST: Send a custom one-off message to the host
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sendSMS, normalizePhone } from '@/lib/twilio';

// ── GET: List party messages ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const partyRequestId = request.nextUrl.searchParams.get('partyRequestId');
  if (!partyRequestId) {
    return NextResponse.json({ error: 'partyRequestId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('party_scheduled_messages')
    .select('*')
    .eq('party_request_id', partyRequestId)
    .order('scheduled_for', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

// ── POST: Send a custom message to the host ─────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!member) return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });

  const { partyRequestId, message } = await request.json();
  if (!partyRequestId || !message) {
    return NextResponse.json({ error: 'partyRequestId and message required' }, { status: 400 });
  }

  const db = await createServiceRoleClient();

  // Fetch party request
  const { data: party } = await db
    .from('party_requests')
    .select('host_name, host_phone, tenant_id')
    .eq('id', partyRequestId)
    .eq('tenant_id', member.tenant_id)
    .single();

  if (!party) {
    return NextResponse.json({ error: 'Party request not found' }, { status: 404 });
  }

  // Send SMS
  if (party.host_phone) {
    await sendSMS({
      to: normalizePhone(party.host_phone),
      body: message,
      tenantId: member.tenant_id,
    });
  }

  // Log the message
  await db.from('party_scheduled_messages').insert({
    tenant_id: member.tenant_id,
    party_request_id: partyRequestId,
    template_name: 'Custom Message',
    recipient_phone: normalizePhone(party.host_phone),
    recipient_name: party.host_name,
    message_body: message,
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: 'sent',
  });

  return NextResponse.json({ success: true });
}
