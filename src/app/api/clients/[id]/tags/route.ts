import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { queueWorkflow } from '@/lib/workflows';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('client_tag_assignments')
    .select('id, assigned_at, tag:client_tags(*)')
    .eq('client_id', clientId);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tag_id } = await request.json();
  if (!tag_id) return NextResponse.json({ error: 'tag_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('client_tag_assignments')
    .insert({ client_id: clientId, tag_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Tag already assigned' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Check for tag_added workflow triggers (non-blocking)
  try {
    // Get the tag name and client's tenant
    const { data: tagRecord } = await supabase.from('client_tags').select('name, tenant_id').eq('id', tag_id).single();
    if (tagRecord) {
      const { data: tagWorkflows } = await supabase
        .from('workflow_templates')
        .select('id, trigger_type, trigger_tag')
        .eq('tenant_id', tagRecord.tenant_id)
        .eq('trigger_type', 'tag_added')
        .eq('trigger_tag', tagRecord.name)
        .eq('is_active', true);

      for (const wf of tagWorkflows || []) {
        queueWorkflow(tagRecord.tenant_id, clientId, 'tag_added', wf.trigger_tag || undefined).catch(() => {});
      }
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tag_id } = await request.json();
  if (!tag_id) return NextResponse.json({ error: 'tag_id required' }, { status: 400 });

  const { error } = await supabase
    .from('client_tag_assignments')
    .delete()
    .eq('client_id', clientId)
    .eq('tag_id', tag_id);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ success: true });
}
