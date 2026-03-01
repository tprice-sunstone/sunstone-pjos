-- ============================================================================
-- Migration 020: Refunds, Expenses, and Payment Processor Coexistence
-- ============================================================================

-- ============================================================================
-- 1. Refund columns on sales
-- ============================================================================

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES auth.users(id);

ALTER TABLE sales
  ADD CONSTRAINT sales_refund_status_check CHECK (refund_status IN ('none', 'partial', 'full'));

-- ============================================================================
-- 2. Refunds table
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(200),
  payment_method TEXT,
  stripe_refund_id TEXT,
  square_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_refunds_sale_id ON refunds(sale_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant_created ON refunds(tenant_id, created_at DESC);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view refunds"
  ON refunds FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant members can insert refunds"
  ON refunds FOR INSERT
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

-- ============================================================================
-- 3. Expenses table
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_category ON expenses(tenant_id, category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view expenses"
  ON expenses FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant members can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant members can update expenses"
  ON expenses FOR UPDATE
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant members can delete expenses"
  ON expenses FOR DELETE
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- ============================================================================
-- 4. Default payment processor on tenants
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS default_payment_processor TEXT;

-- Backfill: set 'stripe' where stripe_account_id exists
UPDATE tenants
  SET default_payment_processor = 'stripe'
  WHERE stripe_account_id IS NOT NULL
    AND default_payment_processor IS NULL;

-- Backfill: set 'square' for remaining Square-only tenants
UPDATE tenants
  SET default_payment_processor = 'square'
  WHERE square_merchant_id IS NOT NULL
    AND default_payment_processor IS NULL;
