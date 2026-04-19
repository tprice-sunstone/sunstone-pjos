-- ============================================================================
-- 072: Account Deletion — soft-delete columns for Apple Guideline 5.1.1(v)
-- ============================================================================

-- Soft-delete columns on tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Soft-delete column on tenant_members
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index for filtering out deleted tenants efficiently
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at
  ON tenants (deleted_at)
  WHERE deleted_at IS NULL;

-- Index for filtering out deleted members
CREATE INDEX IF NOT EXISTS idx_tenant_members_deleted_at
  ON tenant_members (deleted_at)
  WHERE deleted_at IS NULL;
