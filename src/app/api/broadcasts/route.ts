import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    tenant_id, name, channel, template_id,
    custom_subject, custom_body,
    target_type, target_id, target_name,
  } = body;

  if (!tenant_id || !name || !channel || !target_type) {
    return NextResponse.json({ error: 'tenant_id, name, channel, and target_type are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('broadcasts')
    .insert({
      tenant_id,
      name: name.trim(),
      channel,
      template_id: template_id || null,
      custom_subject: custom_subject || null,
      custom_body: custom_body || null,
      target_type,
      target_id: target_id || null,
      target_name: target_name || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
