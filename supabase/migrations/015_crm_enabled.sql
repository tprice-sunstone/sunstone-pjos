-- ============================================================================
-- 015: Add crm_enabled flag to tenants
-- ============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS crm_enabled BOOLEAN DEFAULT false;
