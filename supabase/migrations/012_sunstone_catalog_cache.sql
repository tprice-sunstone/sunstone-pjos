-- ============================================================================
-- Migration 012: Sunstone Catalog Cache (Shopify sync)
-- ============================================================================
-- Caches Shopify product catalog data locally for dashboard cards,
-- Sunny product knowledge, and admin spotlight management.
-- Single-row table using upsert pattern — only one cache row needed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sunstone_catalog_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  products JSONB NOT NULL DEFAULT '[]',
  discounts JSONB NOT NULL DEFAULT '[]',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Singleton constraint — only one row allowed
CREATE UNIQUE INDEX IF NOT EXISTS sunstone_catalog_cache_singleton
  ON sunstone_catalog_cache ((true));
