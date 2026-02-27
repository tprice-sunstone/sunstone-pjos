-- ============================================================================
-- Migration 011: Add cache_version to dashboard_card_cache
-- ============================================================================
-- Allows the API to bust stale cached cards when card generation logic
-- changes between deployments. Cached cards with a mismatched version
-- are treated as expired and regenerated on next load.

ALTER TABLE dashboard_card_cache
  ADD COLUMN IF NOT EXISTS cache_version INTEGER NOT NULL DEFAULT 0;
