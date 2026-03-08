import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const tenantId = member.tenant_id;

  const { data: broadcast, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('Broadcast GET error:', error);
    return NextResponse.json({ error: 'Failed to load broadcast' }, { status: 500 });
  }
  if (!broadcast) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get message log
  const { data: messages } = await supabase
    .from('broadcast_messages')
    .select('*')
    .eq('broadcast_id', id)
    .order('created_at');

  return NextResponse.json({ ...broadcast, messages: messages || [] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const tenantId = member.tenant_id;

  const { error } = await supabase
    .from('broadcasts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Broadcast DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
