-- ============================================================================
-- Migration 044: Party Booking Sequences
-- ============================================================================
-- Adds party_scheduled_messages table for automated party message sequences,
-- updates message_templates category to include 'party', and adds tenant
-- setting for auto-reminders.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add 'party' to message_templates category CHECK constraint
-- ---------------------------------------------------------------------------

ALTER TABLE message_templates DROP CONSTRAINT IF EXISTS message_templates_category_check;
ALTER TABLE message_templates ADD CONSTRAINT message_templates_category_check
  CHECK (category IN ('general', 'aftercare', 'promotion', 'reminder', 'follow_up', 'thank_you', 'booking', 'party'));

-- ---------------------------------------------------------------------------
-- 2. Tenant setting for auto-reminders
-- ---------------------------------------------------------------------------

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS party_auto_reminders boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 3. Party scheduled messages table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS party_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_request_id uuid NOT NULL REFERENCES party_requests(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  message_body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_sched_msgs_party ON party_scheduled_messages(party_request_id);
CREATE INDEX IF NOT EXISTS idx_party_sched_msgs_pending ON party_scheduled_messages(tenant_id, status, scheduled_for)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE party_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY party_sched_msgs_tenant_select
  ON party_scheduled_messages FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY party_sched_msgs_tenant_update
  ON party_scheduled_messages FOR UPDATE
  USING (tenant_id IN (SELECT get_user_tenant_ids()));
