-- ============================================================================
-- Migration 009: Dashboard Card Cache
-- ============================================================================
-- Stores pre-computed dashboard cards per tenant with a 24-hour expiry.
-- Cards are generated from real data queries, not AI — this is a performance cache.

CREATE TABLE IF NOT EXISTS dashboard_card_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cards       JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT uq_dashboard_card_cache_tenant UNIQUE (tenant_id)
);

-- Index for fast lookup by tenant
CREATE INDEX IF NOT EXISTS idx_dashboard_card_cache_tenant
  ON dashboard_card_cache(tenant_id);

-- Index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_dashboard_card_cache_expires
  ON dashboard_card_cache(expires_at);

-- RLS
ALTER TABLE dashboard_card_cache ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own cache
CREATE POLICY "Tenant members can read own card cache"
  ON dashboard_card_cache FOR SELECT
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.accepted_at IS NOT NULL
    )
  );

-- Service role handles insert/update/delete (via API route)
CREATE POLICY "Service role full access to card cache"
  ON dashboard_card_cache FOR ALL
  USING (true)
  WITH CHECK (true);
