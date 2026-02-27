-- Client Tags & Segments — CRM Foundation

-- Tags table
CREATE TABLE IF NOT EXISTS client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Junction table for client-tag relationships
CREATE TABLE IF NOT EXISTS client_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES client_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, tag_id)
);

-- Saved segments
CREATE TABLE IF NOT EXISTS client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_tags_tenant ON client_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_tag_assignments_client ON client_tag_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tag_assignments_tag ON client_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_client_segments_tenant ON client_segments(tenant_id);

-- RLS policies
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage tags" ON client_tags
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage tag assignments" ON client_tag_assignments
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

CREATE POLICY "Tenant members can manage segments" ON client_segments
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
