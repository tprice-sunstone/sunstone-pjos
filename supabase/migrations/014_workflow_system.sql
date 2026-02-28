-- ============================================================================
-- 014: Workflow System — automated follow-up message sequences
-- ============================================================================

-- Workflow templates define the sequence
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,  -- 'event_purchase', 'private_party_purchase', 'new_client', 'repeat_client'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each step in the workflow
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL DEFAULT 0,  -- hours after trigger to queue this step
  channel TEXT NOT NULL DEFAULT 'sms',  -- 'sms' or 'email'
  template_name TEXT NOT NULL,  -- references the message template to use
  description TEXT,  -- human-readable: "Thank you message", "Aftercare reminder"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queued messages for specific clients
CREATE TABLE IF NOT EXISTS workflow_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  scheduled_for TIMESTAMPTZ NOT NULL,  -- when this message should be sent/surfaced
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'ready', 'sent', 'skipped'
  message_body TEXT,  -- pre-filled message with variables resolved
  description TEXT,  -- human-readable step description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tenant ON workflow_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_tenant ON workflow_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_scheduled ON workflow_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_client ON workflow_queue(client_id);

-- RLS policies
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_templates_tenant_rls" ON workflow_templates
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workflow_steps_tenant_rls" ON workflow_steps
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflow_templates WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "workflow_queue_tenant_rls" ON workflow_queue
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );
