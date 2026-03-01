-- ============================================================================
-- Migration 019: Onboarding Redesign
-- ============================================================================
-- Adds onboarding_step and onboarding_data to tenants.
-- Creates tutorial_progress table for per-page tutorial tracking.
-- ============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user ON tutorial_progress(user_id, tenant_id);

ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tutorials" ON tutorial_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own tutorials" ON tutorial_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own tutorials" ON tutorial_progress
  FOR UPDATE USING (user_id = auth.uid());
