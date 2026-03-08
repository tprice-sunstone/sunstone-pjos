-- ============================================================================
-- Migration 038: Enable RLS on tenant-scoped tables that may lack it
-- ============================================================================
-- Ensures product_types, suppliers, chain_product_prices, materials,
-- event_product_types, and platform_admins all have RLS enabled with
-- appropriate tenant-scoped policies.
-- ============================================================================

DO $$ BEGIN

  -- ── product_types ─────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_types') THEN
    ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Tenant members can manage product_types" ON product_types;
    CREATE POLICY "Tenant members can manage product_types"
      ON product_types FOR ALL
      USING (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()));
  END IF;

  -- ── suppliers ─────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Tenant members can manage suppliers" ON suppliers;
    CREATE POLICY "Tenant members can manage suppliers"
      ON suppliers FOR ALL
      USING (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()));
  END IF;

  -- ── chain_product_prices ──────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chain_product_prices') THEN
    ALTER TABLE chain_product_prices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Tenant members can manage chain_product_prices" ON chain_product_prices;
    CREATE POLICY "Tenant members can manage chain_product_prices"
      ON chain_product_prices FOR ALL
      USING (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()));
  END IF;

  -- ── materials ─────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials') THEN
    ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'tenant_id') THEN
      DROP POLICY IF EXISTS "Tenant members can manage materials" ON materials;
      CREATE POLICY "Tenant members can manage materials"
        ON materials FOR ALL
        USING (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()))
        WITH CHECK (tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()));
    END IF;
  END IF;

  -- ── event_product_types ───────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_product_types') THEN
    ALTER TABLE event_product_types ENABLE ROW LEVEL SECURITY;
    -- Join table — no tenant_id. Enabling RLS with no policies means only
    -- service role can access, which is the correct behavior.
  END IF;

  -- ── platform_admins ───────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_admins') THEN
    ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
    -- No user-facing policies — only service role should access this table.
  END IF;

END $$;
