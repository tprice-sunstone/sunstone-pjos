import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { queueWorkflow } from '@/lib/workflows';

// POST: Bulk-enroll clients by tag into a workflow
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
  const tenantId = member.tenant_id;

  const body = await request.json();
  const { workflowId, tagId } = body;

  if (!workflowId || !tagId) {
    return NextResponse.json({ error: 'workflowId and tagId required' }, { status: 400 });
  }

  // Verify workflow exists and belongs to tenant
  const { data: workflow } = await supabase
    .from('workflow_templates')
    .select('id, name, trigger_type')
    .eq('id', workflowId)
    .eq('tenant_id', tenantId)
    .single();

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Find all clients with this tag
  const { data: assignments } = await supabase
    .from('client_tag_assignments')
    .select('client_id')
    .eq('tag_id', tagId);

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ enrolled: 0, message: 'No clients with this tag' });
  }

  const clientIds = assignments.map((a) => a.client_id);

  // Check which clients are already enrolled (have pending queue items for this workflow)
  const { data: existingQueue } = await supabase
    .from('workflow_queue')
    .select('client_id, workflow_step_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .in('client_id', clientIds);

  // Get step IDs for this workflow to check enrollment
  const { data: workflowSteps } = await supabase
    .from('workflow_steps')
    .select('id')
    .eq('workflow_id', workflowId);

  const stepIds = new Set((workflowSteps || []).map((s) => s.id));
  const alreadyEnrolled = new Set(
    (existingQueue || [])
      .filter((q) => stepIds.has(q.workflow_step_id))
      .map((q) => q.client_id)
  );

  // Enroll clients not already enrolled
  let enrolled = 0;
  for (const clientId of clientIds) {
    if (alreadyEnrolled.has(clientId)) continue;
    try {
      await queueWorkflow(tenantId, clientId, workflow.trigger_type);
      enrolled++;
    } catch {
      // Continue with other clients
    }
  }

  return NextResponse.json({ enrolled, total: clientIds.length, skipped: clientIds.length - enrolled });
}

// GET: Preview count of clients with a given tag
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tagId = request.nextUrl.searchParams.get('tagId');
  if (!tagId) return NextResponse.json({ error: 'tagId required' }, { status: 400 });

  const { count } = await supabase
    .from('client_tag_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('tag_id', tagId);

  return NextResponse.json({ count: count || 0 });
}
