import { createServiceRoleClient } from '@/lib/supabase/server';
import { renderTemplate, SAMPLE_VARIABLES } from '@/lib/templates';

// Default workflow definitions — seeded per tenant on first use
const DEFAULT_WORKFLOWS = [
  {
    name: 'Event Follow-Up Sequence',
    trigger_type: 'event_purchase',
    steps: [
      { step_order: 1, delay_hours: 0, channel: 'sms', template_name: 'Welcome New Client', description: 'Thank you message' },
      { step_order: 2, delay_hours: 24, channel: 'sms', template_name: 'Aftercare', description: 'Aftercare reminder' },
      { step_order: 3, delay_hours: 72, channel: 'sms', template_name: 'Social Media Request', description: 'Instagram tag request' },
      { step_order: 4, delay_hours: 168, channel: 'sms', template_name: 'Review Request + Party Invite', description: 'Review + party invite' },
    ],
  },
  {
    name: 'Private Party Follow-Up Sequence',
    trigger_type: 'private_party_purchase',
    steps: [
      { step_order: 1, delay_hours: 0, channel: 'sms', template_name: 'Welcome New Client', description: 'Thank you message' },
      { step_order: 2, delay_hours: 24, channel: 'sms', template_name: 'Aftercare', description: 'Aftercare reminder' },
      { step_order: 3, delay_hours: 72, channel: 'sms', template_name: 'Social Media Request', description: 'Share your party pics' },
      { step_order: 4, delay_hours: 168, channel: 'sms', template_name: 'Review Request + Party Invite', description: 'Review + refer a friend for their own party' },
    ],
  },
];

/**
 * Seed default workflows for a tenant if they don't have any yet.
 */
async function seedWorkflows(tenantId: string): Promise<void> {
  const supabase = await createServiceRoleClient();

  const { data: existing } = await supabase
    .from('workflow_templates')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (existing && existing.length > 0) return;

  for (const wf of DEFAULT_WORKFLOWS) {
    const { data: workflow } = await supabase
      .from('workflow_templates')
      .insert({
        tenant_id: tenantId,
        name: wf.name,
        trigger_type: wf.trigger_type,
        is_active: true,
      })
      .select('id')
      .single();

    if (workflow) {
      await supabase.from('workflow_steps').insert(
        wf.steps.map((step) => ({
          workflow_id: workflow.id,
          step_order: step.step_order,
          delay_hours: step.delay_hours,
          channel: step.channel,
          template_name: step.template_name,
          description: step.description,
        }))
      );
    }
  }
}

/**
 * Queue workflow steps for a client after a triggering event.
 * Resolves template variables immediately so messages are ready to send.
 */
export async function queueWorkflow(
  tenantId: string,
  clientId: string,
  triggerType: string
): Promise<void> {
  const supabase = await createServiceRoleClient();

  // Seed workflows if needed
  await seedWorkflows(tenantId);

  // Find active workflows for this trigger type
  const { data: workflows } = await supabase
    .from('workflow_templates')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (!workflows || workflows.length === 0) return;

  // Fetch client and tenant info for variable resolution
  const [clientRes, tenantRes] = await Promise.all([
    supabase.from('clients').select('first_name, last_name, email, phone').eq('id', clientId).single(),
    supabase.from('tenants').select('name, phone').eq('id', tenantId).single(),
  ]);

  const client = clientRes.data;
  const tenant = tenantRes.data;
  if (!client || !tenant) return;

  const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'there';
  const variables: Record<string, string> = {
    client_name: clientName,
    business_name: tenant.name || 'our studio',
    business_phone: tenant.phone || '',
  };

  for (const workflow of workflows) {
    // Get steps for this workflow
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflow.id)
      .order('step_order');

    if (!steps) continue;

    // Fetch matching templates for variable resolution
    const { data: templates } = await supabase
      .from('message_templates')
      .select('name, body')
      .eq('tenant_id', tenantId);

    const templateMap: Record<string, string> = {};
    for (const t of templates || []) {
      templateMap[t.name] = t.body;
    }

    const now = new Date();

    for (const step of steps) {
      const scheduledFor = new Date(now.getTime() + step.delay_hours * 60 * 60 * 1000);

      // Resolve template body
      let messageBody = templateMap[step.template_name] || step.template_name;
      // Simple variable substitution
      for (const [key, value] of Object.entries(variables)) {
        messageBody = messageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      await supabase.from('workflow_queue').insert({
        tenant_id: tenantId,
        client_id: clientId,
        workflow_step_id: step.id,
        template_name: step.template_name,
        channel: step.channel,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        message_body: messageBody,
        description: step.description,
      });
    }
  }
}
