-- 013_clients_crm_enhancements.sql
-- Add CRM fields to clients and auto-tag support to client_tags

-- Add CRM fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit_at timestamptz;

-- Add auto-tag support to client_tags
ALTER TABLE client_tags ADD COLUMN IF NOT EXISTS auto_apply boolean DEFAULT false;
ALTER TABLE client_tags ADD COLUMN IF NOT EXISTS auto_apply_rule text;
-- Rules: 'new_client', 'repeat_client', 'event:{event_id}'

-- Index for suggestion queries
CREATE INDEX IF NOT EXISTS idx_clients_last_visit ON clients (tenant_id, last_visit_at);
CREATE INDEX IF NOT EXISTS idx_clients_birthday ON clients (tenant_id, birthday);
