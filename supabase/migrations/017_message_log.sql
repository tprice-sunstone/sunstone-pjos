-- 017_message_log.sql
-- Outbound message log for activity timeline (Prompt 4, Part 7)

CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  channel TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  template_name TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_log_tenant ON message_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_log_client ON message_log(client_id, created_at DESC);
