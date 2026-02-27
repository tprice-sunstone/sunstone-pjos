-- Broadcasts & Broadcast Messages

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  custom_subject TEXT,
  custom_body TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('tag', 'segment', 'all')),
  target_id UUID,
  target_name TEXT,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant ON broadcasts(tenant_id);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage broadcasts" ON broadcasts
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Broadcast Messages (per-recipient log)

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient TEXT NOT NULL,
  rendered_subject TEXT,
  rendered_body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_broadcast ON broadcast_messages(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_client ON broadcast_messages(client_id);

ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view broadcast messages" ON broadcast_messages
  FOR ALL USING (broadcast_id IN (
    SELECT id FROM broadcasts WHERE tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  ));
