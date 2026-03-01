// POST /api/clients/[id]/enroll-workflow
// Manually enroll a client in a workflow — creates workflow_queue entries for each step.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: clientId } = await params;
  const { workflowId } = await request.json();
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 });

  // Get tenant
  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .limit(1)
    .single();

  if (!member) return NextResponse.json({ error: 'No tenant' }, { status: 404 });
  const tenantId = member.tenant_id;

  // Validate workflow belongs to this tenant and is active
  const { data: workflow } = await supabase
    .from('workflow_templates')
    .select('id, name, is_active')
    .eq('id', workflowId)
    .eq('tenant_id', tenantId)
    .single();

  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  if (!workflow.is_active) return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 });

  // Check for duplicate enrollment — any pending/ready entries for this client + workflow
  const { data: existingEntries } = await supabase
    .from('workflow_queue')
    .select('id, workflow_step_id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'ready']);

  // Get step IDs for this workflow
  const { data: steps } = await supabase
    .from('workflow_steps')
    .select('id, step_order, delay_hours, channel, template_name, description')
    .eq('workflow_id', workflowId)
    .order('step_order');

  if (!steps || steps.length === 0) {
    return NextResponse.json({ error: 'Workflow has no steps' }, { status: 400 });
  }

  const stepIds = new Set(steps.map(s => s.id));
  const alreadyEnrolled = (existingEntries || []).some(e => stepIds.has(e.workflow_step_id));
  if (alreadyEnrolled) {
    return NextResponse.json({ error: 'Client is already enrolled in this workflow' }, { status: 409 });
  }

  // Fetch client + tenant info for variable resolution
  const [clientRes, tenantRes, templatesRes] = await Promise.all([
    supabase.from('clients').select('first_name, last_name').eq('id', clientId).single(),
    supabase.from('tenants').select('name, phone').eq('id', tenantId).single(),
    supabase.from('message_templates').select('name, body').eq('tenant_id', tenantId),
  ]);

  const client = clientRes.data;
  const tenant = tenantRes.data;
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'there' : 'there';
  const variables: Record<string, string> = {
    client_name: clientName,
    business_name: tenant?.name || 'our studio',
    business_phone: tenant?.phone || '',
  };

  const templateMap: Record<string, string> = {};
  for (const t of templatesRes.data || []) {
    templateMap[t.name] = t.body;
  }

  // Create queue entries for each step
  const now = new Date();
  const queueRows = steps.map(step => {
    const scheduledFor = new Date(now.getTime() + step.delay_hours * 60 * 60 * 1000);
    let messageBody = templateMap[step.template_name] || step.template_name;
    for (const [key, value] of Object.entries(variables)) {
      messageBody = messageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return {
      tenant_id: tenantId,
      client_id: clientId,
      workflow_step_id: step.id,
      template_name: step.template_name,
      channel: step.channel,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
      message_body: messageBody,
      description: step.description,
    };
  });

  const { error: insertError } = await supabase.from('workflow_queue').insert(queueRows);
  if (insertError) {
    console.error('Enroll workflow insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log enrollment as a client note for the activity timeline
  await supabase.from('client_notes').insert({
    tenant_id: tenantId,
    client_id: clientId,
    created_by: user.id,
    body: `Enrolled in ${workflow.name}`,
  });

  return NextResponse.json({
    success: true,
    workflowName: workflow.name,
    stepsCreated: steps.length,
  });
}
