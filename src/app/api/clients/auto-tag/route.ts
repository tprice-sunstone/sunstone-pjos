import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { autoTagClient } from '@/lib/auto-tags';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { clientId, type, eventId, eventName } = body;

  if (!clientId || !type) {
    return NextResponse.json({ error: 'clientId and type required' }, { status: 400 });
  }

  // Look up the client to get tenant_id
  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    await autoTagClient(client.tenant_id, clientId, {
      type,
      eventId,
      eventName,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Auto-tag error:', err);
    return NextResponse.json({ error: 'Auto-tag failed' }, { status: 500 });
  }
}
