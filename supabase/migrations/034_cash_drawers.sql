-- ============================================================================
-- 034: Cash Drawers
-- ============================================================================
-- Complete cash drawer tracking for POS — open/close drawers, auto-log cash
-- sales, pay in/out, over/short reconciliation.
-- ============================================================================

-- ── Cash Drawers table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_drawers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id         uuid REFERENCES events(id) ON DELETE SET NULL,
  opened_at        timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,
  opening_balance  numeric(10,2) NOT NULL DEFAULT 0,
  closing_balance  numeric(10,2),
  expected_balance numeric(10,2),
  over_short       numeric(10,2),
  notes            text,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','closed')),
  opened_by        uuid REFERENCES auth.users(id),
  closed_by        uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Cash Drawer Transactions table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_drawer_id  uuid NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  sale_id         uuid REFERENCES sales(id) ON DELETE SET NULL,
  type            text NOT NULL
                  CHECK (type IN ('sale','tip','pay_in','pay_out','adjustment')),
  amount          numeric(10,2) NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cash_drawers_tenant ON cash_drawers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawers_event ON cash_drawers(event_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawers_status ON cash_drawers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_txns_drawer ON cash_drawer_transactions(cash_drawer_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_txns_sale ON cash_drawer_transactions(sale_id);

-- ── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_transactions ENABLE ROW LEVEL SECURITY;

-- Cash drawers: tenant members can CRUD their own tenant's drawers
CREATE POLICY "tenant_cash_drawers" ON cash_drawers
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Cash drawer transactions: access via drawer's tenant membership
CREATE POLICY "tenant_cash_drawer_transactions" ON cash_drawer_transactions
  FOR ALL
  USING (
    cash_drawer_id IN (
      SELECT cd.id FROM cash_drawers cd
      JOIN tenant_members tm ON tm.tenant_id = cd.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    cash_drawer_id IN (
      SELECT cd.id FROM cash_drawers cd
      JOIN tenant_members tm ON tm.tenant_id = cd.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- ── Updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_cash_drawers_updated_at
  BEFORE UPDATE ON cash_drawers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
