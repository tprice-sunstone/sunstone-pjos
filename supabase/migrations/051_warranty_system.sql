-- ============================================================================
-- WARRANTY SYSTEM
-- ============================================================================

-- Warranty status enum
CREATE TYPE warranty_status AS ENUM ('active', 'claimed', 'expired', 'voided');
CREATE TYPE warranty_scope AS ENUM ('per_item', 'per_invoice');
CREATE TYPE warranty_claim_status AS ENUM ('submitted', 'in_progress', 'completed', 'denied');

-- Main warranties table
CREATE TABLE warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  scope warranty_scope NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  coverage_terms TEXT,
  status warranty_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_warranties_tenant ON warranties(tenant_id);
CREATE INDEX idx_warranties_sale ON warranties(sale_id);
CREATE INDEX idx_warranties_client ON warranties(client_id);
CREATE INDEX idx_warranties_status ON warranties(tenant_id, status);

ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own warranties"
  ON warranties FOR ALL
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Warranty claims table
CREATE TABLE warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  claim_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  repair_details TEXT,
  status warranty_claim_status NOT NULL DEFAULT 'submitted',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_tenant ON warranty_claims(tenant_id);

ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own warranty claims"
  ON warranty_claims FOR ALL
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Warranty settings on tenants
ALTER TABLE tenants ADD COLUMN warranty_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN warranty_per_item_default NUMERIC(10,2) DEFAULT 0;
ALTER TABLE tenants ADD COLUMN warranty_per_invoice_default NUMERIC(10,2) DEFAULT 0;
ALTER TABLE tenants ADD COLUMN warranty_taxable BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN warranty_coverage_terms TEXT DEFAULT 'This warranty covers repairs and replacements for your permanent jewelry. Contact your artist to file a claim. Coverage is subject to the terms provided at the time of purchase.';
ALTER TABLE tenants ADD COLUMN warranty_duration_days INT;

-- Add warranty tracking to sales
ALTER TABLE sales ADD COLUMN warranty_amount NUMERIC(10,2) DEFAULT 0;

-- Add warranty tracking to sale items
ALTER TABLE sale_items ADD COLUMN warranty_amount NUMERIC(10,2) DEFAULT 0;
