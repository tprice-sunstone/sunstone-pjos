-- ============================================================================
-- 026_platform_costs.sql
-- Track estimated costs for external API usage (Anthropic, Twilio, Resend)
-- ============================================================================

CREATE TABLE platform_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  service text NOT NULL,           -- 'anthropic' | 'twilio' | 'resend'
  operation text NOT NULL,         -- e.g. 'mentor_chat', 'sms_queue_notify', 'email_receipt'
  model text,                      -- 'claude-sonnet-4-20250514' etc, null for sms/email
  input_tokens integer,            -- null for sms/email
  output_tokens integer,           -- null for sms/email
  cache_read_tokens integer,       -- null for sms/email
  cache_creation_tokens integer,   -- null for sms/email
  estimated_cost numeric(10,6) NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',     -- extra context (sms segments, email recipients count, etc)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_platform_costs_created ON platform_costs(created_at DESC);
CREATE INDEX idx_platform_costs_service ON platform_costs(service, created_at DESC);
CREATE INDEX idx_platform_costs_tenant ON platform_costs(tenant_id, created_at DESC);

-- RLS: service role can do everything (cost logging uses service role client)
ALTER TABLE platform_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON platform_costs FOR ALL USING (true) WITH CHECK (true);
