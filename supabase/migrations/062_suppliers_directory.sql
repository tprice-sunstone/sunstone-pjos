-- ============================================================================
-- Migration 062: Supplier Directory — Full Contact Management
-- ============================================================================
-- Ensures suppliers table exists with complete contact fields (address,
-- social links, account number). Idempotent — safe to run on databases
-- where the table already exists from earlier direct SQL.
-- Also auto-seeds supplier records from inventory_items.supplier text values.
-- ============================================================================

-- ── Create table if it doesn't exist ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  is_sunstone BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- ── Add new contact/address/social columns ───────────────────────────────

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Unique constraint (idempotent — ignore if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_tenant_id_name_key'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_tenant_id_name_key UNIQUE (tenant_id, name);
  END IF;
END $$;

-- ── Ensure supplier_id on inventory_items ────────────────────────────────

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_items(supplier_id);

-- ── RLS (idempotent) ─────────────────────────────────────────────────────

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can manage suppliers" ON suppliers;
CREATE POLICY "Tenant members can manage suppliers"
  ON suppliers FOR ALL
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

DROP POLICY IF EXISTS "Users can view own tenant suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert own tenant suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update own tenant suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete own tenant suppliers" ON suppliers;

-- ── Auto-seed suppliers from existing inventory_items.supplier text ──────
-- For each tenant, find distinct supplier text values that don't yet have
-- a matching suppliers record, and create one. Then backfill supplier_id.

DO $$
DECLARE
  rec RECORD;
  new_supplier_id UUID;
BEGIN
  -- Create supplier records from distinct text values
  FOR rec IN
    SELECT DISTINCT i.tenant_id, i.supplier
    FROM inventory_items i
    WHERE i.supplier IS NOT NULL
      AND i.supplier != ''
      AND i.supplier_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.tenant_id = i.tenant_id
          AND lower(s.name) = lower(i.supplier)
      )
  LOOP
    INSERT INTO suppliers (tenant_id, name, is_sunstone, sort_order)
    VALUES (
      rec.tenant_id,
      rec.supplier,
      lower(rec.supplier) LIKE '%sunstone%',
      CASE WHEN lower(rec.supplier) LIKE '%sunstone%' THEN 0 ELSE 100 END
    )
    RETURNING id INTO new_supplier_id;

    -- Backfill supplier_id for all items with this supplier text
    UPDATE inventory_items
    SET supplier_id = new_supplier_id
    WHERE tenant_id = rec.tenant_id
      AND lower(supplier) = lower(rec.supplier)
      AND supplier_id IS NULL;
  END LOOP;

  -- Also backfill items where supplier text matches an existing suppliers record
  UPDATE inventory_items i
  SET supplier_id = s.id
  FROM suppliers s
  WHERE i.tenant_id = s.tenant_id
    AND lower(i.supplier) = lower(s.name)
    AND i.supplier_id IS NULL
    AND i.supplier IS NOT NULL
    AND i.supplier != '';
END $$;
