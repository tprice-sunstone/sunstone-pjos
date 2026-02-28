import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// GET: List workflow templates with step counts
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const { data: workflows, error } = await supabase
    .from('workflow_templates')
    .select('*, steps:workflow_steps(id, step_order, delay_hours, channel, template_name, description)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(workflows || []);
}

// POST: Create a new workflow template
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { tenantId, name, trigger_type, steps } = body;

  if (!tenantId || !name || !trigger_type) {
    return NextResponse.json({ error: 'tenantId, name, and trigger_type required' }, { status: 400 });
  }

  // Create workflow
  const { data: workflow, error: wfError } = await supabase
    .from('workflow_templates')
    .insert({ tenant_id: tenantId, name, trigger_type, is_active: true })
    .select('id')
    .single();

  if (wfError || !workflow) {
    return NextResponse.json({ error: wfError?.message || 'Failed to create workflow' }, { status: 500 });
  }

  // Insert steps if provided
  if (steps && Array.isArray(steps) && steps.length > 0) {
    const { error: stepsError } = await supabase.from('workflow_steps').insert(
      steps.map((s: any, i: number) => ({
        workflow_id: workflow.id,
        step_order: i + 1,
        delay_hours: s.delay_hours || 0,
        channel: s.channel || 'sms',
        template_name: s.template_name || '',
        description: s.description || '',
      }))
    );
    if (stepsError) {
      return NextResponse.json({ error: stepsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: workflow.id }, { status: 201 });
}

// PATCH: Update workflow (toggle active, rename, update steps)
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, is_active, name, trigger_type, steps } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Update workflow fields
  const updates: Record<string, any> = {};
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  if (name) updates.name = name;
  if (trigger_type) updates.trigger_type = trigger_type;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('workflow_templates')
      .update(updates)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace steps if provided
  if (steps && Array.isArray(steps)) {
    // Delete existing steps
    await supabase.from('workflow_steps').delete().eq('workflow_id', id);

    // Insert new steps
    if (steps.length > 0) {
      const { error: stepsError } = await supabase.from('workflow_steps').insert(
        steps.map((s: any, i: number) => ({
          workflow_id: id,
          step_order: i + 1,
          delay_hours: s.delay_hours || 0,
          channel: s.channel || 'sms',
          template_name: s.template_name || '',
          description: s.description || '',
        }))
      );
      if (stepsError) {
        return NextResponse.json({ error: stepsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove a workflow template
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('workflow_templates')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
